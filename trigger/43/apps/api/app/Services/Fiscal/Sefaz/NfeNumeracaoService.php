<?php

namespace App\Services\Fiscal\Sefaz;

use App\Models\Empresa;
use App\Models\NfeSerieControle;
use App\Services\Fiscal\FiscalSaidaDefaults;
use Illuminate\Support\Facades\DB;

/**
 * Reserva atômica de nNF por EMP + série. Stub local não consome.
 */
final class NfeNumeracaoService
{
    /**
     * @return array{serie: int, numero: int}
     */
    public function reservar(Empresa $empresa, ?int $serie = null): array
    {
        $serie = $serie ?? FiscalSaidaDefaults::SERIE_NFE;

        return DB::transaction(function () use ($empresa, $serie) {
            $row = NfeSerieControle::query()
                ->where('empresa_id', $empresa->id)
                ->where('serie', $serie)
                ->lockForUpdate()
                ->first();

            if ($row === null) {
                $row = NfeSerieControle::query()->create([
                    'empresa_id' => $empresa->id,
                    'serie' => $serie,
                    'ultimo_numero' => 0,
                ]);
                $row = NfeSerieControle::query()
                    ->where('id', $row->id)
                    ->lockForUpdate()
                    ->firstOrFail();
            }

            $row->ultimo_numero = (int) $row->ultimo_numero + 1;
            $row->save();

            return [
                'serie' => (int) $row->serie,
                'numero' => (int) $row->ultimo_numero,
            ];
        });
    }

    public function seedUltimo(Empresa $empresa, int $ultimoNumero, ?int $serie = null): void
    {
        $serie = $serie ?? FiscalSaidaDefaults::SERIE_NFE;
        NfeSerieControle::query()->updateOrCreate(
            ['empresa_id' => $empresa->id, 'serie' => $serie],
            ['ultimo_numero' => max(0, $ultimoNumero)]
        );
    }
}
