<?php

namespace App\Services\Fiscal;

/**
 * nVol da NF-e (grupo vol): numeração dos volumes, 1 a 60 caracteres.
 * Código interno da caixa (EMBPA-…-CX01) não entra concatenado: a 3ª caixa
 * passa de 60 e o corte deixa o código pela metade.
 */
final class NfeVolumeNumeracao
{
    public const MAX = 60;

    /**
     * @param  list<int>  $sequencias
     */
    public static function nVol(array $sequencias, int $caixas): string
    {
        $seqs = [];
        foreach ($sequencias as $sequencia) {
            $n = (int) $sequencia;
            if ($n >= 1) {
                $seqs[$n] = $n;
            }
        }
        $seqs = array_values($seqs);
        sort($seqs);

        if ($seqs !== []) {
            $ini = sprintf('CX%02d', $seqs[0]);
            $fim = sprintf('CX%02d', $seqs[count($seqs) - 1]);
            $faixa = $ini === $fim ? $ini : $ini.'-'.$fim;
            if (mb_strlen($faixa) <= self::MAX) {
                return $faixa;
            }
        }

        if ($caixas > 1) {
            return '1-'.$caixas;
        }

        return '1';
    }

    /**
     * Só entra no XML se couber no schema. Texto maior não é cortado no meio.
     */
    public static function paraXml(?string $numeracao): ?string
    {
        $texto = trim((string) $numeracao);
        if ($texto === '' || mb_strlen($texto) > self::MAX) {
            return null;
        }

        return $texto;
    }
}
