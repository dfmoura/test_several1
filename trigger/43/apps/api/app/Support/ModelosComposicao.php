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

        if (array_key_exists('modelos_composicao_quantidades', $data)) {
            $data['modelos_composicao_quantidades'] = self::normalizeQuantidadesMatriz(
                $data['modelos_composicao_quantidades'] ?? null,
                is_array($data['faixas'] ?? null) ? $data['faixas'] : [],
                $n,
            );
            $data['modelos_composicao'] = self::syncPercentualReferencia(
                $data['modelos_composicao'],
                is_array($data['faixas'] ?? null) ? $data['faixas'] : [],
                $data['modelos_composicao_quantidades'],
            );
        }

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

    /**
     * Matriz [faixaIdx][modeloIdx] — quantidades inteiras independentes por escada.
     *
     * @param  list<array{quantidade?: int|float|string|null}>|mixed  $faixas
     * @return list<list<int>>
     */
    public static function normalizeQuantidadesMatriz(mixed $raw, array $faixas, int $modelos): array
    {
        $n = max(1, $modelos);
        $nFaixas = count($faixas);
        if ($nFaixas === 0) {
            return [];
        }

        if (! is_array($raw)) {
            throw ValidationException::withMessages([
                'modelos_composicao_quantidades' => ['Informe a matriz de quantidades por faixa.'],
            ]);
        }

        $out = [];
        for ($fi = 0; $fi < $nFaixas; $fi++) {
            $total = max(0, (int) floor((float) ($faixas[$fi]['quantidade'] ?? 0)));
            $row = $raw[$fi] ?? null;
            if (! is_array($row)) {
                throw ValidationException::withMessages([
                    "modelos_composicao_quantidades.{$fi}" => ['Informe as quantidades dos modelos nesta faixa.'],
                ]);
            }
            if (count($row) !== $n) {
                throw ValidationException::withMessages([
                    "modelos_composicao_quantidades.{$fi}" => ["Informe exatamente {$n} quantidade(s) nesta faixa."],
                ]);
            }

            $qs = [];
            for ($mi = 0; $mi < $n; $mi++) {
                $qs[] = max(0, (int) floor((float) ($row[$mi] ?? 0)));
            }
            $qs = self::reconciliarLinhaQuantidades($qs, $total);

            if ($total > 0) {
                $soma = array_sum($qs);
                if ($soma !== $total) {
                    throw ValidationException::withMessages([
                        "modelos_composicao_quantidades.{$fi}" => [
                            sprintf(
                                'Faixa %d: soma dos modelos (%d) difere do total (%d).',
                                $fi + 1,
                                $soma,
                                $total,
                            ),
                        ],
                    ]);
                }
                foreach ($qs as $mi => $q) {
                    if ($q <= 0) {
                        throw ValidationException::withMessages([
                            "modelos_composicao_quantidades.{$fi}.{$mi}" => [
                                sprintf('Modelo %d: quantidade deve ser > 0 na faixa %d.', $mi + 1, $fi + 1),
                            ],
                        ]);
                    }
                }
            }

            $out[] = $qs;
        }

        return $out;
    }

    /**
     * @param  list<int>  $quantidades
     * @return list<int>
     */
    public static function reconciliarLinhaQuantidades(array $quantidades, int $faixaTotal): array
    {
        $total = max(0, $faixaTotal);
        $n = count($quantidades);
        if ($n === 0) {
            return [];
        }
        if ($n === 1) {
            return [$total];
        }

        $qs = array_map(static fn ($q) => max(0, (int) $q), $quantidades);
        $sumEditaveis = array_sum(array_slice($qs, 0, $n - 1));
        $qs[$n - 1] = max(0, $total - $sumEditaveis);

        return $qs;
    }

    /**
     * % de referência (1ª faixa Q>0) — compatibilidade legada / PED.
     *
     * @param  list<array{ordem: int, nome: string, percentual: float, valor_arte: float, arte_url: ?string}>  $composicao
     * @param  list<array{quantidade?: int|float|string|null}>  $faixas
     * @param  list<list<int>>  $matriz
     * @return list<array{ordem: int, nome: string, percentual: float, valor_arte: float, arte_url: ?string}>
     */
    public static function syncPercentualReferencia(array $composicao, array $faixas, array $matriz): array
    {
        $n = count($composicao);
        if ($n === 0) {
            return $composicao;
        }

        foreach ($faixas as $fi => $faixa) {
            $total = max(0, (int) floor((float) ($faixa['quantidade'] ?? 0)));
            if ($total <= 0) {
                continue;
            }
            $row = $matriz[$fi] ?? null;
            if (! is_array($row) || count($row) !== $n) {
                continue;
            }

            $pcts = self::percentuaisFromQuantidades($row, $total);
            $out = [];
            foreach ($composicao as $i => $m) {
                $out[] = array_merge($m, ['percentual' => $pcts[$i] ?? $m['percentual']]);
            }

            return $out;
        }

        return $composicao;
    }

    /**
     * @param  list<int>  $quantidades
     * @return list<float>
     */
    public static function percentuaisFromQuantidades(array $quantidades, int $faixaTotal): array
    {
        $total = max(0, $faixaTotal);
        $n = count($quantidades);
        if ($n === 0) {
            return [];
        }
        if ($n === 1) {
            return [100.0];
        }

        $pcts = [];
        $acc = 0.0;
        for ($i = 0; $i < $n; $i++) {
            if ($i === $n - 1) {
                $pcts[] = round(100.0 - $acc, 4);
            } else {
                $q = max(0, (int) $quantidades[$i]);
                $pct = $total > 0 ? round($q / $total * 100, 4) : 0.0;
                $pcts[] = $pct;
                $acc += $pct;
            }
        }

        return $pcts;
    }

    /**
     * Quantidades alocadas para uma faixa — usa matriz quando presente.
     *
     * @param  list<array{ordem?: int, nome?: string, percentual: float|int|string, valor_arte?: float|int|string, arte_url?: string|null}>  $composicao
     * @param  list<list<int>>|null  $matriz
     * @return list<array{ordem: int, nome: string, percentual: float, valor_arte: float, arte_url: ?string, quantidade: int}>
     */
    public static function alocarQuantidadesFaixa(
        int $quantidadeTotal,
        array $composicao,
        ?array $matriz = null,
        ?int $faixaIdx = null,
    ): array {
        if ($matriz !== null && $faixaIdx !== null && isset($matriz[$faixaIdx])) {
            $row = $matriz[$faixaIdx];
            $n = count($composicao);
            if (is_array($row) && count($row) === $n) {
                $qs = self::reconciliarLinhaQuantidades($row, $quantidadeTotal);
                $out = [];
                foreach (array_values($composicao) as $i => $r) {
                    $out[] = [
                        'ordem' => (int) ($r['ordem'] ?? $i + 1),
                        'nome' => trim((string) ($r['nome'] ?? '')),
                        'percentual' => round((float) ($r['percentual'] ?? 0), 4),
                        'valor_arte' => round(max(0.0, (float) ($r['valor_arte'] ?? 0)), 2),
                        'arte_url' => ArteModeloUrl::normalize($r['arte_url'] ?? null),
                        'quantidade' => max(0, (int) ($qs[$i] ?? 0)),
                    ];
                }

                return $out;
            }
        }

        return self::alocarQuantidades($quantidadeTotal, $composicao);
    }
}
