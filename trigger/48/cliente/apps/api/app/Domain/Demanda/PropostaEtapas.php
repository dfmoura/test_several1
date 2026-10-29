<?php

declare(strict_types=1);

namespace App\Domain\Demanda;

use App\Domain\RegraNegocio;

/**
 * Plano de entrega da proposta: etapas sequenciais que o cliente aprova junto com o escopo.
 * Não alteram o ledger — só o contrato e a narrativa de valor.
 */
final class PropostaEtapas
{
    public const MAXIMO = 8;

    /**
     * @param  mixed  $bruto
     * @return list<array{ordem: int, titulo: string, resultado: string, aceite: string}>
     */
    public static function normalizar(mixed $bruto): array
    {
        if ($bruto === null || $bruto === '' || $bruto === []) {
            return [];
        }
        if (! is_array($bruto)) {
            throw new RegraNegocio('O plano de etapas está em formato inválido.');
        }

        $saida = [];
        foreach (array_values($bruto) as $item) {
            if (! is_array($item)) {
                continue;
            }
            $titulo = trim((string) ($item['titulo'] ?? ''));
            $resultado = trim((string) ($item['resultado'] ?? ''));
            $aceite = trim((string) ($item['aceite'] ?? ''));
            if ($titulo === '' && $resultado === '' && $aceite === '') {
                continue;
            }
            if ($titulo === '') {
                throw new RegraNegocio('Cada etapa do plano precisa de um título.');
            }
            if (mb_strlen($titulo) > 160) {
                throw new RegraNegocio('O título de uma etapa passou de 160 caracteres.');
            }
            if (mb_strlen($resultado) > 800) {
                throw new RegraNegocio('O resultado de uma etapa passou de 800 caracteres.');
            }
            if (mb_strlen($aceite) > 800) {
                throw new RegraNegocio('O aceite de uma etapa passou de 800 caracteres.');
            }
            $saida[] = [
                'ordem' => count($saida) + 1,
                'titulo' => $titulo,
                'resultado' => $resultado,
                'aceite' => $aceite,
            ];
        }

        if (count($saida) > self::MAXIMO) {
            throw new RegraNegocio('O plano admite no máximo '.self::MAXIMO.' etapas.');
        }

        return $saida;
    }

    /**
     * @param  list<array{ordem?: int, titulo?: string, resultado?: string, aceite?: string}>|null  $etapas
     */
    public static function textoMarco(array $etapas): ?string
    {
        if ($etapas === []) {
            return null;
        }
        $linhas = [];
        foreach ($etapas as $etapa) {
            $ordem = (int) ($etapa['ordem'] ?? count($linhas) + 1);
            $titulo = trim((string) ($etapa['titulo'] ?? ''));
            if ($titulo === '') {
                continue;
            }
            $linhas[] = $ordem.'. '.$titulo;
        }

        return $linhas === [] ? null : 'Plano de entrega: '.implode(' · ', $linhas);
    }
}
