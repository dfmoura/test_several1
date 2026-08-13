<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

/**
 * Composição operacional dos modelos (artes) do ORC.
 *
 * O motor de preço usa apenas o escalar `modelos` (setup/perda).
 * Esta composição (nome + % da quantidade) viaja no input_snapshot
 * para PED/OP futuros: q_i = política(Q × pct_i/100), resto no último.
 */
final class ModelosComposicao
{
    public const TOLERANCIA_SOMA = 0.01;

    /**
     * Garante `modelos_composicao` coerente com `modelos`.
     * Ausente → equal-split legado (API/testes). Presente → valida estritamente.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function ensureInPayload(array $data): array
    {
        $n = max(1, (int) ($data['modelos'] ?? 1));
        $data['modelos'] = $n;

        $raw = $data['modelos_composicao'] ?? null;
        if ($raw === null || $raw === [] || ! is_array($raw)) {
            $data['modelos_composicao'] = self::equalSplit($n);

            return $data;
        }

        $data['modelos_composicao'] = self::normalizeAndAssert($raw, $n);

        return $data;
    }

    /**
     * @param  array<int, mixed>  $raw
     * @return list<array{ordem: int, nome: string, percentual: float}>
     */
    public static function normalizeAndAssert(array $raw, int $modelos): array
    {
        if (count($raw) !== $modelos) {
            throw ValidationException::withMessages([
                'modelos_composicao' => [
                    "Informe exatamente {$modelos} modelo(s) na composição (um por arte).",
                ],
            ]);
        }

        $out = [];
        $soma = 0.0;

        foreach (array_values($raw) as $i => $row) {
            if (! is_array($row)) {
                throw ValidationException::withMessages([
                    'modelos_composicao' => ['Cada modelo deve ter nome e percentual.'],
                ]);
            }

            $nome = trim((string) ($row['nome'] ?? ''));
            if ($nome === '') {
                throw ValidationException::withMessages([
                    "modelos_composicao.{$i}.nome" => ['Informe o nome/identificação do modelo (arte).'],
                ]);
            }
            if (mb_strlen($nome) > 120) {
                throw ValidationException::withMessages([
                    "modelos_composicao.{$i}.nome" => ['Nome do modelo: máximo 120 caracteres.'],
                ]);
            }

            $pct = round((float) ($row['percentual'] ?? 0), 4);
            if ($pct <= 0 || $pct > 100) {
                throw ValidationException::withMessages([
                    "modelos_composicao.{$i}.percentual" => [
                        'Percentual de cada modelo deve ser > 0 e ≤ 100.',
                    ],
                ]);
            }

            $soma += $pct;
            $out[] = [
                'ordem' => $i + 1,
                'nome' => $nome,
                'percentual' => $pct,
            ];
        }

        if (abs($soma - 100.0) > self::TOLERANCIA_SOMA) {
            throw ValidationException::withMessages([
                'modelos_composicao' => [
                    sprintf(
                        'A soma dos percentuais dos modelos deve ser 100%% (atual: %s%%).',
                        rtrim(rtrim(number_format($soma, 4, '.', ''), '0'), '.')
                    ),
                ],
            ]);
        }

        // Corrige drift de arredondamento no último (mantém soma canônica 100).
        if (count($out) > 0 && abs($soma - 100.0) > 0) {
            $ajuste = 100.0 - ($soma - $out[count($out) - 1]['percentual']);
            $out[count($out) - 1]['percentual'] = round($ajuste, 4);
        }

        return $out;
    }

    /**
     * Equal-split sem nomes (legado / preview sem detalhe).
     *
     * @return list<array{ordem: int, nome: string, percentual: float}>
     */
    public static function equalSplit(int $modelos): array
    {
        $n = max(1, $modelos);
        $base = floor((10000 / $n)) / 100; // 2 casas
        $out = [];
        $acc = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $pct = $i === $n - 1 ? round(100.0 - $acc, 4) : $base;
            $acc += $pct;
            $out[] = [
                'ordem' => $i + 1,
                'nome' => '',
                'percentual' => $pct,
            ];
        }

        return $out;
    }

    /**
     * Aloca quantidade total por percentual; resto no último (soma = Q).
     * Uso futuro: PED/OP a partir do snapshot do ORC.
     *
     * @param  list<array{ordem?: int, nome?: string, percentual: float|int|string}>  $composicao
     * @return list<array{ordem: int, nome: string, percentual: float, quantidade: int}>
     */
    public static function alocarQuantidades(int $quantidadeTotal, array $composicao): array
    {
        $q = max(0, $quantidadeTotal);
        $rows = array_values($composicao);
        $n = count($rows);
        if ($n === 0) {
            return [];
        }

        $out = [];
        $alocado = 0;
        for ($i = 0; $i < $n; $i++) {
            $pct = (float) ($rows[$i]['percentual'] ?? 0);
            if ($i === $n - 1) {
                $qi = $q - $alocado;
            } else {
                $qi = (int) floor(($q * $pct / 100.0) + 1e-9);
                $alocado += $qi;
            }
            $out[] = [
                'ordem' => (int) ($rows[$i]['ordem'] ?? $i + 1),
                'nome' => trim((string) ($rows[$i]['nome'] ?? '')),
                'percentual' => round($pct, 4),
                'quantidade' => max(0, $qi),
            ];
        }

        return $out;
    }
}
