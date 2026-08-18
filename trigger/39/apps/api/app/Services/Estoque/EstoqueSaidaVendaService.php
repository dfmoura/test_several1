<?php

namespace App\Services\Estoque;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\EstoqueSaldo;
use App\Models\Faturamento;
use App\Models\FaturamentoItem;
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
 * Baixa PA/REV na NF-e Focus autorizada (estudo 32 SAIDA_VENDA / BL-066).
 * Stub, prévia e NFS-e não tocam saldo. Não desfaz a nota se a baixa falhar depois.
 */
class EstoqueSaidaVendaService
{
    public function __construct(
        private readonly EstoqueSaldoWriter $saldos,
        private readonly EstoqueCongelamento $congelamento,
        private readonly CodigoGenerator $codigos,
    ) {}

    /**
     * Pendências que bloqueiam o POST Focus (não o FAT).
     *
     * @param  list<array<string, mixed>>  $itensFat
     * @return list<string>
     */
    public function pendenciasEmissao(Empresa $empresa, Pedido $pedido, array $itensFat): array
    {
        $pendencias = [];
        foreach ($this->linhasEstoque($empresa, $pedido, $itensFat) as $linha) {
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
                    .' para a NF-e (disponível '.$saldo.', faturável '.$linha['qtde'].').';
            }
        }

        return array_values(array_unique($pendencias));
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
     * @return array<string, mixed>|null
     */
    public function movimentoOut(DocumentoFiscalSaida $doc): ?array
    {
        $mov = $doc->saidaEstoque;
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
            $this->linhasEstoque($empresa, $pedido, $itensFat),
            fn (array $l) => $l['produto'] instanceof Produto
        ));
        if ($linhas === []) {
            return;
        }

        DB::transaction(function () use ($empresa, $fat, $doc, $linhas) {
            $existe = EstoqueMovimento::query()
                ->where('documento_fiscal_saida_id', $doc->id)
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
