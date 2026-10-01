<?php

namespace App\Services\Fiscal\Nfse;

use App\Models\Empresa;
use App\Models\NfseDpsControle;
use App\Services\Fiscal\FiscalSaidaDefaults;
use Illuminate\Support\Facades\DB;

/**
 * Reserva atômica de nDPS por empresa. O driver de teste não consome.
 */
final class NfseNumeracaoService
{
    /**
     * @return array{serie: int, numero: int}
     */
    public function reservar(Empresa $empresa, ?int $serie = null): array
    {
        $serie = $serie ?? FiscalSaidaDefaults::SERIE_DPS;

        return DB::transaction(function () use ($empresa, $serie) {
            $row = NfseDpsControle::query()
                ->where('empresa_id', $empresa->id)
                ->where('serie', $serie)
                ->lockForUpdate()
                ->first();

            if ($row === null) {
                $row = NfseDpsControle::query()->create([
                    'empresa_id' => $empresa->id,
                    'serie' => $serie,
                    'ultimo_numero' => 0,
                ]);
                $row = NfseDpsControle::query()->where('id', $row->id)->lockForUpdate()->firstOrFail();
            }

            $row->ultimo_numero = (int) $row->ultimo_numero + 1;
            $row->save();

            return [
                'serie' => (int) $row->serie,
                'numero' => (int) $row->ultimo_numero,
            ];
        });
    }
}
