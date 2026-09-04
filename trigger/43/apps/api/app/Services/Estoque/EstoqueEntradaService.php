<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\NaturezaGerencial;
use App\Models\OrdemCompra;
use App\Models\OrdemCompraItem;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Compras\DfeAmarrarService;
use App\Services\Financeiro\TituloService;
use App\Services\Fiscal\NfeEntradaService;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Entrada por OC — saldo via EstoqueSaldoWriter (ADR-039-CPR-001 / BL-036).
 */
class EstoqueEntradaService
{
    public const NATUREZA_COMPRA_ESTOQUE = '5.06';

    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly TituloService $titulos,
        private readonly EstoqueSaldoWriter $saldos,
        private readonly EstoqueCongelamento $congelamento,
        private readonly NfeEntradaService $nfeEntradas,
        private readonly DfeAmarrarService $dfeAmarrar,
    ) {}

    /**
     * Recebe NF × OC × conferência → MOV + saldo + TIT.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function receber(Empresa $empresa, OrdemCompra $oc, array $data): array
    {
        if ($oc->empresa_id !== $empresa->id) {
            abort(404);
        }

        if (! in_array($oc->status, OrdemCompra::STATUSES_RECEBIVEIS, true)) {
            throw ValidationException::withMessages([
                'status' => ['Ordem de compra deve estar ABERTA ou PARCIAL para receber.'],
            ]);
        }

        $natureza = $this->resolveNatureza($data['natureza_id'] ?? null);
        $nfChave = $this->normalizeNfChave($data['nf_chave'] ?? null);
        $xmlContent = $this->normalizeXml($data['xml'] ?? null);
        $nfeSnapshot = null;
        if ($xmlContent !== null) {
            $nfeSnapshot = $this->nfeEntradas->interpretar($xmlContent);
            $chaveXml = is_string($nfeSnapshot['chave_nfe'] ?? null) ? $nfeSnapshot['chave_nfe'] : null;
            if ($chaveXml !== null && $nfChave !== null && $chaveXml !== $nfChave) {
                throw ValidationException::withMessages([
                    'nf_chave' => ['Chave informada diverge da chave do XML. Confira o documento antes de receber.'],
                ]);
            }
            if ($nfChave === null && $chaveXml !== null) {
                $nfChave = $chaveXml;
            }
        }

        if ($nfChave !== null) {
            $dup = EstoqueMovimento::query()
                ->where('empresa_id', $empresa->id)
                ->where('nf_chave', $nfChave)
                ->exists();
            if ($dup) {
                throw ValidationException::withMessages([
                    'nf_chave' => ['Chave de NF já utilizada nesta empresa.'],
                ]);
            }
        }

        $itensRaw = $data['itens'] ?? [];
        if ($itensRaw === []) {
            throw ValidationException::withMessages([
                'itens' => ['Informe ao menos um item recebido.'],
            ]);
        }

        $movimento = DB::transaction(function () use ($empresa, $oc, $data, $natureza, $nfChave, $itensRaw, $xmlContent, $nfeSnapshot) {
            $oc = OrdemCompra::query()->lockForUpdate()->findOrFail($oc->id);
            $oc->load('itens.produto');

            $produtoIds = [];
            foreach ($itensRaw as $raw) {
                $ocItem = $oc->itens->firstWhere('id', (int) ($raw['ordem_compra_item_id'] ?? 0));
                if ($ocItem) {
                    $produtoIds[] = (int) $ocItem->produto_id;
                }
            }
            $this->congelamento->assertProdutosLivres($empresa, $produtoIds, 'entrada de mercadoria');

            $ano = (int) now()->year;
            $codigoMov = $this->codigos->nextCode($empresa->id, 'MOV-'.$ano, 5);

            $movimento = EstoqueMovimento::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigoMov,
                'tipo' => EstoqueMovimento::TIPO_ENTRADA_COMPRA,
                'ordem_compra_id' => $oc->id,
                'fornecedor_id' => $oc->fornecedor_id,
                'nf_chave' => $nfChave,
                'nf_numero' => $this->nullIfEmpty($data['nf_numero'] ?? null),
                'nf_data' => $data['nf_data'] ?? null,
                'nf_valor' => $this->parseNfValor($data['nf_valor'] ?? null),
                'nf_totais' => $this->normalizeNfTotais($data['nf_totais'] ?? null),
                'conferido_em' => now(),
                'conferido_por' => Auth::id(),
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
            ]);

            $valorTitulo = '0';
            $ordemLinha = 1;

            foreach ($itensRaw as $idx => $raw) {
                $ocItem = $oc->itens->firstWhere('id', (int) $raw['ordem_compra_item_id']);
                if (! $ocItem) {
                    throw ValidationException::withMessages([
                        "itens.{$idx}.ordem_compra_item_id" => ['Item não pertence a esta OC.'],
                    ]);
                }

                $qtdeCom = PadraoDecimal::parseStrict($raw['qtde_recebida'], PadraoDecimal::SCALE_QTY);
                if ($qtdeCom === null || bccomp($qtdeCom, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                    throw ValidationException::withMessages([
                        "itens.{$idx}.qtde_recebida" => ['Quantidade recebida deve ser maior que zero.'],
                    ]);
                }

                $restante = bcsub(
                    (string) $ocItem->qtde_pedida,
                    (string) $ocItem->qtde_recebida,
                    PadraoDecimal::SCALE_QTY
                );
                if (bccomp($qtdeCom, $restante, PadraoDecimal::SCALE_QTY) > 0) {
                    throw ValidationException::withMessages([
                        "itens.{$idx}.qtde_recebida" => [
                            "Quantidade excede o saldo pendente ({$restante}).",
                        ],
                    ]);
                }

                /** @var Produto $produto */
                $produto = $ocItem->produto;
                $fator = $produto->fator_conversao !== null && $produto->fator_conversao !== ''
                    ? (string) $produto->fator_conversao
                    : '1';
                if (bccomp($fator, '0', PadraoDecimal::SCALE_FACTOR) <= 0) {
                    $fator = '1';
                }

                $qtdeInt = PadraoDecimal::roundHalfUp(
                    bcmul($qtdeCom, $fator, PadraoDecimal::SCALE_FACTOR + 4),
                    PadraoDecimal::SCALE_QTY
                );

                $valorTotalItem = PadraoDecimal::roundHalfUp(
                    bcmul($qtdeCom, (string) $ocItem->valor_unitario, PadraoDecimal::SCALE_UNIT_PRICE + 4),
                    PadraoDecimal::SCALE_MONEY
                );

                $valorUnitInt = bccomp($qtdeInt, '0', PadraoDecimal::SCALE_QTY) > 0
                    ? PadraoDecimal::roundHalfUp(
                        bcdiv($valorTotalItem, $qtdeInt, PadraoDecimal::SCALE_UNIT_PRICE + 4),
                        PadraoDecimal::SCALE_UNIT_PRICE
                    )
                    : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_UNIT_PRICE);

                $lotesLinha = $this->normalizeLotesRecebimento(
                    $produto,
                    $raw,
                    $idx,
                    $qtdeCom,
                    $qtdeInt,
                    $valorTotalItem,
                    isset($data['nf_data']) ? (string) $data['nf_data'] : now()->toDateString(),
                    $this->nullIfEmpty($data['nf_numero'] ?? null)
                );

                foreach ($lotesLinha as $loteLinha) {
                    $aplicado = $this->saldos->aplicarEntrada(
                        $empresa,
                        $produto,
                        $loteLinha['qtde_int'],
                        $loteLinha['valor_total'],
                        $loteLinha['lote_ref']
                    );

                    EstoqueMovimentoItem::query()->create([
                        'movimento_id' => $movimento->id,
                        'ordem_compra_item_id' => $ocItem->id,
                        'produto_id' => $produto->id,
                        'lote_id' => $aplicado['lote_id'],
                        'qtde' => $loteLinha['qtde_int'],
                        'unidade' => $produto->unidade_interna ?? $ocItem->unidade,
                        'valor_unitario' => $valorUnitInt,
                        'valor_total' => $loteLinha['valor_total'],
                        'custo_medio_apos' => $aplicado['custo_medio_apos'],
                        'ordem' => $ordemLinha,
                    ]);
                    $ordemLinha++;
                }

                $ocItem->qtde_recebida = PadraoDecimal::roundHalfUp(
                    bcadd((string) $ocItem->qtde_recebida, $qtdeCom, PadraoDecimal::SCALE_QTY + 2),
                    PadraoDecimal::SCALE_QTY
                );
                $ocItem->save();

                $valorTitulo = bcadd($valorTitulo, $valorTotalItem, PadraoDecimal::SCALE_MONEY);
            }

            $oc->refresh()->load('itens');
            $todosRecebidos = $oc->itens->every(function (OrdemCompraItem $item) {
                return bccomp((string) $item->qtde_recebida, (string) $item->qtde_pedida, PadraoDecimal::SCALE_QTY) >= 0;
            });
            $algumRecebido = $oc->itens->contains(function (OrdemCompraItem $item) {
                return bccomp((string) $item->qtde_recebida, '0', PadraoDecimal::SCALE_QTY) > 0;
            });

            $oc->status = $todosRecebidos
                ? OrdemCompra::STATUS_RECEBIDA
                : ($algumRecebido ? OrdemCompra::STATUS_PARCIAL : $oc->status);
            $oc->save();

            $valorTitulo = PadraoDecimal::roundHalfUp($valorTitulo, PadraoDecimal::SCALE_MONEY);
            $emissao = isset($data['nf_data']) && $data['nf_data']
                ? $data['nf_data']
                : now()->toDateString();

            $parcelas = $this->normalizeParcelas($data['parcelas'] ?? null);
            $this->titulos->criarPagarDeEntrada(
                $empresa,
                $oc,
                $movimento,
                $natureza,
                $valorTitulo,
                isset($data['vencimento']) ? (string) $data['vencimento'] : null,
                $emissao,
                $this->nullIfEmpty($data['nf_numero'] ?? null),
                $parcelas
            );

            if ($xmlContent !== null && $nfeSnapshot !== null) {
                $this->nfeEntradas->gravar(
                    $empresa,
                    $movimento,
                    $oc,
                    $xmlContent,
                    $nfeSnapshot,
                    is_array($data['cprod_maps'] ?? null) ? $data['cprod_maps'] : [],
                );
                $chaveEspelho = preg_replace('/\D/', '', (string) ($nfeSnapshot['chave_nfe'] ?? $nfChave ?? '')) ?? '';
                if (strlen($chaveEspelho) === 44) {
                    $this->dfeAmarrar->marcarRecebidaPorChave($empresa, $chaveEspelho, (int) $oc->id);
                }
            }

            return $movimento;
        });

        return $this->toOut($movimento->fresh(), true);
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(EstoqueMovimento $mov, bool $nfeDetalhe = false): array
    {
        $mov->load([
            'itens.produto:id,codigo,descricao_fiscal,familia,unidade_interna',
            'itens.lote:id,codigo,data_entrada,data_validade,data_fabricacao,qtde',
            'fornecedor:id,codigo,razao_social,nome_fantasia',
            'titulos.natureza:id,codigo,codigo_exibicao,nome',
            'titulos.parceiro:id,codigo,razao_social',
            'ordemCompra:id,codigo,status',
            'nfeEntrada',
            ...EstoqueMovimento::userStampWith(),
        ]);
        if ($nfeDetalhe) {
            $mov->load('nfeEntrada.itens');
        }

        $titulosOut = $mov->titulos->map(fn ($t) => $this->titulos->toOut($t))->values()->all();

        return [
            'id' => $mov->id,
            'empresa_id' => $mov->empresa_id,
            'codigo' => $mov->codigo,
            'tipo' => $mov->tipo,
            'ordem_compra_id' => $mov->ordem_compra_id,
            'ordem_compra' => $mov->ordemCompra ? [
                'id' => $mov->ordemCompra->id,
                'codigo' => $mov->ordemCompra->codigo,
                'status' => $mov->ordemCompra->status,
            ] : null,
            'fornecedor_id' => $mov->fornecedor_id,
            'fornecedor' => $mov->fornecedor ? [
                'id' => $mov->fornecedor->id,
                'codigo' => $mov->fornecedor->codigo,
                'razao_social' => $mov->fornecedor->razao_social,
                'nome_fantasia' => $mov->fornecedor->nome_fantasia,
            ] : null,
            'nf_chave' => $mov->nf_chave,
            'nf_numero' => $mov->nf_numero,
            'nf_data' => optional($mov->nf_data)?->format('Y-m-d'),
            'nf_valor' => $mov->nf_valor !== null ? (string) $mov->nf_valor : null,
            'nf_totais' => $mov->nf_totais,
            'conferido_em' => optional($mov->conferido_em)?->toIso8601String(),
            'conferido_por' => $mov->conferido_por,
            'observacao' => $mov->observacao,
            'motivo_codigo' => $mov->motivo_codigo,
            'ajuste_id' => $mov->ajuste_id,
            'itens' => $mov->itens->map(fn (EstoqueMovimentoItem $item) => [
                'id' => $item->id,
                'ordem_compra_item_id' => $item->ordem_compra_item_id,
                'produto_id' => $item->produto_id,
                'produto' => $item->produto ? [
                    'id' => $item->produto->id,
                    'codigo' => $item->produto->codigo,
                    'descricao_fiscal' => $item->produto->descricao_fiscal,
                    'familia' => $item->produto->familia,
                    'unidade_interna' => $item->produto->unidade_interna,
                ] : null,
                'qtde' => (string) $item->qtde,
                'unidade' => $item->unidade,
                'valor_unitario' => (string) $item->valor_unitario,
                'valor_total' => (string) $item->valor_total,
                'custo_medio_apos' => (string) $item->custo_medio_apos,
                'lote_id' => $item->lote_id,
                'lote' => $item->lote ? [
                    'id' => $item->lote->id,
                    'codigo' => $item->lote->codigo,
                    'data_entrada' => optional($item->lote->data_entrada)?->format('Y-m-d'),
                    'data_validade' => optional($item->lote->data_validade)?->format('Y-m-d'),
                    'data_fabricacao' => optional($item->lote->data_fabricacao)?->format('Y-m-d'),
                ] : null,
                'ordem' => (int) $item->ordem,
            ])->values()->all(),
            'titulo' => $titulosOut[0] ?? null,
            'titulos' => $titulosOut,
            'nfe_entrada' => NfeEntradaService::toOut($mov->nfeEntrada, $nfeDetalhe),
            'created_at' => optional($mov->created_at)?->toIso8601String(),
            'updated_at' => optional($mov->updated_at)?->toIso8601String(),
            'criado_por' => EstoqueMovimento::userStampFrom($mov->criador),
            'atualizado_por' => EstoqueMovimento::userStampFrom($mov->atualizador),
        ];
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return list<array{qtde_int: string, valor_total: string, lote_ref: ?array<string, mixed>}>
     */
    private function normalizeLotesRecebimento(
        Produto $produto,
        array $raw,
        int $idx,
        string $qtdeCom,
        string $qtdeInt,
        string $valorTotalItem,
        string $dataEntradaDefault,
        ?string $nfNumero
    ): array {
        if (! $produto->controla_lote) {
            return [[
                'qtde_int' => $qtdeInt,
                'valor_total' => $valorTotalItem,
                'lote_ref' => null,
            ]];
        }

        $linhas = [];
        if (isset($raw['lotes']) && is_array($raw['lotes']) && $raw['lotes'] !== []) {
            $somaCom = '0';
            foreach ($raw['lotes'] as $loteRaw) {
                $qCom = PadraoDecimal::parseStrict((string) ($loteRaw['qtde'] ?? '0'), PadraoDecimal::SCALE_QTY);
                if ($qCom === null || bccomp($qCom, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                    throw ValidationException::withMessages([
                        "itens.{$idx}.lotes" => ['Cada lote precisa de quantidade maior que zero.'],
                    ]);
                }
                $somaCom = bcadd($somaCom, $qCom, PadraoDecimal::SCALE_QTY);
                $linhas[] = [
                    'qtde_com' => $qCom,
                    'codigo' => trim((string) ($loteRaw['codigo'] ?? '')),
                    'data_entrada' => $loteRaw['data_entrada'] ?? $dataEntradaDefault,
                    'data_validade' => $loteRaw['data_validade'] ?? null,
                    'data_fabricacao' => $loteRaw['data_fabricacao'] ?? null,
                ];
            }
            if (bccomp($somaCom, $qtdeCom, PadraoDecimal::SCALE_QTY) !== 0) {
                throw ValidationException::withMessages([
                    "itens.{$idx}.lotes" => ["Soma das qtdes dos lotes ({$somaCom}) deve igualar a quantidade recebida ({$qtdeCom})."],
                ]);
            }
        } else {
            $codigo = trim((string) ($raw['lote_codigo'] ?? ''));
            if ($codigo === '') {
                throw ValidationException::withMessages([
                    "itens.{$idx}.lote_codigo" => ['Informe o lote do fornecedor (este produto controla lote).'],
                ]);
            }
            $linhas[] = [
                'qtde_com' => $qtdeCom,
                'codigo' => $codigo,
                'data_entrada' => $raw['lote_data_entrada'] ?? $dataEntradaDefault,
                'data_validade' => $raw['lote_data_validade'] ?? null,
                'data_fabricacao' => $raw['lote_data_fabricacao'] ?? null,
            ];
        }

        $out = [];
        $restanteValor = $valorTotalItem;
        $restanteInt = $qtdeInt;
        $last = count($linhas) - 1;
        foreach ($linhas as $i => $linha) {
            if ($i === $last) {
                $qInt = $restanteInt;
                $valor = $restanteValor;
            } else {
                $qInt = PadraoDecimal::roundHalfUp(
                    bcmul($qtdeInt, bcdiv($linha['qtde_com'], $qtdeCom, PadraoDecimal::SCALE_QTY + 6), PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
                $valor = PadraoDecimal::roundHalfUp(
                    bcmul($valorTotalItem, bcdiv($linha['qtde_com'], $qtdeCom, PadraoDecimal::SCALE_MONEY + 6), PadraoDecimal::SCALE_MONEY + 4),
                    PadraoDecimal::SCALE_MONEY
                );
                $restanteInt = PadraoDecimal::roundHalfUp(
                    bcsub($restanteInt, $qInt, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
                $restanteValor = PadraoDecimal::roundHalfUp(
                    bcsub($restanteValor, $valor, PadraoDecimal::SCALE_MONEY + 2),
                    PadraoDecimal::SCALE_MONEY
                );
            }

            $out[] = [
                'qtde_int' => $qInt,
                'valor_total' => $valor,
                'lote_ref' => [
                    'codigo' => $linha['codigo'],
                    'data_entrada' => (string) $linha['data_entrada'],
                    'data_validade' => $linha['data_validade'] !== null && $linha['data_validade'] !== ''
                        ? (string) $linha['data_validade']
                        : null,
                    'data_fabricacao' => $linha['data_fabricacao'] !== null && $linha['data_fabricacao'] !== ''
                        ? (string) $linha['data_fabricacao']
                        : null,
                    'nf_numero' => $nfNumero,
                    'origem_tipo' => \App\Models\EstoqueLote::ORIGEM_ENTRADA_COMPRA,
                ],
            ];
        }

        return $out;
    }

    /**
     * @param  mixed  $raw
     * @return list<array{vencimento: string, valor: string, n_dup: ?string, parcela: int}>|null
     */
    private function normalizeParcelas(mixed $raw): ?array
    {
        if (! is_array($raw) || $raw === []) {
            return null;
        }

        $out = [];
        $i = 1;
        foreach ($raw as $row) {
            if (! is_array($row)) {
                continue;
            }
            $valor = PadraoDecimal::parseStrict((string) ($row['valor'] ?? ''), PadraoDecimal::SCALE_MONEY);
            if ($valor === null || bccomp($valor, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
                throw ValidationException::withMessages([
                    'parcelas' => ['Cada parcela deve ter valor maior que zero.'],
                ]);
            }
            $venc = (string) ($row['vencimento'] ?? '');
            if ($venc === '') {
                throw ValidationException::withMessages([
                    'parcelas' => ['Cada parcela deve ter vencimento.'],
                ]);
            }
            $out[] = [
                'vencimento' => $venc,
                'valor' => $valor,
                'n_dup' => isset($row['n_dup']) ? ($this->nullIfEmpty($row['n_dup']) ? (string) $row['n_dup'] : null) : null,
                'parcela' => isset($row['parcela']) ? (int) $row['parcela'] : $i,
            ];
            $i++;
        }

        return $out === [] ? null : $out;
    }

    private function parseNfValor(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $parsed = PadraoDecimal::parseStrict((string) $value, PadraoDecimal::SCALE_MONEY);

        return $parsed;
    }

    /**
     * @return array<string, string|null>|null
     */
    private function normalizeNfTotais(mixed $raw): ?array
    {
        if (! is_array($raw) || $raw === []) {
            return null;
        }

        $keys = ['v_nf', 'v_prod', 'v_ipi', 'v_icms', 'v_frete', 'v_desc', 'v_outro', 'v_st'];
        $out = [];
        foreach ($keys as $key) {
            if (! array_key_exists($key, $raw)) {
                continue;
            }
            $v = $raw[$key];
            $out[$key] = $v === null || $v === '' ? null : (string) $v;
        }

        return $out === [] ? null : $out;
    }

    private function resolveNatureza(mixed $naturezaId): NaturezaGerencial
    {
        if ($naturezaId !== null && $naturezaId !== '') {
            $natureza = NaturezaGerencial::query()->find((int) $naturezaId);
            if (! $natureza) {
                throw ValidationException::withMessages([
                    'natureza_id' => ['Natureza gerencial inválida.'],
                ]);
            }
        } else {
            $natureza = NaturezaGerencial::query()
                ->where('codigo', self::NATUREZA_COMPRA_ESTOQUE)
                ->where('aceita_lancamento', true)
                ->where('ativo', true)
                ->first();

            if (! $natureza) {
                throw ValidationException::withMessages([
                    'natureza_id' => ['Natureza padrão 5.06 não encontrada ou inativa.'],
                ]);
            }
        }

        if (! $natureza->aceita_lancamento) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Natureza deve aceitar lançamento (folha).'],
            ]);
        }

        if (! $natureza->ativo) {
            throw ValidationException::withMessages([
                'natureza_id' => ['Natureza gerencial inativa.'],
            ]);
        }

        // Compra que entra estoque não usa 2.01 (custo de material consumido).
        if ($natureza->codigo === '2.01') {
            throw ValidationException::withMessages([
                'natureza_id' => ['Use 5.06 para compra de estoque; 2.01 é custo de consumo (OP).'],
            ]);
        }

        return $natureza;
    }

    private function normalizeXml(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $xml = trim($value);
        if ($xml === '') {
            return null;
        }
        if (strlen($xml) > 5_242_880) {
            throw ValidationException::withMessages([
                'xml' => ['XML excede o tamanho máximo (5 MB).'],
            ]);
        }

        return $xml;
    }

    private function normalizeNfChave(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }

        if (strlen($s) !== 44) {
            throw ValidationException::withMessages([
                'nf_chave' => ['Chave de acesso da NF deve ter 44 dígitos.'],
            ]);
        }

        return $s;
    }

    private function nullIfEmpty(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value) && trim($value) === '') {
            return null;
        }

        return $value;
    }
}
