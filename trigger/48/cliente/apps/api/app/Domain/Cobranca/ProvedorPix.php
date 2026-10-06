<?php

declare(strict_types=1);

namespace App\Domain\Cobranca;

use App\Models\CobrancaPix;

interface ProvedorPix
{
    public function criar(CobrancaPix $cobranca): string;

    public function consultar(CobrancaPix $cobranca): ResultadoConsulta;

    public function cancelar(CobrancaPix $cobranca): void;
}
