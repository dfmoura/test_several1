<?php

declare(strict_types=1);

namespace App\Domain\Demanda;

use App\Models\Demanda;
use App\Models\DemandaEvento;

class DemandaTransicao
{
    public function ir(Demanda $demanda, string $para, string $atorTipo, ?int $atorId, ?string $motivo = null): void
    {
        $de = $demanda->status;
        $demanda->status = $para;
        if (in_array($para, Demanda::TERMINAIS, true)) {
            $demanda->encerrada_em = now();
            $demanda->motivo = $motivo;
            $demanda->aguardando_cliente = false;
        }
        $demanda->save();

        DemandaEvento::query()->create([
            'demanda_id' => $demanda->id,
            'de_status' => $de,
            'para_status' => $para,
            'ator_tipo' => $atorTipo,
            'ator_id' => $atorId,
            'motivo' => $motivo,
            'em' => now(),
        ]);
    }
}
