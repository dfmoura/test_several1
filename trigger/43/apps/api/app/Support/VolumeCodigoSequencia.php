<?php

namespace App\Support;

/**
 * Código / nLote de volume novo no ajuste (abertura VIR- / entrada AJU- e nLote informado).
 *
 * O próximo código segue o número final do registro de origem, com o mesmo
 * preenchimento de zeros. Código sem número no fim segue como {código}-2, -3…
 * A cauda numérica cabe em 60 caracteres; o prefixo é que encurta.
 *
 * O sufixo #2/#3 do recebimento (várias bobinas com o mesmo nLote do fornecedor)
 * não entra aqui.
 */
final class VolumeCodigoSequencia
{
    public const MAX = 60;

    public static function canonico(string $prefixo, string $sku, int $n): string
    {
        $n = max(1, $n);

        return self::limitar($prefixo.'-'.$sku.'-', (string) $n);
    }

    /**
     * Devolve $desejado se estiver livre; senão o próximo da mesma sequência.
     *
     * @param  list<string>  $ocupados
     */
    public static function reservar(string $desejado, array $ocupados): string
    {
        $base = trim($desejado);
        if ($base === '') {
            throw new \InvalidArgumentException('Código desejado vazio.');
        }

        $limitado = mb_substr($base, 0, self::MAX);
        if (! self::ocupado($limitado, $ocupados)) {
            return $limitado;
        }

        return self::proximo($limitado, $ocupados);
    }

    /**
     * Próximo código depois de $base, pulando os ocupados.
     *
     * @param  list<string>  $ocupados
     */
    public static function proximo(string $base, array $ocupados): string
    {
        $src = trim($base);
        if ($src === '') {
            throw new \InvalidArgumentException('Código base vazio.');
        }

        if (preg_match('/^(.*?)(\d+)$/u', $src, $m) === 1) {
            $prefixo = $m[1];
            $largura = strlen($m[2]);
            $n = (int) $m[2] + 1;
            if ($n < 1) {
                $n = 1;
            }

            for ($i = 0; $i < 10000; $i++) {
                $cauda = str_pad((string) $n, $largura, '0', STR_PAD_LEFT);
                $candidato = self::limitar($prefixo, $cauda);
                if (! self::ocupado($candidato, $ocupados)) {
                    return $candidato;
                }
                $n++;
            }
        } else {
            for ($n = 2; $n < 10000; $n++) {
                $candidato = self::limitar($src, '-'.$n);
                if (! self::ocupado($candidato, $ocupados)) {
                    return $candidato;
                }
            }
        }

        throw new \RuntimeException('Não foi possível gerar código sequencial de volume.');
    }

    /**
     * @param  list<string>  $ocupados
     */
    private static function ocupado(string $codigo, array $ocupados): bool
    {
        $alvo = mb_strtoupper($codigo);
        foreach ($ocupados as $item) {
            if (mb_strtoupper(trim((string) $item)) === $alvo) {
                return true;
            }
        }

        return false;
    }

    /** Encurta o prefixo e conserva a cauda (o número da sequência). */
    private static function limitar(string $prefixo, string $cauda): string
    {
        $caudaLen = mb_strlen($cauda);
        if ($caudaLen >= self::MAX) {
            return mb_substr($cauda, 0, self::MAX);
        }

        return mb_substr($prefixo, 0, self::MAX - $caudaLen).$cauda;
    }
}
