<?php

declare(strict_types=1);

namespace App\Suporte;

use Carbon\Carbon;
use DateTimeInterface;

final class DiasUteis
{
    public static function somar(DateTimeInterface $inicio, int $dias): Carbon
    {
        $data = Carbon::parse($inicio)->timezone('America/Sao_Paulo');
        $andados = 0;
        while ($andados < $dias) {
            $data = $data->copy()->addDay();
            if ($data->isWeekend()) {
                continue;
            }
            $andados++;
        }

        return $data;
    }
}
