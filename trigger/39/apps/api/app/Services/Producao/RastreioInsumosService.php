<?php

namespace App\Services\Producao;

use App\Models\Empresa;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\OrdemProducao;
use App\Models\OrdemProducaoMaterial;
use App\Models\Pedido;
use App\Support\PadraoDecimal;
use Illuminate\Support\Collection;

/**
 * Genealogia OP/PED → lote → NF/fornecedor (estudo 32 CONTROLE_ESTOQUE §6).
 * Só leitura dos MOV oficiais — ADR-039-PRD-002.
 */
class RastreioInsumosService
{
    /**
     * @return array<string, mixed>
     */
    public function paraOp(Empresa $empresa, OrdemProducao $op): array
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }

        $op->loadMissing([
            'pedido.parceiro:id,codigo,razao_social',
            'pedidoItem:id,descricao,necessidade,qtde_pedida',
            'materiais.produto:id,codigo,descricao_fiscal,familia,unidade_interna,controla_lote',
            'materiais.saidaMovimento.itens.lote',
            'paMovimento:id,codigo,tipo',
        ]);

        $insumos = [];
        foreach ($op->materiais as $mat) {
            $insumos[] = $this->insumoDaLinha($empresa, $mat);
        }

        return [
            'tipo' => 'OP',
            'op' => $this->opRef($op),
            'pedido' => $this->pedidoRef($op->pedido),
            'cliente' => $this->parceiroRef($op->pedido?->parceiro),
            'pa' => $op->paMovimento ? [
                'movimento_id' => $op->paMovimento->id,
                'codigo' => $op->paMovimento->codigo,
                'qtde_boa' => $op->qtde_boa !== null ? (string) $op->qtde_boa : null,
            ] : null,
            'insumos' => $insumos,
            'resumo' => $this->resumo($insumos),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function paraPedido(Empresa $empresa, Pedido $pedido): array
    {
        if ($pedido->empresa_id !== $empresa->id) {
            abort(404);
        }

        $pedido->loadMissing([
            'parceiro:id,codigo,razao_social',
            'ordensProducao.materiais.produto',
            'ordensProducao.materiais.saidaMovimento.itens.lote',
            'ordensProducao.pedido.parceiro:id,codigo,razao_social',
            'ordensProducao.pedidoItem:id,descricao,necessidade,qtde_pedida',
            'ordensProducao.paMovimento:id,codigo,tipo',
        ]);

        $ops = [];
        $insumos = [];
        foreach ($pedido->ordensProducao as $op) {
            if ($op->status === OrdemProducao::STATUS_CANCELADA) {
                continue;
            }
            $bloco = $this->paraOp($empresa, $op);
            $ops[] = [
                'op' => $bloco['op'],
                'resumo' => $bloco['resumo'],
                'insumos' => $bloco['insumos'],
            ];
            foreach ($bloco['insumos'] as $linha) {
                $insumos[] = $linha;
            }
        }

        return [
            'tipo' => 'PED',
            'pedido' => $this->pedidoRef($pedido),
            'cliente' => $this->parceiroRef($pedido->parceiro),
            'ops' => $ops,
            'insumos' => $insumos,
            'resumo' => $this->resumo($insumos),
        ];
    }

    /**
     * Direção direta: lote/NF do fornecedor → OPs que consumiram.
     *
     * @return array<string, mixed>
     */
    public function paraLote(Empresa $empresa, EstoqueLote $lote): array
    {
        if ($lote->empresa_id !== $empresa->id) {
            abort(404);
        }

        $lote->loadMissing(['produto:id,codigo,descricao_fiscal,familia,unidade_interna,controla_lote']);

        $saidas = EstoqueMovimentoItem::query()
            ->where('lote_id', $lote->id)
            ->whereHas('movimento', function ($q) use ($empresa) {
                $q->where('empresa_id', $empresa->id)
                    ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO);
            })
            ->with([
                'movimento.ordemProducao.pedido.parceiro:id,codigo,razao_social',
                'movimento.ordemProducao.pedidoItem:id,descricao',
            ])
            ->get();

        $consumos = [];
        foreach ($saidas as $item) {
            $mov = $item->movimento;
            $op = $mov?->ordemProducao;
            if (! $op || $op->empresa_id !== $empresa->id) {
                continue;
            }
            $consumos[] = [
                'qtde' => (string) $item->qtde,
                'unidade' => $item->unidade,
                'movimento' => [
                    'id' => $mov->id,
                    'codigo' => $mov->codigo,
                    'created_at' => optional($mov->created_at)?->toIso8601String(),
                ],
                'op' => $this->opRef($op),
                'pedido' => $this->pedidoRef($op->pedido),
                'cliente' => $this->parceiroRef($op->pedido?->parceiro),
            ];
        }

        $origens = $this->origensDoLote($empresa, (int) $lote->id, null);

        return [
            'tipo' => 'LOTE',
            'lote' => $this->loteIdentidade($lote),
            'produto' => $lote->produto ? [
                'id' => $lote->produto->id,
                'codigo' => $lote->produto->codigo,
                'descricao_fiscal' => $lote->produto->descricao_fiscal,
                'familia' => $lote->produto->familia,
                'unidade_interna' => $lote->produto->unidade_interna,
                'controla_lote' => (bool) $lote->produto->controla_lote,
            ] : null,
            'origens' => $origens,
            'consumos' => $consumos,
            'resumo' => [
                'ops' => count(array_unique(array_map(
                    static fn (array $c) => $c['op']['id'] ?? 0,
                    $consumos
                ))),
                'notas' => count(array_unique(array_filter(array_map(
                    static fn (array $o) => $o['nf_numero'] ?? null,
                    $origens
                )))),
                'rastreavel_fornecedor' => $this->algumaOrigemFornecedor($origens),
            ],
        ];
    }

    /**
     * @return array{query: string, hits: list<array<string, mixed>>}
     */
    public function buscar(Empresa $empresa, string $q): array
    {
        $q = trim($q);
        if ($q === '') {
            return ['query' => '', 'hits' => []];
        }

        $like = '%'.$q.'%';
        $hits = [];

        $ops = OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->with(['pedido:id,codigo', 'pedidoItem:id,descricao'])
            ->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like);
            })
            ->orderByDesc('id')
            ->limit(8)
            ->get();
        foreach ($ops as $op) {
            $hits[] = [
                'tipo' => 'OP',
                'id' => $op->id,
                'codigo' => $op->codigo,
                'rotulo' => trim($op->codigo.' · '.($op->pedido?->codigo ?? '').' · '.($op->pedidoItem?->descricao ?? '')),
                'status' => $op->status,
            ];
        }

        $peds = Pedido::query()
            ->where('empresa_id', $empresa->id)
            ->with(['parceiro:id,codigo,razao_social'])
            ->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like)
                    ->orWhereHas('parceiro', function ($p) use ($like) {
                        $p->where('razao_social', 'like', $like)
                            ->orWhere('nome_fantasia', 'like', $like)
                            ->orWhere('codigo', 'like', $like);
                    });
            })
            ->orderByDesc('id')
            ->limit(8)
            ->get();
        foreach ($peds as $ped) {
            $hits[] = [
                'tipo' => 'PED',
                'id' => $ped->id,
                'codigo' => $ped->codigo,
                'rotulo' => trim($ped->codigo.' · '.($ped->parceiro?->razao_social ?? '')),
                'status' => $ped->status,
            ];
        }

        $lotes = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->with(['produto:id,codigo,descricao_fiscal'])
            ->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like)
                    ->orWhere('nf_numero', 'like', $like);
            })
            ->orderByDesc('id')
            ->limit(8)
            ->get();
        foreach ($lotes as $lote) {
            $hits[] = [
                'tipo' => 'LOTE',
                'id' => $lote->id,
                'codigo' => $lote->codigo,
                'rotulo' => trim($lote->codigo.' · '.($lote->produto?->codigo ?? '').' · '.($lote->produto?->descricao_fiscal ?? '')),
                'produto_id' => $lote->produto_id,
            ];
        }

        $nfs = EstoqueMovimento::query()
            ->where('empresa_id', $empresa->id)
            ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_COMPRA)
            ->with(['fornecedor:id,codigo,razao_social', 'ordemCompra:id,codigo'])
            ->where(function ($w) use ($like) {
                $w->where('nf_numero', 'like', $like)
                    ->orWhere('nf_chave', 'like', $like)
                    ->orWhere('codigo', 'like', $like);
            })
            ->orderByDesc('id')
            ->limit(8)
            ->get();
        foreach ($nfs as $mov) {
            $nf = $mov->nf_numero ?: $mov->codigo;
            $hits[] = [
                'tipo' => 'NF',
                'id' => $mov->id,
                'codigo' => $nf,
                'rotulo' => trim(
                    'NF '.$nf
                    .' · '.($mov->fornecedor?->razao_social ?? '')
                    .' · '.($mov->ordemCompra?->codigo ?? $mov->codigo)
                ),
                'movimento_id' => $mov->id,
                'lote_ids' => $mov->itens()->whereNotNull('lote_id')->pluck('lote_id')->unique()->values()->all(),
            ];
        }

        return ['query' => $q, 'hits' => $hits];
    }

    /**
     * @return array<string, mixed>
     */
    private function insumoDaLinha(Empresa $empresa, OrdemProducaoMaterial $mat): array
    {
        $produto = $mat->produto;
        $saida = $mat->saidaMovimento;
        $qtdeReq = (string) $mat->qtde_requisitada;
        $qtdeRet = (string) $mat->qtde_retorno;
        $qtdePerda = (string) $mat->qtde_perda;
        $qtdeLiq = PadraoDecimal::roundHalfUp(
            bcsub($qtdeReq, $qtdeRet, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );

        $lotes = [];
        if ($saida) {
            $saida->loadMissing('itens.lote');
            foreach ($saida->itens as $item) {
                $lote = $item->lote;
                $origens = [];
                $rastreavel = false;
                $obs = null;
                $misto = false;

                if ($lote) {
                    $origens = $this->origensDoLote($empresa, (int) $lote->id, $saida);
                    $fornecedor = array_values(array_filter(
                        $origens,
                        static fn (array $o) => ($o['tipo'] ?? '') === EstoqueMovimento::TIPO_ENTRADA_COMPRA
                            && ! empty($o['nf_numero'] ?? $o['fornecedor'])
                    ));
                    $misto = count($fornecedor) > 1;
                    $rastreavel = $this->algumaOrigemFornecedor($origens);
                    if (! $rastreavel) {
                        $obs = $this->obsSemFornecedor($lote, $origens);
                    } elseif ($misto) {
                        $obs = 'Lote misto — mais de uma NF alimentou este código antes da saída. Reporte as notas listadas.';
                    }
                }

                $lotes[] = [
                    'lote' => $lote ? $this->loteIdentidade($lote) : null,
                    'qtde_baixada' => (string) $item->qtde,
                    'unidade' => $item->unidade,
                    'origens' => $origens,
                    'lote_misto' => $misto,
                    'rastreavel_fornecedor' => $rastreavel,
                    'observacao' => $obs,
                ];
            }
        }

        $controlaLote = (bool) ($produto?->controla_lote);
        $semLote = $controlaLote === false;
        $obsLinha = null;
        if ($mat->saida_movimento_id === null) {
            $obsLinha = 'Ainda não requisitado — sem rastro de saída.';
        } elseif ($semLote) {
            $obsLinha = 'SKU sem controle de lote (política EMB/REV/PA). A origem da nota não é unívoca.';
        } elseif ($saida && $saida->itens->every(fn ($i) => $i->lote_id === null)) {
            $obsLinha = 'Saída sem lote amarrado — conferir cadastro do SKU.';
        }

        return [
            'material_id' => $mat->id,
            'componente' => $mat->componente,
            'origem_texto' => $mat->origem_texto,
            'produto' => $produto ? [
                'id' => $produto->id,
                'codigo' => $produto->codigo,
                'descricao_fiscal' => $produto->descricao_fiscal,
                'familia' => $produto->familia,
                'unidade_interna' => $produto->unidade_interna,
                'controla_lote' => $controlaLote,
            ] : null,
            'unidade' => $mat->unidade,
            'qtde_planejada' => (string) $mat->qtde_planejada,
            'qtde_requisitada' => $qtdeReq,
            'qtde_retorno' => $qtdeRet,
            'qtde_perda' => $qtdePerda,
            'qtde_liquida' => $qtdeLiq,
            'pendente' => $mat->saida_movimento_id === null,
            'saida_movimento' => $saida ? [
                'id' => $saida->id,
                'codigo' => $saida->codigo,
                'created_at' => optional($saida->created_at)?->toIso8601String(),
            ] : null,
            'lotes' => $lotes,
            'sem_lote' => $semLote,
            'rastreavel_fornecedor' => collect($lotes)->contains(fn (array $l) => $l['rastreavel_fornecedor']),
            'observacao' => $obsLinha,
        ];
    }

    /**
     * Origens do lote. Com $saida, só documentos anteriores à baixa (id do MOV).
     *
     * @return list<array<string, mixed>>
     */
    private function origensDoLote(Empresa $empresa, int $loteId, ?EstoqueMovimento $saida): array
    {
        $query = EstoqueMovimentoItem::query()
            ->where('lote_id', $loteId)
            ->whereHas('movimento', function ($q) use ($empresa, $saida) {
                $q->where('empresa_id', $empresa->id)
                    ->whereIn('tipo', [
                        EstoqueMovimento::TIPO_ENTRADA_COMPRA,
                        EstoqueMovimento::TIPO_AJUSTE,
                    ]);
                if ($saida) {
                    $q->where('id', '<', $saida->id);
                }
            })
            ->with([
                'movimento.fornecedor:id,codigo,razao_social,nome_fantasia',
                'movimento.ordemCompra:id,codigo',
                'movimento.nfeEntrada:id,movimento_id,chave,numero,serie,data_emissao,xml_path',
                'movimento.ajuste:id,codigo,motivo_codigo',
            ])
            ->orderBy('id');

        /** @var Collection<int, EstoqueMovimentoItem> $itens */
        $itens = $query->get();

        $out = [];
        foreach ($itens as $item) {
            $mov = $item->movimento;
            if (! $mov) {
                continue;
            }
            $nfe = $mov->nfeEntrada;
            $out[] = [
                'tipo' => $mov->tipo,
                'movimento_id' => $mov->id,
                'movimento_codigo' => $mov->codigo,
                'qtde' => (string) $item->qtde,
                'unidade' => $item->unidade,
                'nf_numero' => $mov->nf_numero,
                'nf_chave' => $mov->nf_chave,
                'nf_data' => optional($mov->nf_data)?->format('Y-m-d'),
                'oc' => $mov->ordemCompra ? [
                    'id' => $mov->ordemCompra->id,
                    'codigo' => $mov->ordemCompra->codigo,
                ] : null,
                'fornecedor' => $this->parceiroRef($mov->fornecedor),
                'nfe_entrada' => $nfe ? [
                    'id' => $nfe->id,
                    'numero' => $nfe->numero,
                    'serie' => $nfe->serie,
                    'chave' => $nfe->chave,
                    'data_emissao' => optional($nfe->data_emissao)?->format('Y-m-d'),
                    'xml_armazenado' => $nfe->xml_path !== null && $nfe->xml_path !== '',
                ] : null,
                'ajuste' => $mov->ajuste ? [
                    'id' => $mov->ajuste->id,
                    'codigo' => $mov->ajuste->codigo,
                    'motivo' => $mov->ajuste->motivo_codigo,
                ] : null,
                'created_at' => optional($mov->created_at)?->toIso8601String(),
            ];
        }

        if ($out !== []) {
            return $out;
        }

        $lote = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $loteId)
            ->first();
        if (! $lote) {
            return [];
        }

        return [[
            'tipo' => $lote->origem_tipo,
            'movimento_id' => null,
            'movimento_codigo' => null,
            'qtde' => (string) $lote->qtde,
            'unidade' => $lote->unidade,
            'nf_numero' => $lote->nf_numero,
            'nf_chave' => null,
            'nf_data' => optional($lote->data_entrada)?->format('Y-m-d'),
            'oc' => null,
            'fornecedor' => null,
            'nfe_entrada' => null,
            'ajuste' => null,
            'created_at' => optional($lote->created_at)?->toIso8601String(),
            'fallback_lote' => true,
        ]];
    }

    /**
     * @param  list<array<string, mixed>>  $origens
     */
    private function algumaOrigemFornecedor(array $origens): bool
    {
        foreach ($origens as $o) {
            if (($o['tipo'] ?? '') !== EstoqueMovimento::TIPO_ENTRADA_COMPRA) {
                continue;
            }
            if (! empty($o['fornecedor']) || ! empty($o['nf_numero']) || ! empty($o['nfe_entrada'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<array<string, mixed>>  $origens
     */
    private function obsSemFornecedor(EstoqueLote $lote, array $origens): string
    {
        $tipos = array_unique(array_map(static fn (array $o) => (string) ($o['tipo'] ?? ''), $origens));
        if (in_array(EstoqueLote::ORIGEM_BACKFILL, $tipos, true) || $lote->origem_tipo === EstoqueLote::ORIGEM_BACKFILL) {
            return 'Lote de abertura — nota do fornecedor não documentada neste sistema.';
        }
        if (in_array(EstoqueMovimento::TIPO_AJUSTE, $tipos, true) || in_array(EstoqueLote::ORIGEM_VIRADA, $tipos, true) || in_array(EstoqueLote::ORIGEM_AJUSTE, $tipos, true)) {
            return 'Origem por ajuste/virada — sem NF de fornecedor para reportar.';
        }

        return 'Sem documento de entrada de compra amarrado a este lote.';
    }

    /**
     * @return array<string, mixed>
     */
    private function loteIdentidade(EstoqueLote $lote): array
    {
        return [
            'id' => $lote->id,
            'codigo' => $lote->codigo,
            'data_entrada' => optional($lote->data_entrada)?->format('Y-m-d'),
            'data_fabricacao' => optional($lote->data_fabricacao)?->format('Y-m-d'),
            'data_validade' => optional($lote->data_validade)?->format('Y-m-d'),
            'origem_tipo' => $lote->origem_tipo,
            'nf_numero' => $lote->nf_numero,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function opRef(OrdemProducao $op): array
    {
        return [
            'id' => $op->id,
            'codigo' => $op->codigo,
            'status' => $op->status,
            'qtde_boa' => $op->qtde_boa !== null ? (string) $op->qtde_boa : null,
            'concluida_em' => optional($op->concluida_em)?->toIso8601String(),
            'item' => $op->pedidoItem?->descricao,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function pedidoRef(?Pedido $pedido): ?array
    {
        if (! $pedido) {
            return null;
        }

        return [
            'id' => $pedido->id,
            'codigo' => $pedido->codigo,
            'status' => $pedido->status,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function parceiroRef(mixed $parceiro): ?array
    {
        if (! $parceiro) {
            return null;
        }

        return [
            'id' => $parceiro->id,
            'codigo' => $parceiro->codigo ?? null,
            'razao_social' => $parceiro->razao_social ?? null,
            'nome_fantasia' => $parceiro->nome_fantasia ?? null,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $insumos
     * @return array<string, mixed>
     */
    private function resumo(array $insumos): array
    {
        $loteIds = [];
        $nfs = [];
        $fornecedores = [];
        $semRastro = 0;
        $comSaida = 0;

        foreach ($insumos as $ins) {
            if (! empty($ins['pendente'])) {
                continue;
            }
            $comSaida++;
            if (empty($ins['rastreavel_fornecedor'])) {
                $semRastro++;
            }
            foreach ($ins['lotes'] ?? [] as $linha) {
                if (! empty($linha['lote']['id'])) {
                    $loteIds[$linha['lote']['id']] = true;
                }
                foreach ($linha['origens'] ?? [] as $o) {
                    if (! empty($o['nf_numero'])) {
                        $nfs[$o['nf_numero']] = true;
                    }
                    if (! empty($o['fornecedor']['id'])) {
                        $fornecedores[$o['fornecedor']['id']] = $o['fornecedor']['razao_social'] ?? '';
                    }
                }
            }
        }

        return [
            'insumos_com_saida' => $comSaida,
            'lotes' => count($loteIds),
            'notas' => count($nfs),
            'fornecedores' => count($fornecedores),
            'sem_rastro_fornecedor' => $semRastro,
            'pronto_para_fornecedor' => $comSaida > 0 && count($nfs) > 0,
        ];
    }
}
