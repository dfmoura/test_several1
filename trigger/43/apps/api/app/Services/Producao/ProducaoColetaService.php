<?php

namespace App\Services\Producao;

use App\Models\Empresa;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\OrdemProducao;
use App\Models\OrdemProducaoMaterial;
use App\Models\Produto;
use App\Services\Estoque\EstoqueSaldoWriter;
use App\Support\PadraoDecimal;
use App\Support\ProdutoLotePolitica;
use Illuminate\Validation\ValidationException;

/**
 * Preview e volumes da coleta dirigida (ADR_PRODUCAO_COLETA_DIRIGIDA).
 * Só leitura + DTO — a escrita continua no writer / requisitarMaterial.
 */
class ProducaoColetaService
{
    public function __construct(private readonly EstoqueSaldoWriter $saldos) {}

    /**
     * @return array<string, mixed>
     */
    public function preview(
        Empresa $empresa,
        Produto $produto,
        string $qtde,
    ): array {
        $qtde = PadraoDecimal::roundHalfUp($qtde, PadraoDecimal::SCALE_QTY);
        $unidade = $produto->unidade_interna ?? 'UN';

        if (! $produto->controla_lote) {
            return [
                'controla_lote' => false,
                'politica' => 'QTD',
                'qtde' => $qtde,
                'unidade' => $unidade,
                'suficiente' => true,
                'qtde_faltante' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY),
                'volumes' => [],
                'candidatos' => [],
            ];
        }

        $sugeridas = $this->saldos->sugerirAlocacaoSaida($empresa, $produto, $qtde);
        $idsSugeridos = [];
        foreach ($sugeridas as $aloc) {
            if (! empty($aloc['lote_id'])) {
                $idsSugeridos[(int) $aloc['lote_id']] = (string) $aloc['qtde'];
            }
        }

        $lotes = EstoqueLote::query()
            ->with('endereco:id,codigo')
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->where('qtde', '>', 0)
            ->orderByRaw('data_validade IS NULL')
            ->orderBy('data_validade')
            ->orderBy('data_entrada')
            ->orderBy('id')
            ->get();

        $porId = $lotes->keyBy('id');
        $volumes = [];
        $ordem = 1;
        foreach ($sugeridas as $aloc) {
            $loteId = (int) ($aloc['lote_id'] ?? 0);
            $lote = $porId->get($loteId);
            if (! $lote) {
                continue;
            }
            $volumes[] = $this->volumeToOut($lote, (string) $aloc['qtde'], true, 'FEFO', $ordem);
            $ordem++;
        }

        $candidatos = [];
        foreach ($lotes as $lote) {
            if (isset($idsSugeridos[(int) $lote->id])) {
                continue;
            }
            $candidatos[] = $this->volumeToOut($lote, '0', false, 'DISPONIVEL', null);
        }

        $alocado = '0';
        foreach ($sugeridas as $aloc) {
            $alocado = bcadd($alocado, (string) $aloc['qtde'], PadraoDecimal::SCALE_QTY);
        }
        $alocado = PadraoDecimal::roundHalfUp($alocado, PadraoDecimal::SCALE_QTY);
        $faltante = bccomp($alocado, $qtde, PadraoDecimal::SCALE_QTY) < 0
            ? PadraoDecimal::roundHalfUp(
                bcsub($qtde, $alocado, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            )
            : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);

        return [
            'controla_lote' => true,
            'politica' => 'FEFO_FIFO',
            'qtde' => $qtde,
            'unidade' => $unidade,
            'suficiente' => bccomp($faltante, '0', PadraoDecimal::SCALE_QTY) === 0 && $sugeridas !== [],
            'qtde_faltante' => $faltante,
            'volumes' => $this->ordenarCaminhada($volumes),
            'candidatos' => $this->ordenarCaminhada($candidatos),
        ];
    }

    /**
     * Volumes já baixados nesta OP para o SKU (inclui complementar).
     *
     * @return list<array<string, mixed>>
     */
    public function volumesBaixados(Empresa $empresa, OrdemProducao $op, int $produtoId): array
    {
        $itens = EstoqueMovimentoItem::query()
            ->with([
                'produto:id,codigo',
                'lote.endereco:id,codigo',
                'movimento:id,codigo,tipo,ordem_producao_id,empresa_id,created_at,observacao',
            ])
            ->where('produto_id', $produtoId)
            ->whereHas('movimento', function ($q) use ($empresa, $op) {
                $q->where('empresa_id', $empresa->id)
                    ->where('ordem_producao_id', $op->id)
                    ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO);
            })
            ->orderBy('movimento_id')
            ->orderBy('ordem')
            ->get();

        $out = [];
        $ordem = 1;
        foreach ($itens as $item) {
            $lote = $item->lote;
            if ($lote) {
                $linha = $this->volumeToOut($lote, (string) $item->qtde, false, 'BAIXADO', $ordem);
            } else {
                $linha = [
                    'lote_id' => null,
                    'codigo' => null,
                    'qtde_volume' => null,
                    'qtde_retirar' => (string) $item->qtde,
                    'unidade' => $item->unidade,
                    'data_entrada' => null,
                    'data_validade' => null,
                    'status' => null,
                    'status_label' => null,
                    'largura_mm' => null,
                    'comprimento_m' => null,
                    'endereco' => null,
                    'sugerido' => false,
                    'motivo' => 'BAIXADO',
                    'ordem_politica' => $ordem,
                ];
            }
            $linha['movimento_id'] = $item->movimento_id;
            $linha['movimento_codigo'] = $item->movimento?->codigo;
            $linha['movimento_em'] = optional($item->movimento?->created_at)?->toIso8601String();
            $linha['sku'] = $item->produto?->codigo;
            $out[] = $linha;
            $ordem++;
        }

        return $out;
    }

    /**
     * @param  list<array{lote_id?: int, qtde?: string}>  $volumes
     */
    public function validarOverride(
        Empresa $empresa,
        Produto $produto,
        string $qtde,
        array $volumes,
        ?string $motivo,
    ): void {
        if (! $produto->controla_lote) {
            if ($volumes !== []) {
                throw ValidationException::withMessages([
                    'volumes' => ['Este SKU não controla lote — não informe volumes.'],
                ]);
            }

            return;
        }

        $sugeridas = $this->saldos->sugerirAlocacaoSaida($empresa, $produto, $qtde);
        if ($this->saldos->alocacoesIguais($sugeridas, $volumes)) {
            return;
        }

        $motivo = trim((string) $motivo);
        if (mb_strlen($motivo) < 3) {
            throw ValidationException::withMessages([
                'volumes_motivo' => [
                    'Informe o motivo (mínimo 3 caracteres) para retirar um volume diferente da sugestão FEFO.',
                ],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function daLinha(
        Empresa $empresa,
        OrdemProducao $op,
        OrdemProducaoMaterial $mat,
        ?string $qtde = null,
    ): array {
        $produto = $mat->produto;
        if (! $produto) {
            throw ValidationException::withMessages([
                'material_id' => ['Material sem SKU.'],
            ]);
        }

        $pendente = $mat->saida_movimento_id === null;
        $qtdeAlvo = $qtde !== null && $qtde !== ''
            ? PadraoDecimal::roundHalfUp($qtde, PadraoDecimal::SCALE_QTY)
            : PadraoDecimal::roundHalfUp(
                $pendente ? (string) $mat->qtde_planejada : (string) $mat->qtde_requisitada,
                PadraoDecimal::SCALE_QTY
            );

        $out = $pendente || ($qtde !== null && $qtde !== '')
            ? $this->preview($empresa, $produto, $qtdeAlvo)
            : [
                'controla_lote' => (bool) $produto->controla_lote,
                'politica' => $produto->controla_lote ? 'FEFO_FIFO' : 'QTD',
                'qtde' => $qtdeAlvo,
                'unidade' => $produto->unidade_interna ?? $mat->unidade,
                'suficiente' => true,
                'qtde_faltante' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY),
                'volumes' => [],
                'candidatos' => [],
            ];

        $out['volumes_baixados'] = $this->volumesBaixados($empresa, $op, (int) $mat->produto_id);

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public function volumeToOut(
        EstoqueLote $lote,
        string $qtdeRetirar,
        bool $sugerido,
        string $motivo,
        ?int $ordemPolitica,
    ): array {
        $status = $lote->statusValidade();

        return [
            'lote_id' => (int) $lote->id,
            'codigo' => $lote->codigo,
            'qtde_volume' => (string) $lote->qtde,
            'qtde_retirar' => PadraoDecimal::roundHalfUp($qtdeRetirar, PadraoDecimal::SCALE_QTY),
            'unidade' => $lote->unidade,
            'data_entrada' => optional($lote->data_entrada)?->format('Y-m-d'),
            'data_validade' => optional($lote->data_validade)?->format('Y-m-d'),
            'status' => $status,
            'status_label' => ProdutoLotePolitica::statusLabel($status),
            'largura_mm' => $lote->largura_mm !== null ? (string) $lote->largura_mm : null,
            'comprimento_m' => $lote->comprimento_m !== null ? (string) $lote->comprimento_m : null,
            'endereco' => $lote->relationLoaded('endereco') && $lote->endereco ? [
                'id' => $lote->endereco->id,
                'codigo' => $lote->endereco->codigo,
            ] : null,
            'sugerido' => $sugerido,
            'motivo' => $motivo,
            'ordem_politica' => $ordemPolitica,
        ];
    }

    /**
     * Fila do chão: a retirar (empenho pendente) e a entregar (já baixado, sem handoff).
     *
     * @return array{a_retirar: list<array<string, mixed>>, a_entregar: list<array<string, mixed>>, resumo: array{a_retirar: int, a_entregar: int, total: int}}
     */
    public function fila(Empresa $empresa): array
    {
        $ops = OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
            ->with([
                'pedido:id,codigo,status,parceiro_id',
                'pedido.parceiro:id,codigo,razao_social',
                'materiais.produto:id,codigo,controla_lote,unidade_interna',
            ])
            ->orderBy('codigo')
            ->get();

        $aRetirar = [];
        $aEntregar = [];
        foreach ($ops as $op) {
            $pendentes = $op->materiais->filter(
                fn (OrdemProducaoMaterial $m) => $m->saida_movimento_id === null
                    && bccomp((string) $m->qtde_planejada, '0', PadraoDecimal::SCALE_QTY) > 0
            );
            $baixados = $op->materiais->filter(
                fn (OrdemProducaoMaterial $m) => $m->saida_movimento_id !== null
            );

            $card = $this->cardFila($op, $pendentes->count(), $baixados->count());
            if ($pendentes->isNotEmpty()) {
                $locais = [];
                foreach ($pendentes as $mat) {
                    if (! $mat->produto?->controla_lote) {
                        continue;
                    }
                    $prev = $this->preview(
                        $empresa,
                        $mat->produto,
                        PadraoDecimal::roundHalfUp((string) $mat->qtde_planejada, PadraoDecimal::SCALE_QTY),
                    );
                    foreach ($prev['volumes'] as $vol) {
                        $cod = $vol['endereco']['codigo'] ?? null;
                        if (is_string($cod) && $cod !== '') {
                            $locais[$cod] = true;
                        }
                    }
                }
                $card['primeiro_local'] = $locais === [] ? null : array_key_first($locais);
                $card['locais'] = array_keys($locais);
                $aRetirar[] = $card;
            }
            if ($baixados->isNotEmpty() && $op->insumos_entregues_em === null) {
                $aEntregar[] = $card;
            }
        }

        return [
            'a_retirar' => $aRetirar,
            'a_entregar' => $aEntregar,
            'resumo' => [
                'a_retirar' => count($aRetirar),
                'a_entregar' => count($aEntregar),
                'total' => count($aRetirar) + count($aEntregar),
            ],
        ];
    }

    public function contarFila(Empresa $empresa): int
    {
        return OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
            ->where(function ($q) {
                $q->whereHas('materiais', function ($m) {
                    $m->whereNull('saida_movimento_id')->where('qtde_planejada', '>', 0);
                })->orWhere(function ($q2) {
                    $q2->whereNull('insumos_entregues_em')
                        ->whereHas('materiais', function ($m) {
                            $m->whereNotNull('saida_movimento_id');
                        });
                });
            })
            ->count();
    }

    /**
     * @return array<string, mixed>
     */
    public function handoffToOut(OrdemProducao $op): array
    {
        $op->loadMissing('insumosEntreguesPorUser:id,name,codigo');

        return [
            'entregue' => $op->insumos_entregues_em !== null,
            'entregues_em' => optional($op->insumos_entregues_em)?->toIso8601String(),
            'entregues_por' => $op->insumosEntreguesPorUser ? [
                'id' => $op->insumosEntreguesPorUser->id,
                'nome' => $op->insumosEntreguesPorUser->name,
                'codigo' => $op->insumosEntreguesPorUser->codigo,
            ] : null,
            'recebidos_nome' => $op->insumos_recebidos_nome,
        ];
    }

    /**
     * Ficha de confrontação (sistema × físico) anexada à OP — leitura dos MOV.
     *
     * @param  list<array<string, mixed>>  $materiais
     * @return array{linhas: list<array<string, mixed>>, ciclos: list<array<string, mixed>>}
     */
    public function fichaDe(Empresa $empresa, OrdemProducao $op, array $materiais): array
    {
        $linhas = [];
        foreach ($materiais as $m) {
            if (! is_array($m)) {
                continue;
            }
            $planejado = PadraoDecimal::roundHalfUp((string) ($m['qtde_planejada'] ?? '0'), PadraoDecimal::SCALE_QTY);
            $requisitado = PadraoDecimal::roundHalfUp((string) ($m['qtde_requisitada'] ?? '0'), PadraoDecimal::SCALE_QTY);
            $avaria = PadraoDecimal::roundHalfUp((string) ($m['qtde_avaria'] ?? '0'), PadraoDecimal::SCALE_QTY);
            $pendente = (bool) ($m['pendente'] ?? false);
            $delta = PadraoDecimal::roundHalfUp(
                bcsub($requisitado, $planejado, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );
            $aRetirar = $pendente
                ? $planejado
                : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);

            $produto = is_array($m['produto'] ?? null) ? $m['produto'] : [];
            $retirada = is_array($m['retirada'] ?? null) ? $m['retirada'] : [];

            $linhas[] = [
                'material_id' => (int) ($m['id'] ?? 0),
                'sku' => $produto['codigo'] ?? null,
                'descricao' => $produto['descricao_fiscal'] ?? ($m['componente'] ?? null),
                'unidade' => $m['unidade'] ?? ($produto['unidade_interna'] ?? 'UN'),
                'controla_lote' => (bool) ($produto['controla_lote'] ?? $retirada['controla_lote'] ?? false),
                'planejado' => $planejado,
                'requisitado' => $requisitado,
                'avaria' => $avaria,
                'motivo_avaria' => $m['motivo_avaria'] ?? null,
                'a_retirar' => $aRetirar,
                'delta' => $delta,
                'pendente' => $pendente,
                'aguardando_material' => (bool) ($m['aguardando_material'] ?? false),
                'suficiente' => (bool) ($retirada['suficiente'] ?? true),
                'qtde_faltante' => $retirada['qtde_faltante'] ?? PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY),
            ];
        }

        $movs = EstoqueMovimento::query()
            ->with(['itens.produto:id,codigo', 'itens.lote.endereco:id,codigo'])
            ->where('empresa_id', $empresa->id)
            ->where('ordem_producao_id', $op->id)
            ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO)
            ->orderBy('id')
            ->get();

        $ciclos = [];
        $n = 1;
        foreach ($movs as $mov) {
            $obs = (string) ($mov->observacao ?? '');
            $itens = [];
            foreach ($mov->itens as $item) {
                $lote = $item->lote;
                $itens[] = [
                    'produto_id' => (int) $item->produto_id,
                    'sku' => $item->produto?->codigo,
                    'lote_id' => $item->lote_id ? (int) $item->lote_id : null,
                    'codigo' => $lote?->codigo,
                    'qtde' => PadraoDecimal::roundHalfUp((string) $item->qtde, PadraoDecimal::SCALE_QTY),
                    'unidade' => $item->unidade,
                    'endereco' => $lote?->endereco ? [
                        'id' => $lote->endereco->id,
                        'codigo' => $lote->endereco->codigo,
                    ] : null,
                ];
            }
            $ciclos[] = [
                'n' => $n,
                'movimento_id' => (int) $mov->id,
                'movimento_codigo' => $mov->codigo,
                'em' => optional($mov->created_at)?->toIso8601String(),
                'complementar' => str_contains(mb_strtolower($obs), 'complemento'),
                'observacao' => $obs !== '' ? $obs : null,
                'itens' => $itens,
            ];
            $n++;
        }

        return [
            'linhas' => $linhas,
            'ciclos' => $ciclos,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function cardFila(OrdemProducao $op, int $pendentes, int $baixados): array
    {
        return [
            'id' => $op->id,
            'codigo' => $op->codigo,
            'status' => $op->status,
            'pedido' => $op->pedido ? [
                'id' => $op->pedido->id,
                'codigo' => $op->pedido->codigo,
            ] : null,
            'parceiro' => $op->pedido?->parceiro ? [
                'id' => $op->pedido->parceiro->id,
                'codigo' => $op->pedido->parceiro->codigo,
                'razao_social' => $op->pedido->parceiro->razao_social,
            ] : null,
            'linhas_pendentes' => $pendentes,
            'linhas_baixadas' => $baixados,
            'handoff' => $this->handoffToOut($op),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $volumes
     * @return list<array<string, mixed>>
     */
    private function ordenarCaminhada(array $volumes): array
    {
        usort($volumes, static function (array $a, array $b): int {
            $ea = $a['endereco']['codigo'] ?? '';
            $eb = $b['endereco']['codigo'] ?? '';
            if ($ea === '' && $eb !== '') {
                return 1;
            }
            if ($ea !== '' && $eb === '') {
                return -1;
            }
            $loc = strcmp($ea, $eb);
            if ($loc !== 0) {
                return $loc;
            }

            return ((int) ($a['ordem_politica'] ?? 99)) <=> ((int) ($b['ordem_politica'] ?? 99));
        });

        return $volumes;
    }
}
