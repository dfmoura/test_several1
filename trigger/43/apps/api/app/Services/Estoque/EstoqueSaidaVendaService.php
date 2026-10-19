<?php

namespace App\Services\Estoque;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\EstoqueSaldo;
use App\Models\Faturamento;
use App\Models\FaturamentoItem;
use App\Models\OrdemProducao;
use App\Models\OrdemProducaoMaterial;
use App\Models\PaEmbalagem;
use App\Models\Pedido;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Baixa PA/REV na NF-e oficial autorizada (estudo 32 SAIDA_VENDA / BL-066).
 * No mesmo movimento, baixa a caixa EMB-CX escolhida na embalagem, pelo custo médio.
 * A quantidade que a OP já baixou como componente CAIXA não sai de novo. Stub, prévia e NFS-e não tocam saldo.
 * Não desfaz a nota se a baixa falhar depois. O estorno da nota devolve todas as linhas do movimento.
 */
class EstoqueSaidaVendaService
{
    public function __construct(
        private readonly EstoqueSaldoWriter $saldos,
        private readonly EstoqueCongelamento $congelamento,
        private readonly CodigoGenerator $codigos,
        private readonly CaixaExpedicao $caixas,
    ) {}

    /**
     * Pendências que bloqueiam o POST Focus (não o FAT).
     *
     * @param  list<array<string, mixed>>  $itensFat
     * @return list<string>
     */
    public function pendenciasEmissao(Empresa $empresa, Pedido $pedido, array $itensFat): array
    {
        return array_values(array_unique(array_merge(
            $this->pendenciasSaldo($empresa, $this->linhasEstoque($empresa, $pedido, $itensFat), 'faturável'),
            $this->pendenciasSaldo($empresa, $this->linhasCaixa($empresa, $pedido), 'caixas'),
        )));
    }

    /**
     * Avisos (não bloqueiam): PA/REV sem SKU — a nota não baixará saldo.
     *
     * @param  list<array<string, mixed>>  $itensFat
     * @return list<string>
     */
    public function avisosEmissao(Empresa $empresa, Pedido $pedido, array $itensFat): array
    {
        $avisos = [];
        foreach ($this->linhasEstoque($empresa, $pedido, $itensFat) as $linha) {
            if ($linha['produto'] === null) {
                $avisos[] = 'Produto acabado/revenda sem SKU no pedido — a NF-e não baixará estoque.';
            }
        }
        if ($this->embalagemSemCaixaDeEstoque($empresa, $pedido)) {
            $avisos[] = 'Embalagem confirmada sem caixa de estoque — a NF-e não baixará as caixas.';
        }

        return array_values(array_unique($avisos));
    }

    public function baixarSeOficial(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc): void
    {
        if (! $doc->eOficial() || $doc->tipo !== DocumentoFiscalSaida::TIPO_NFE) {
            return;
        }

        try {
            $this->baixar($empresa, $fat, $doc);
        } catch (Throwable $e) {
            Log::warning('SAIDA_VENDA falhou após NF autorizada', [
                'empresa_id' => $empresa->id,
                'faturamento_id' => $fat->id,
                'documento_fiscal_saida_id' => $doc->id,
                'erro' => $e->getMessage(),
            ]);
            $extra = $e instanceof ValidationException
                ? implode(' ', $this->mensagensValidacao($e))
                : $e->getMessage();
            $msg = trim((string) $doc->mensagem);
            $suffix = 'Estoque não baixado: '.$extra;
            $doc->mensagem = mb_substr($msg === '' ? $suffix : $msg.' '.$suffix, 0, 500);
            $doc->save();
        }
    }

    /**
     * Estorna SAIDA_VENDA após cancelamento SEFAZ da NF-e (idempotente).
     */
    public function estornaSeHouver(Empresa $empresa, DocumentoFiscalSaida $doc): void
    {
        try {
            DB::transaction(function () use ($empresa, $doc) {
                $origem = EstoqueMovimento::query()
                    ->where('empresa_id', $empresa->id)
                    ->where('documento_fiscal_saida_id', $doc->id)
                    ->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)
                    ->lockForUpdate()
                    ->first();
                if ($origem === null) {
                    return;
                }
                $ja = EstoqueMovimento::query()
                    ->where('empresa_id', $empresa->id)
                    ->where('documento_fiscal_saida_id', $doc->id)
                    ->where('tipo', EstoqueMovimento::TIPO_ESTORNO_SAIDA_VENDA)
                    ->exists();
                if ($ja) {
                    return;
                }

                $origem->loadMissing('itens.produto');
                $ano = (int) now()->year;
                $mov = EstoqueMovimento::query()->create([
                    'empresa_id' => $empresa->id,
                    'codigo' => $this->codigos->nextCode($empresa->id, 'MOV-'.$ano, 5),
                    'tipo' => EstoqueMovimento::TIPO_ESTORNO_SAIDA_VENDA,
                    'pedido_id' => $origem->pedido_id,
                    'faturamento_id' => $origem->faturamento_id,
                    'documento_fiscal_saida_id' => $doc->id,
                    'nf_chave' => $origem->nf_chave,
                    'nf_numero' => $origem->nf_numero,
                    'nf_data' => now()->toDateString(),
                    'nf_valor' => $origem->nf_valor,
                    'conferido_em' => now(),
                    'conferido_por' => Auth::id(),
                    'observacao' => 'Estorno SAIDA_VENDA — NF-e cancelada '.$doc->codigo,
                ]);

                $ordem = 1;
                foreach ($origem->itens as $item) {
                    $produto = $item->produto;
                    if (! $produto instanceof Produto) {
                        continue;
                    }
                    $qtde = (string) $item->qtde;
                    $valor = (string) $item->valor_total;
                    $loteRef = $item->lote_id ? ['lote_id' => (int) $item->lote_id] : null;
                    $aplicado = $this->saldos->aplicarEntrada($empresa, $produto, $qtde, $valor, $loteRef);
                    EstoqueMovimentoItem::query()->create([
                        'movimento_id' => $mov->id,
                        'produto_id' => $produto->id,
                        'lote_id' => $aplicado['lote_id'] ?? $item->lote_id,
                        'qtde' => $qtde,
                        'unidade' => $item->unidade,
                        'valor_unitario' => $item->valor_unitario,
                        'valor_total' => $valor,
                        'custo_medio_apos' => $aplicado['custo_medio_apos'],
                        'ordem' => $ordem++,
                    ]);
                }
            });
        } catch (Throwable $e) {
            Log::warning('Estorno SAIDA_VENDA falhou após cancel NF', [
                'empresa_id' => $empresa->id,
                'documento_fiscal_saida_id' => $doc->id,
                'erro' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public function movimentoOut(DocumentoFiscalSaida $doc): ?array
    {
        $mov = $doc->saidaEstoque()
            ->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)
            ->first()
            ?? $doc->saidaEstoque;
        if ($mov === null) {
            return null;
        }
        $mov->loadMissing('itens.produto');

        return [
            'id' => $mov->id,
            'codigo' => $mov->codigo,
            'tipo' => $mov->tipo,
            'nf_chave' => $mov->nf_chave,
            'itens' => $mov->itens->map(fn (EstoqueMovimentoItem $i) => [
                'produto_id' => $i->produto_id,
                'produto_codigo' => $i->produto?->codigo,
                'qtde' => (string) $i->qtde,
                'unidade' => $i->unidade,
            ])->all(),
        ];
    }

    private function baixar(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc): void
    {
        $fat->loadMissing(['itens.pedidoItem.produtoPa', 'pedido.itens.produtoPa']);
        $pedido = $fat->pedido;
        if ($pedido === null) {
            return;
        }

        $itensFat = [];
        foreach ($fat->itens as $i) {
            $itensFat[] = [
                'descricao' => $i->descricao,
                'familia_fiscal' => $i->familia_fiscal ?: $i->pedidoItem?->familia_fiscal,
                'qtde' => (string) $i->qtde,
                'pedido_item_id' => $i->pedido_item_id,
            ];
        }

        $linhas = array_values(array_filter(
            array_merge(
                $this->linhasEstoque($empresa, $pedido, $itensFat),
                $this->linhasCaixa($empresa, $pedido),
            ),
            fn (array $l) => $l['produto'] instanceof Produto
        ));
        if ($linhas === []) {
            return;
        }

        DB::transaction(function () use ($empresa, $fat, $doc, $linhas) {
            $existe = EstoqueMovimento::query()
                ->where('documento_fiscal_saida_id', $doc->id)
                ->where('tipo', EstoqueMovimento::TIPO_SAIDA_VENDA)
                ->lockForUpdate()
                ->first();
            if ($existe) {
                return;
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'MOV-'.$ano, 5);
            $chave = preg_replace('/\D/', '', (string) $doc->chave) ?: '';
            $chave44 = strlen($chave) === 44 ? $chave : null;

            $mov = EstoqueMovimento::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'tipo' => EstoqueMovimento::TIPO_SAIDA_VENDA,
                'pedido_id' => $fat->pedido_id,
                'faturamento_id' => $fat->id,
                'documento_fiscal_saida_id' => $doc->id,
                'nf_chave' => $chave44,
                'nf_numero' => $doc->numero !== null ? (string) $doc->numero : null,
                'nf_data' => optional($doc->autorizado_em)->toDateString() ?? now()->toDateString(),
                'nf_valor' => $doc->valor,
                'conferido_em' => now(),
                'conferido_por' => Auth::id(),
                'observacao' => 'NF-e '.$fat->codigo.($doc->numero ? ' nº '.$doc->numero : ''),
            ]);

            $ordem = 1;
            foreach ($linhas as $linha) {
                /** @var Produto $produto */
                $produto = $linha['produto'];
                $this->congelamento->assertProdutoLivre(
                    $empresa,
                    (int) $produto->id,
                    'baixa de estoque na nota fiscal'
                );
                $aplicado = $this->saldos->aplicarSaida($empresa, $produto, $linha['qtde']);
                foreach ($aplicado['alocacoes'] as $aloc) {
                    $qtdeLinha = (string) $aloc['qtde'];
                    $valorLinha = PadraoDecimal::roundHalfUp(
                        bcmul($qtdeLinha, $aplicado['valor_unitario'], PadraoDecimal::SCALE_UNIT_PRICE + 4),
                        PadraoDecimal::SCALE_MONEY
                    );
                    EstoqueMovimentoItem::query()->create([
                        'movimento_id' => $mov->id,
                        'produto_id' => $produto->id,
                        'lote_id' => $aloc['lote_id'] ?? null,
                        'qtde' => $qtdeLinha,
                        'unidade' => $produto->unidade_interna ?? 'UN',
                        'valor_unitario' => $aplicado['valor_unitario'],
                        'valor_total' => $valorLinha,
                        'custo_medio_apos' => $aplicado['custo_medio_apos'],
                        'ordem' => $ordem,
                    ]);
                    $ordem++;
                }
            }
        });
    }

    /**
     * @param  list<array{produto: ?Produto, qtde: string, pedido_item_id: ?int}>  $linhas
     * @return list<string>
     */
    private function pendenciasSaldo(Empresa $empresa, array $linhas, string $rotulo): array
    {
        $pendencias = [];
        foreach ($linhas as $linha) {
            if ($linha['produto'] === null) {
                continue;
            }
            try {
                $this->congelamento->assertProdutoLivre(
                    $empresa,
                    (int) $linha['produto']->id,
                    'baixa de estoque na nota fiscal'
                );
            } catch (ValidationException $e) {
                $pendencias = array_merge($pendencias, $this->mensagensValidacao($e));

                continue;
            }
            $saldo = $this->saldoQtde($empresa, $linha['produto']);
            if (bccomp($saldo, $linha['qtde'], PadraoDecimal::SCALE_QTY) < 0) {
                $pendencias[] = 'Estoque insuficiente de '.$linha['produto']->codigo
                    .' para a NF-e (disponível '.$saldo.', '.$rotulo.' '.$linha['qtde'].').';
            }
        }

        return $pendencias;
    }

    /**
     * Caixas EMB-CX da embalagem da etiqueta e da separação da revenda.
     * A quantidade já saída na OP (componente CAIXA, líquida de retorno) não entra de novo.
     * O valor da linha nasce no writer, pelo custo médio vigente.
     *
     * @return list<array{produto: Produto, qtde: string, pedido_item_id: ?int}>
     */
    private function linhasCaixa(Empresa $empresa, Pedido $pedido): array
    {
        $embalagens = PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->whereNotNull('caixa_produto_id')
            ->where('qtde_caixas', '>', 0)
            ->orderBy('id')
            ->get(['id', 'ordem_producao_id', 'pedido_item_id', 'caixa_produto_id', 'qtde_caixas']);

        $revenda = $this->caixas->linhas($empresa, $pedido);
        if ($embalagens->isEmpty() && $revenda === []) {
            return [];
        }

        $jaPorOp = $this->caixasJaBaixadasNaProducao($empresa, $pedido);
        /** @var array<int, array{qtde: string, pedido_item_id: ?int}> $acc */
        $acc = [];
        foreach ($embalagens as $emb) {
            $qtde = PadraoDecimal::roundHalfUp((string) $emb->qtde_caixas, PadraoDecimal::SCALE_QTY);
            $opId = (int) $emb->ordem_producao_id;
            $ja = $jaPorOp[$opId] ?? '0.0000';
            $abate = bccomp($ja, $qtde, PadraoDecimal::SCALE_QTY) >= 0 ? $qtde : $ja;
            $jaPorOp[$opId] = PadraoDecimal::roundHalfUp(
                bcsub($ja, $abate, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );
            $resta = PadraoDecimal::roundHalfUp(
                bcsub($qtde, $abate, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );
            if (bccomp($resta, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }
            $pid = (int) $emb->caixa_produto_id;
            if (! isset($acc[$pid])) {
                $acc[$pid] = [
                    'qtde' => $resta,
                    'pedido_item_id' => $emb->pedido_item_id ? (int) $emb->pedido_item_id : null,
                ];
            } else {
                $acc[$pid]['qtde'] = PadraoDecimal::roundHalfUp(
                    bcadd($acc[$pid]['qtde'], $resta, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
            }
        }

        foreach ($revenda as $linha) {
            $pid = (int) $linha['produto_id'];
            $qtde = PadraoDecimal::roundHalfUp((string) $linha['qtde'], PadraoDecimal::SCALE_QTY);
            if (! isset($acc[$pid])) {
                $acc[$pid] = [
                    'qtde' => $qtde,
                    'pedido_item_id' => (int) $linha['pedido_item_id'],
                ];
            } else {
                $acc[$pid]['qtde'] = PadraoDecimal::roundHalfUp(
                    bcadd($acc[$pid]['qtde'], $qtde, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
            }
        }

        if ($acc === []) {
            return [];
        }

        $produtos = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('id', array_keys($acc))
            ->get()
            ->keyBy('id');

        $linhas = [];
        foreach ($acc as $pid => $row) {
            $produto = $produtos->get($pid);
            if (! $produto instanceof Produto) {
                continue;
            }
            $linhas[] = [
                'produto' => $produto,
                'qtde' => $row['qtde'],
                'pedido_item_id' => $row['pedido_item_id'],
            ];
        }

        return $linhas;
    }

    /**
     * Unidades de caixa já saídas na produção deste pedido, por OP.
     *
     * @return array<int, string>
     */
    private function caixasJaBaixadasNaProducao(Empresa $empresa, Pedido $pedido): array
    {
        $opIds = OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->pluck('id');
        if ($opIds->isEmpty()) {
            return [];
        }

        $mats = OrdemProducaoMaterial::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('ordem_producao_id', $opIds)
            ->where('componente', 'CAIXA')
            ->whereNotNull('saida_movimento_id')
            ->get(['ordem_producao_id', 'qtde_requisitada', 'qtde_retorno']);

        $porOp = [];
        foreach ($mats as $mat) {
            $liq = bcsub((string) $mat->qtde_requisitada, (string) $mat->qtde_retorno, PadraoDecimal::SCALE_QTY + 4);
            if (bccomp($liq, '0', PadraoDecimal::SCALE_QTY) < 0) {
                $liq = '0';
            }
            $liq = PadraoDecimal::roundHalfUp($liq, PadraoDecimal::SCALE_QTY);
            $opId = (int) $mat->ordem_producao_id;
            $porOp[$opId] = isset($porOp[$opId])
                ? PadraoDecimal::roundHalfUp(
                    bcadd($porOp[$opId], $liq, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                )
                : $liq;
        }

        return $porOp;
    }

    private function embalagemSemCaixaDeEstoque(Empresa $empresa, Pedido $pedido): bool
    {
        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->whereNull('caixa_produto_id')
            ->where('qtde_caixas', '>', 0)
            ->exists();
    }

    /**
     * @param  list<array<string, mixed>>  $itensFat
     * @return list<array{produto: ?Produto, qtde: string, pedido_item_id: ?int}>
     */
    private function linhasEstoque(Empresa $empresa, Pedido $pedido, array $itensFat): array
    {
        $pedido->loadMissing(['itens.produtoPa']);
        $porItem = $pedido->itens->keyBy('id');
        $acc = [];

        foreach ($itensFat as $linha) {
            $desc = (string) ($linha['descricao'] ?? '');
            $fam = (string) ($linha['familia_fiscal'] ?? '');
            if (! FaturamentoItem::eLinhaDeEstoque($desc, $fam)) {
                continue;
            }
            $pedidoItemId = isset($linha['pedido_item_id']) ? (int) $linha['pedido_item_id'] : 0;
            $item = $pedidoItemId > 0 ? $porItem->get($pedidoItemId) : null;
            $produto = $item?->produtoPa;
            if ($produto && (int) $produto->empresa_id !== (int) $empresa->id) {
                $produto = null;
            }
            $qtde = PadraoDecimal::roundHalfUp((string) ($linha['qtde'] ?? '0'), PadraoDecimal::SCALE_QTY);
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }
            $key = $produto ? 'p'.$produto->id : 's'.$pedidoItemId;
            if (! isset($acc[$key])) {
                $acc[$key] = [
                    'produto' => $produto,
                    'qtde' => $qtde,
                    'pedido_item_id' => $pedidoItemId > 0 ? $pedidoItemId : null,
                ];
            } else {
                $acc[$key]['qtde'] = PadraoDecimal::roundHalfUp(
                    bcadd($acc[$key]['qtde'], $qtde, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
            }
        }

        return array_values($acc);
    }

    private function saldoQtde(Empresa $empresa, Produto $produto): string
    {
        $qtde = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->value('qtde');

        return PadraoDecimal::roundHalfUp((string) ($qtde ?? '0'), PadraoDecimal::SCALE_QTY);
    }

    /**
     * @return list<string>
     */
    private function mensagensValidacao(ValidationException $e): array
    {
        $out = [];
        foreach ($e->errors() as $msgs) {
            foreach ($msgs as $m) {
                $out[] = (string) $m;
            }
        }

        return $out;
    }
}
