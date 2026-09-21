<?php

namespace App\Support;

use App\Support\ArteModeloUrl;
use Illuminate\Validation\ValidationException;

/**
 * Composição operacional dos modelos (artes) do ORC.
 *
 * O motor de preço usa apenas o escalar `modelos` (setup/perda).
 * Esta composição (nome + % da quantidade + valor_arte cotado + arte_url opcional)
 * viaja no input_snapshot para PED/OP: q_i = política(Q × pct_i/100), resto no último.
 * Σ valor_arte entra no total comercial pós-motor (como faca nova) — não em R1–R20.
 * arte_url é só visualização (http(s) ou orc-arte:…) — fora do motor.
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
     * @return list<array{ordem: int, nome: string, percentual: float, valor_arte: float, arte_url: ?string}>
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

            $valorArte = round(max(0.0, (float) ($row['valor_arte'] ?? 0)), 2);
            $arteUrl = ArteModeloUrl::normalize($row['arte_url'] ?? null);
            if (($row['arte_url'] ?? null) !== null && trim((string) $row['arte_url']) !== '' && $arteUrl === null) {
                throw ValidationException::withMessages([
                    "modelos_composicao.{$i}.arte_url" => [
                        'Arte do modelo: use http(s) ou arquivo enviado pelo sistema.',
                    ],
                ]);
            }

            $soma += $pct;
            $out[] = [
                'ordem' => $i + 1,
                'nome' => $nome,
                'percentual' => $pct,
                'valor_arte' => $valorArte,
                'arte_url' => $arteUrl,
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
     * @return list<array{ordem: int, nome: string, percentual: float, valor_arte: float, arte_url: ?string}>
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
                'valor_arte' => 0.0,
                'arte_url' => null,
            ];
        }

        return $out;
    }

    /**
     * Soma comercial das artes cotadas (add-on pós-motor; não entra em R1–R20).
     *
     * @param  list<array{valor_arte?: float|int|string|null}>|mixed  $composicao
     */
    public static function somaValorArte(mixed $composicao): float
    {
        if (! is_array($composicao) || $composicao === []) {
            return 0.0;
        }

        $soma = 0.0;
        foreach ($composicao as $row) {
            if (! is_array($row)) {
                continue;
            }
            $soma += max(0.0, (float) ($row['valor_arte'] ?? 0));
        }

        return round($soma, 2);
    }

    /**
     * Aloca quantidade total por percentual; resto no último (soma = Q).
     * Uso futuro: PED/OP a partir do snapshot do ORC.
     *
     * @param  list<array{ordem?: int, nome?: string, percentual: float|int|string, valor_arte?: float|int|string, arte_url?: string|null}>  $composicao
     * @return list<array{ordem: int, nome: string, percentual: float, valor_arte: float, arte_url: ?string, quantidade: int}>
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
                'valor_arte' => round(max(0.0, (float) ($rows[$i]['valor_arte'] ?? 0)), 2),
                'arte_url' => ArteModeloUrl::normalize($rows[$i]['arte_url'] ?? null),
                'quantidade' => max(0, $qi),
            ];
        }

        return $out;
    }
}
