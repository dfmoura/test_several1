<?php

namespace App\Services\Calendario;

use App\Models\Empresa;
use App\Models\Feriado;
use App\Models\Orcamento;
use App\Models\Pedido;
use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Conversão prazo em dias úteis → data prevista (ADR-043-FER-001).
 */
class DiasUteisService
{
    /** @var array<int, list<Feriado>> */
    private array $feriadosCache = [];

    public function isBusinessDay(CarbonInterface $date, Empresa $empresa): bool
    {
        if ($date->isWeekend()) {
            return false;
        }

        return ! $this->isFeriado($date, $empresa);
    }

    public function isFeriado(CarbonInterface $date, Empresa $empresa): bool
    {
        foreach ($this->feriadosAtivos($empresa) as $feriado) {
            if ($this->feriadoCoincide($feriado, $date)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Soma N dias úteis após a referência (referência não conta).
     */
    public function addBusinessDays(CarbonInterface $referencia, int $dias, Empresa $empresa): Carbon
    {
        $dias = max(0, $dias);
        $cursor = Carbon::parse($referencia)->startOfDay();
        $contados = 0;

        while ($contados < $dias) {
            $cursor->addDay();
            if ($this->isBusinessDay($cursor, $empresa)) {
                $contados++;
            }
        }

        return $cursor;
    }

    public function prazoEfetivoDias(int $prazoEntregaDias, bool $facaNova, ?int $prazoFacaDias): int
    {
        $base = max(0, $prazoEntregaDias);
        $extra = $facaNova ? max(0, (int) ($prazoFacaDias ?? 0)) : 0;

        return $base + $extra;
    }

    /**
     * @return array{prazo_efetivo_dias: int, prazo_referencia_em: string, data_entrega_prevista: string|null}
     */
    public function previsaoEntrega(
        Empresa $empresa,
        int $prazoEntregaDias,
        CarbonInterface $referencia,
        bool $facaNova = false,
        ?int $prazoFacaDias = null,
    ): array {
        $efetivo = $this->prazoEfetivoDias($prazoEntregaDias, $facaNova, $prazoFacaDias);
        $ref = Carbon::parse($referencia)->startOfDay();

        return [
            'prazo_efetivo_dias' => $efetivo,
            'prazo_referencia_em' => $ref->toDateString(),
            'data_entrega_prevista' => $efetivo > 0
                ? $this->addBusinessDays($ref, $efetivo, $empresa)->toDateString()
                : null,
        ];
    }

    /**
     * @return array{prazo_efetivo_dias: int, prazo_referencia_em: string, data_entrega_prevista: string|null}
     */
    public function previsaoParaOrcamento(Orcamento $orcamento, ?CarbonInterface $referenciaOverride = null): array
    {
        $empresa = $this->resolveEmpresa($orcamento->empresa_id, $orcamento->relationLoaded('empresa') ? $orcamento->empresa : null);
        if (! $empresa) {
            return $this->previsaoVazia($orcamento->prazo_entrega_dias);
        }

        $input = is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [];
        $result = is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [];
        $facaNova = (bool) ($result['faca_nova'] ?? $input['faca_nova'] ?? false);
        $prazoFaca = isset($result['prazo_faca_dias'])
            ? (int) $result['prazo_faca_dias']
            : (isset($input['prazo_faca_dias']) ? (int) $input['prazo_faca_dias'] : null);

        $referencia = $referenciaOverride ?? $this->referenciaOrcamento($orcamento);

        return $this->previsaoEntrega(
            $empresa,
            (int) $orcamento->prazo_entrega_dias,
            $referencia,
            $facaNova,
            $prazoFaca,
        );
    }

    /**
     * @return array{prazo_efetivo_dias: int, prazo_referencia_em: string, data_entrega_prevista: string|null}
     */
    public function previsaoParaPedido(Pedido $pedido): array
    {
        $pedido->loadMissing(['orcamento', 'empresa']);
        $empresa = $this->resolveEmpresa($pedido->empresa_id, $pedido->empresa);
        if (! $empresa || $pedido->prazo_entrega_dias === null) {
            return $this->previsaoVazia((int) ($pedido->prazo_entrega_dias ?? 0));
        }

        $orcamento = $pedido->orcamento;
        $input = $orcamento && is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [];
        $result = $orcamento && is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [];
        $facaNova = (bool) ($result['faca_nova'] ?? $input['faca_nova'] ?? false);
        $prazoFaca = isset($result['prazo_faca_dias'])
            ? (int) $result['prazo_faca_dias']
            : (isset($input['prazo_faca_dias']) ? (int) $input['prazo_faca_dias'] : null);

        $referencia = $orcamento?->decidido_em ?? $pedido->created_at ?? now();

        return $this->previsaoEntrega(
            $empresa,
            (int) $pedido->prazo_entrega_dias,
            $referencia,
            $facaNova,
            $prazoFaca,
        );
    }

    public function referenciaOrcamento(Orcamento $orcamento): CarbonInterface
    {
        if ($orcamento->decidido_em) {
            return $orcamento->decidido_em->copy()->startOfDay();
        }

        if ($orcamento->created_at) {
            return $orcamento->created_at->copy()->startOfDay();
        }

        return now()->startOfDay();
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $result
     * @return array{prazo_efetivo_dias: int, prazo_referencia_em: string, data_entrega_prevista: string|null}
     */
    public function previsaoPreview(
        Empresa $empresa,
        array $input,
        array $result,
        ?CarbonInterface $referencia = null,
    ): array {
        $facaNova = (bool) ($result['faca_nova'] ?? $input['faca_nova'] ?? false);
        $prazoFaca = isset($result['prazo_faca_dias'])
            ? (int) $result['prazo_faca_dias']
            : (isset($input['prazo_faca_dias']) ? (int) $input['prazo_faca_dias'] : null);

        return $this->previsaoEntrega(
            $empresa,
            (int) ($input['prazo_entrega_dias'] ?? 12),
            $referencia ?? now()->startOfDay(),
            $facaNova,
            $prazoFaca,
        );
    }

    /** @return list<Feriado> */
    private function feriadosAtivos(Empresa $empresa): array
    {
        $id = $empresa->id;
        if (! isset($this->feriadosCache[$id])) {
            $this->feriadosCache[$id] = Feriado::query()
                ->where('empresa_id', $id)
                ->where('ativo', true)
                ->get()
                ->all();
        }

        return $this->feriadosCache[$id];
    }

    private function feriadoCoincide(Feriado $feriado, CarbonInterface $date): bool
    {
        $data = Carbon::parse($feriado->data);

        if ($feriado->recorrente_anual) {
            return (int) $data->month === (int) $date->month
                && (int) $data->day === (int) $date->day;
        }

        return $data->toDateString() === Carbon::parse($date)->toDateString();
    }

    private function resolveEmpresa(int $empresaId, ?Empresa $loaded): ?Empresa
    {
        if ($loaded instanceof Empresa) {
            return $loaded;
        }

        return Empresa::query()->find($empresaId);
    }

    /**
     * @return array{prazo_efetivo_dias: int, prazo_referencia_em: string, data_entrega_prevista: null}
     */
    private function previsaoVazia(int $prazoEntregaDias): array
    {
        return [
            'prazo_efetivo_dias' => max(0, $prazoEntregaDias),
            'prazo_referencia_em' => now()->toDateString(),
            'data_entrega_prevista' => null,
        ];
    }
}
