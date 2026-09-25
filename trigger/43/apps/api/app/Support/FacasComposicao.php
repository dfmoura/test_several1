<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

/**
 * Composição operacional das facas do item (etiqueta sob medida).
 *
 * Escrita nova: 0..1 faca por item. Motor = uma geometria.
 * Leitura / FAT / ORC legado: 1 principal + extras opcionais (não cresce).
 *
 * @see docs/ADR_ORC_FACAS_COMPOSICAO.md · docs/ADR_ORC_ITENS.md
 */
final class FacasComposicao
{
    public const MAX_FACAS = 20;

    /** Teto de escrita para Etiqueta sob medida. */
    public const MAX_FACAS_ETIQUETA = 1;

    public static function tetoEscrita(int $existentes = 0): int
    {
        return max(self::MAX_FACAS_ETIQUETA, min(self::MAX_FACAS, $existentes));
    }

    /**
     * Recusa empilhar facas em item novo. Legado com extras: não cresce.
     *
     * @param  array<string, mixed>  $data
     */
    public static function assertTetoEscrita(array $data, int $max): void
    {
        if (TipoOperacaoSaida::isServico($data['tipo_operacao'] ?? $data['necessidade'] ?? null)
            || \App\Models\PedidoItem::isRevenda($data['necessidade'] ?? null)) {
            return;
        }

        $facas = $data['facas'] ?? [];
        if (! is_array($facas) || count($facas) <= $max) {
            return;
        }

        throw ValidationException::withMessages([
            'facas' => ['Etiqueta sob medida admite uma faca por item. Outra geometria = outro item.'],
        ]);
    }

    /**
     * Garante `facas` coerente e projeta escalares legado.
     * Ausente → sintetiza 0..1 do legado. Presente (incl. []) → valida.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function ensureInPayload(array $data): array
    {
        if (TipoOperacaoSaida::isServico($data['tipo_operacao'] ?? $data['necessidade'] ?? null)
            || \App\Models\PedidoItem::isRevenda($data['necessidade'] ?? null)) {
            $data['facas'] = [];
            $data['faca_nova'] = false;
            $data['valor_faca_nova'] = 0.0;
            $data['prazo_faca_dias'] = null;
            $data['formato_faca'] = null;

            return $data;
        }

        $raw = $data['facas'] ?? null;
        if ($raw === null) {
            $data['facas'] = self::fromLegacyScalars($data);
        } elseif (! is_array($raw)) {
            throw ValidationException::withMessages([
                'facas' => ['Lista de facas inválida.'],
            ]);
        } else {
            $data['facas'] = self::normalizeAndAssert($raw);
        }

        return self::projectToLegacyScalars($data);
    }

    /**
     * @param  array<int, mixed>  $raw
     * @return list<array<string, mixed>>
     */
    public static function normalizeAndAssert(array $raw): array
    {
        $rows = array_values($raw);
        if (count($rows) > self::MAX_FACAS) {
            throw ValidationException::withMessages([
                'facas' => ['Informe no máximo '.self::MAX_FACAS.' facas no orçamento.'],
            ]);
        }

        if ($rows === []) {
            return [];
        }

        $out = [];
        $principais = 0;

        foreach ($rows as $i => $row) {
            if (! is_array($row)) {
                throw ValidationException::withMessages([
                    "facas.{$i}" => ['Cada faca deve ser um objeto.'],
                ]);
            }

            $principal = (bool) ($row['principal'] ?? false);
            if ($principal) {
                $principais++;
            }

            $formato = trim((string) ($row['formato'] ?? $row['formato_faca'] ?? ''));
            $medida = trim((string) ($row['medida'] ?? ''));
            $facaNova = (bool) ($row['faca_nova'] ?? false);
            $label = trim((string) ($row['label'] ?? ''));

            if ($formato === '' && $medida === '' && ! $facaNova && $label === '') {
                throw ValidationException::withMessages([
                    "facas.{$i}" => ['Informe formato, medida ou identifique a faca.'],
                ]);
            }

            if (mb_strlen($formato) > 64) {
                throw ValidationException::withMessages([
                    "facas.{$i}.formato" => ['Formato: máximo 64 caracteres.'],
                ]);
            }
            if (mb_strlen($medida) > 64) {
                throw ValidationException::withMessages([
                    "facas.{$i}.medida" => ['Medida: máximo 64 caracteres.'],
                ]);
            }
            if (mb_strlen($label) > 120) {
                throw ValidationException::withMessages([
                    "facas.{$i}.label" => ['Rótulo: máximo 120 caracteres.'],
                ]);
            }

            $valor = round(max(0.0, (float) ($row['valor_faca'] ?? $row['valor_faca_nova'] ?? 0)), 2);
            $prazo = null;
            if (array_key_exists('prazo_faca_dias', $row) && $row['prazo_faca_dias'] !== null && $row['prazo_faca_dias'] !== '') {
                $prazo = max(0, min(365, (int) $row['prazo_faca_dias']));
            }

            $mapaId = null;
            if (isset($row['mapa_faca_id']) && $row['mapa_faca_id'] !== '' && $row['mapa_faca_id'] !== null) {
                $mapaId = (int) $row['mapa_faca_id'];
                if ($mapaId <= 0) {
                    $mapaId = null;
                }
            }

            $nFacas = null;
            if (isset($row['n_facas']) && $row['n_facas'] !== '' && $row['n_facas'] !== null) {
                $nFacas = (int) $row['n_facas'];
            }

            $posicao = null;
            if (isset($row['posicao']) && $row['posicao'] !== '' && $row['posicao'] !== null) {
                $posicao = FacaPosicao::normalize($row['posicao']);
            }

            $out[] = [
                'ordem' => $i + 1,
                'principal' => $principal,
                'mapa_faca_id' => $mapaId,
                'n_facas' => $nFacas,
                'label' => $label !== '' ? $label : null,
                'medida' => $medida !== '' ? $medida : null,
                'formato' => $formato !== '' ? $formato : null,
                'puxada_cm' => self::nullableFloat($row['puxada_cm'] ?? $row['puxada'] ?? null),
                'largura_cm' => self::nullableFloat($row['largura_cm'] ?? $row['largura_faca'] ?? null),
                'z' => self::nullableFloat($row['z'] ?? null, allowZero: true),
                'maquina' => self::nullIfEmpty($row['maquina'] ?? $row['maquina_catalogo'] ?? null),
                'colunas_mapa' => self::nullIfEmpty($row['colunas_mapa'] ?? $row['faca_colunas_mapa'] ?? null),
                'posicao' => $posicao,
                'contorno_svg' => self::nullIfEmpty($row['contorno_svg'] ?? $row['faca_contorno_svg'] ?? null),
                'diametro_cm' => self::nullableFloat($row['diametro_cm'] ?? $row['faca_diametro_cm'] ?? null),
                'tamanho_raw' => self::nullIfEmpty($row['tamanho_raw'] ?? $row['faca_tamanho_raw'] ?? null),
                'tamanho_tipo' => self::nullIfEmpty($row['tamanho_tipo'] ?? $row['faca_tamanho_tipo'] ?? null),
                'faca_nova' => $facaNova,
                'valor_faca' => $valor,
                'prazo_faca_dias' => $prazo,
            ];
        }

        if ($principais === 0) {
            $out[0]['principal'] = true;
        } elseif ($principais > 1) {
            throw ValidationException::withMessages([
                'facas' => ['Marque exatamente uma faca como principal (geometria do cálculo).'],
            ]);
        }

        return $out;
    }

    /**
     * Sintetiza 0..1 item a partir dos escalares legado (ORCs antigos / API sem `facas`).
     *
     * @param  array<string, mixed>  $data
     * @return list<array<string, mixed>>
     */
    public static function fromLegacyScalars(array $data): array
    {
        $formato = trim((string) ($data['formato_faca'] ?? ''));
        $facaNova = (bool) ($data['faca_nova'] ?? false);
        $hasVisual = self::nullIfEmpty($data['faca_colunas_mapa'] ?? null) !== null
            || self::nullIfEmpty($data['faca_posicao'] ?? null) !== null
            || self::nullIfEmpty($data['faca_contorno_svg'] ?? null) !== null
            || self::nullableFloat($data['faca_diametro_cm'] ?? null) !== null
            || self::nullIfEmpty($data['faca_tamanho_raw'] ?? null) !== null
            || self::nullIfEmpty($data['faca_tamanho_tipo'] ?? null) !== null;

        if ($formato === '' && ! $facaNova && ! $hasVisual) {
            return [];
        }

        $valor = $facaNova ? round(max(0.0, (float) ($data['valor_faca_nova'] ?? 0)), 2) : 0.0;
        $prazo = null;
        if ($facaNova && isset($data['prazo_faca_dias']) && $data['prazo_faca_dias'] !== null && $data['prazo_faca_dias'] !== '') {
            $prazo = max(0, min(365, (int) $data['prazo_faca_dias']));
        }

        $posicao = null;
        if (isset($data['faca_posicao']) && $data['faca_posicao'] !== '' && $data['faca_posicao'] !== null) {
            $posicao = FacaPosicao::normalize($data['faca_posicao']);
        }

        return [[
            'ordem' => 1,
            'principal' => true,
            'mapa_faca_id' => null,
            'n_facas' => null,
            'label' => $facaNova ? 'Faca nova' : null,
            'medida' => self::nullIfEmpty($data['medida'] ?? null),
            'formato' => $formato !== '' ? $formato : ($facaNova ? 'RETA' : null),
            'puxada_cm' => self::nullableFloat($data['puxada_cm'] ?? null),
            'largura_cm' => self::nullableFloat($data['largura_cm'] ?? null),
            'z' => self::nullableFloat($data['z'] ?? null, allowZero: true),
            'maquina' => self::nullIfEmpty($data['maquina'] ?? null),
            'colunas_mapa' => self::nullIfEmpty($data['faca_colunas_mapa'] ?? null),
            'posicao' => $posicao,
            'contorno_svg' => self::nullIfEmpty($data['faca_contorno_svg'] ?? null),
            'diametro_cm' => self::nullableFloat($data['faca_diametro_cm'] ?? null),
            'tamanho_raw' => self::nullIfEmpty($data['faca_tamanho_raw'] ?? null),
            'tamanho_tipo' => self::nullIfEmpty($data['faca_tamanho_tipo'] ?? null),
            'faca_nova' => $facaNova,
            'valor_faca' => $valor,
            'prazo_faca_dias' => $prazo,
        ]];
    }

    /**
     * Projeta principal + Σ valores nos escalares legado (compat UI/FAT/proposta).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function projectToLegacyScalars(array $data): array
    {
        $facas = is_array($data['facas'] ?? null) ? $data['facas'] : [];
        $principal = self::principal($facas);
        $soma = self::somaValor($facas);
        $temNova = self::temFacaNova($facas);
        $prazo = self::prazoMaximo($facas);

        $data['valor_faca_nova'] = $soma;
        $data['faca_nova'] = $temNova || $soma > 0.0;
        $data['prazo_faca_dias'] = $prazo;

        if ($principal === null) {
            if ($facas === []) {
                $data['formato_faca'] = $data['formato_faca'] ?? null;
            }

            return $data;
        }

        if (($principal['formato'] ?? null) !== null) {
            $data['formato_faca'] = $principal['formato'];
        }
        $data['faca_colunas_mapa'] = $principal['colunas_mapa'] ?? null;
        $data['faca_posicao'] = $principal['posicao'] ?? null;
        $data['faca_contorno_svg'] = $principal['contorno_svg'] ?? null;
        $data['faca_diametro_cm'] = $principal['diametro_cm'] ?? null;
        $data['faca_tamanho_raw'] = $principal['tamanho_raw'] ?? null;
        $data['faca_tamanho_tipo'] = $principal['tamanho_tipo'] ?? null;

        // Geometria: principal preenche vazios; não apaga overrides já enviados no topo.
        if (self::blank($data['medida'] ?? null) && ($principal['medida'] ?? null) !== null) {
            $data['medida'] = $principal['medida'];
        }
        if (self::blank($data['puxada_cm'] ?? null) && ($principal['puxada_cm'] ?? null) !== null) {
            $data['puxada_cm'] = $principal['puxada_cm'];
        }
        if (self::blank($data['largura_cm'] ?? null) && ($principal['largura_cm'] ?? null) !== null) {
            $data['largura_cm'] = $principal['largura_cm'];
        }
        if (self::blank($data['z'] ?? null) && array_key_exists('z', $principal) && $principal['z'] !== null) {
            $data['z'] = $principal['z'];
        }
        if (self::blank($data['maquina'] ?? null) && ($principal['maquina'] ?? null) !== null) {
            $data['maquina'] = $principal['maquina'];
        }

        // Flag legado: true se alguma linha é "nova" OU há cobrança (FAT/proposta).
        $data['faca_nova'] = $temNova || $soma > 0.0;

        return $data;
    }

    /**
     * @param  list<array<string, mixed>>|mixed  $composicao
     */
    public static function somaValor(mixed $composicao): float
    {
        if (! is_array($composicao) || $composicao === []) {
            return 0.0;
        }

        $soma = 0.0;
        foreach ($composicao as $row) {
            if (! is_array($row)) {
                continue;
            }
            $soma += max(0.0, (float) ($row['valor_faca'] ?? $row['valor_faca_nova'] ?? 0));
        }

        return round($soma, 2);
    }

    /**
     * @param  list<array<string, mixed>>|mixed  $composicao
     */
    public static function temFacaNova(mixed $composicao): bool
    {
        if (! is_array($composicao)) {
            return false;
        }
        foreach ($composicao as $row) {
            if (is_array($row) && ! empty($row['faca_nova'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Faca escolhida de verdade (mapa ou nova) — não geometria do motor.
     * `facas: []` explícito = sem faca, salvo escalares legado (formato / nova).
     *
     * @param  array<string, mixed>  $input
     */
    public static function temFacaDeclarada(array $input): bool
    {
        $raw = $input['facas'] ?? null;
        if (is_array($raw)) {
            foreach ($raw as $row) {
                if (self::linhaDeclarada($row)) {
                    return true;
                }
            }

            return self::legadoDeclarado($input);
        }

        return self::fromLegacyScalars($input) !== [] || self::legadoDeclarado($input);
    }

    /**
     * @param  mixed  $row
     */
    private static function linhaDeclarada(mixed $row): bool
    {
        if (! is_array($row)) {
            return false;
        }
        if (! empty($row['faca_nova'])) {
            return true;
        }
        if ((int) ($row['mapa_faca_id'] ?? 0) > 0) {
            return true;
        }
        if (self::nullIfEmpty($row['formato'] ?? null) !== null) {
            return true;
        }
        if (self::nullIfEmpty($row['medida'] ?? null) !== null) {
            return true;
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private static function legadoDeclarado(array $input): bool
    {
        return ! empty($input['faca_nova'])
            || self::nullIfEmpty($input['formato_faca'] ?? null) !== null;
    }

    /**
     * @param  list<array<string, mixed>>|mixed  $composicao
     */
    public static function prazoMaximo(mixed $composicao): ?int
    {
        if (! is_array($composicao)) {
            return null;
        }
        $max = null;
        foreach ($composicao as $row) {
            if (! is_array($row)) {
                continue;
            }
            $valor = max(0.0, (float) ($row['valor_faca'] ?? 0));
            $nova = ! empty($row['faca_nova']);
            if ($valor <= 0 && ! $nova) {
                continue;
            }
            if (! isset($row['prazo_faca_dias']) || $row['prazo_faca_dias'] === null || $row['prazo_faca_dias'] === '') {
                continue;
            }
            $p = (int) $row['prazo_faca_dias'];
            $max = $max === null ? $p : max($max, $p);
        }

        return $max;
    }

    /**
     * @param  list<array<string, mixed>>|mixed  $composicao
     * @return array<string, mixed>|null
     */
    public static function principal(mixed $composicao): ?array
    {
        if (! is_array($composicao) || $composicao === []) {
            return null;
        }
        foreach ($composicao as $row) {
            if (is_array($row) && ! empty($row['principal'])) {
                return $row;
            }
        }
        $first = $composicao[0] ?? null;

        return is_array($first) ? $first : null;
    }

    /**
     * Rótulo comercial para linha de FAT / proposta.
     *
     * @param  array<string, mixed>  $row
     */
    public static function rotuloLinha(array $row, int $index = 0): string
    {
        $label = trim((string) ($row['label'] ?? ''));
        if ($label !== '') {
            return mb_substr($label, 0, 100);
        }
        $n = $row['n_facas'] ?? null;
        $formato = trim((string) ($row['formato'] ?? ''));
        $medida = trim((string) ($row['medida'] ?? ''));
        $parts = [];
        if ($n !== null && $n !== '') {
            $parts[] = 'N '.$n;
        }
        if ($formato !== '') {
            $parts[] = $formato;
        }
        if ($medida !== '') {
            $parts[] = $medida;
        }
        if ($parts !== []) {
            return mb_substr(implode(' · ', $parts), 0, 100);
        }
        if (! empty($row['faca_nova'])) {
            return 'Faca nova';
        }

        return 'faca '.((int) ($row['ordem'] ?? $index + 1));
    }

    private static function nullableFloat(mixed $v, bool $allowZero = false): ?float
    {
        if ($v === null || $v === '') {
            return null;
        }
        if (! is_numeric($v)) {
            return null;
        }
        $n = (float) $v;
        if ($allowZero) {
            return $n >= 0 ? $n : null;
        }

        return $n > 0 ? $n : null;
    }

    private static function nullIfEmpty(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

    private static function blank(mixed $value): bool
    {
        return $value === null || $value === '' || $value === false;
    }
}
