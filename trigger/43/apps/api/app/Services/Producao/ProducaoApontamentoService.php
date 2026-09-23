<?php

namespace App\Services\Producao;

use App\Models\Empresa;
use App\Models\OrdemProducao;
use App\Models\OrdemProducaoMaterial;

/**
 * Fila do chão para apontar e concluir a OP — mesmo motor de OrdemProducaoService::concluir.
 * Sem documento APONT- e sem segundo writer.
 */
class ProducaoApontamentoService
{
    public function __construct(private readonly ProducaoColetaService $coleta) {}

    /**
     * @return array{a_receber: list<array<string, mixed>>, a_apontar: list<array<string, mixed>>, resumo: array{a_receber: int, a_apontar: int, total: int}}
     */
    public function fila(Empresa $empresa): array
    {
        $ops = OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
            ->whereHas('materiais', function ($m) {
                $m->whereNotNull('saida_movimento_id');
            })
            ->with([
                'pedido:id,codigo,status,parceiro_id',
                'pedido.parceiro:id,codigo,razao_social',
                'materiais:id,ordem_producao_id,saida_movimento_id',
                'insumosEntreguesPorUser:id,name,codigo',
            ])
            ->orderBy('codigo')
            ->get();

        $aReceber = [];
        $aApontar = [];
        foreach ($ops as $op) {
            $baixados = $op->materiais->filter(
                fn (OrdemProducaoMaterial $m) => $m->saida_movimento_id !== null
            )->count();
            $card = [
                'id' => $op->id,
                'codigo' => $op->codigo,
                'status' => $op->status,
                'qtde_planejada' => (string) $op->qtde_planejada,
                'pedido' => $op->pedido ? [
                    'id' => $op->pedido->id,
                    'codigo' => $op->pedido->codigo,
                ] : null,
                'parceiro' => $op->pedido?->parceiro ? [
                    'id' => $op->pedido->parceiro->id,
                    'codigo' => $op->pedido->parceiro->codigo,
                    'razao_social' => $op->pedido->parceiro->razao_social,
                ] : null,
                'linhas_baixadas' => $baixados,
                'handoff' => $this->coleta->handoffToOut($op),
            ];
            if ($op->insumos_entregues_em === null) {
                $aReceber[] = $card;
            } else {
                $aApontar[] = $card;
            }
        }

        return [
            'a_receber' => $aReceber,
            'a_apontar' => $aApontar,
            'resumo' => [
                'a_receber' => count($aReceber),
                'a_apontar' => count($aApontar),
                'total' => count($aReceber) + count($aApontar),
            ],
        ];
    }

    public function contarFila(Empresa $empresa): int
    {
        return OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
            ->whereHas('materiais', function ($m) {
                $m->whereNotNull('saida_movimento_id');
            })
            ->count();
    }
}
