<?php

declare(strict_types=1);

namespace App\Domain\Cobranca;

use App\Models\CobrancaPix;

class FalsoProvedorPix implements ProvedorPix
{
    public function criar(CobrancaPix $cobranca): string
    {
        $valor = number_format($cobranca->valor_centavos / 100, 2, '.', '');

        return '00020126BR.GOV.BCB.PIX.LOCAL'.$cobranca->txid.'540'.$valor.'6304FAKE';
    }

    public function consultar(CobrancaPix $cobranca): ResultadoConsulta
    {
        return new ResultadoConsulta($cobranca->status, $cobranca->end_to_end_id, $cobranca->valor_centavos);
    }

    public function cancelar(CobrancaPix $cobranca): void
    {
    }
}
