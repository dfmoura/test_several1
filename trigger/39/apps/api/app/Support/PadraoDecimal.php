<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Padrão decimal oficial — PADRAO_DECIMAL_CALCULOS.txt (trigger/32, DOC-13).
 *
 * Regras de ouro aplicadas aqui:
 *  - nunca float em dinheiro/qtde/alíquota/fator
 *  - JSON/API trafega string canônica ("1234.560000")
 *  - arredondamento half-up (exceto retalho = floor)
 *  - rejeta excesso de casas (não trunca em silêncio)
 */
final class PadraoDecimal
{
    public const ROUND_HALF_UP = 'HALF_UP';

    public const ROUND_FLOOR = 'FLOOR';

    /** Modo global do sistema (§3.1). */
    public const ROUNDING_MODE = self::ROUND_HALF_UP;

    // --- Escalas oficiais (casas armazenadas) ---------------------------------

    /** Valor monetário final (totais, parcelas, impostos, limite). */
    public const SCALE_MONEY = 2;

    /** Preço/custo unitário (R$/m, R$/kg, preço tabela, custo médio). */
    public const SCALE_UNIT_PRICE = 6;

    /** Preço unitário NF-e (vUnCom). */
    public const SCALE_NF_UNIT = 10;

    /** Quantidade de estoque / estoque mínimo. */
    public const SCALE_QTY = 4;

    /** Alíquota / percentual (comissão, etc.). */
    public const SCALE_PERCENT = 4;

    /** Fator de conversão de unidade. */
    public const SCALE_FACTOR = 10;

    /** Gramatura (g/m²). */
    public const SCALE_GRAMATURA = 2;

    /** Largura (mm) / comprimento (m). */
    public const SCALE_DIM = 2;

    /** Peso (kg). */
    public const SCALE_WEIGHT = 3;

    /** Espessura (mm). */
    public const SCALE_THICKNESS = 4;

    // --- Precisões NUMERIC(p,s) ----------------------------------------------

    public const PRECISION_MONEY = 15;

    public const PRECISION_UNIT_PRICE = 19;

    public const PRECISION_NF_UNIT = 21;

    public const PRECISION_QTY = 15;

    public const PRECISION_PERCENT = 7;

    public const PRECISION_FACTOR = 19;

    public const PRECISION_GRAMATURA = 9;

    public const PRECISION_DIM = 9;

    public const PRECISION_WEIGHT = 12;

    public const PRECISION_THICKNESS = 9;

    /**
     * Campos de produto → escala (§2).
     *
     * @return array<string, int>
     */
    public static function produtoFieldScales(): array
    {
        return [
            'fator_conversao' => self::SCALE_FACTOR,
            'preco_tabela' => self::SCALE_UNIT_PRICE,
            'custo_medio' => self::SCALE_UNIT_PRICE,
            'estoque_minimo' => self::SCALE_QTY,
        ];
    }

    /**
     * Atributos dimensionais (JSON) → escala.
     *
     * @return array<string, int>
     */
    public static function produtoAtributoScales(): array
    {
        return [
            'largura_mm' => self::SCALE_DIM,
            'comprimento_m' => self::SCALE_DIM,
            'gramatura_g_m2' => self::SCALE_GRAMATURA,
        ];
    }

    /**
     * Campos de parceiro → escala.
     *
     * @return array<string, int>
     */
    public static function parceiroFieldScales(): array
    {
        return [
            'limite_credito' => self::SCALE_MONEY,
            'credito_utilizado' => self::SCALE_MONEY,
            'comissao_percentual' => self::SCALE_PERCENT,
        ];
    }

    /**
     * Converte entrada BR/canônica em string canônica com ponto decimal.
     * Retorna null se vazio. Lança se inválido/ambíguo (§9.4).
     */
    public static function parse(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_int($value)) {
            return (string) $value;
        }

        if (is_float($value)) {
            throw new InvalidArgumentException(
                'Valor decimal recebido como float binário — envie string canônica.'
            );
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        $raw = preg_replace('/\s+/u', '', $raw) ?? $raw;
        $raw = preg_replace('/^R\$/i', '', $raw) ?? $raw;
        $raw = str_replace('%', '', $raw);

        if ($raw === '' || $raw === '-' || $raw === '+' || $raw === '.') {
            throw new InvalidArgumentException('Valor decimal inválido.');
        }

        $negative = false;
        if (str_starts_with($raw, '+')) {
            $raw = substr($raw, 1);
        } elseif (str_starts_with($raw, '-')) {
            $negative = true;
            $raw = substr($raw, 1);
        }

        $hasComma = str_contains($raw, ',');
        $hasDot = str_contains($raw, '.');

        if ($hasComma && $hasDot) {
            $lastComma = strrpos($raw, ',');
            $lastDot = strrpos($raw, '.');
            if ($lastComma > $lastDot) {
                // Brasileiro: 1.234,56
                if (substr_count($raw, ',') !== 1) {
                    throw new InvalidArgumentException('Formato decimal ambíguo.');
                }
                $intPart = str_replace('.', '', substr($raw, 0, $lastComma));
                $fracPart = substr($raw, $lastComma + 1);
                if ($intPart === '' || ! ctype_digit($intPart) || ! ctype_digit($fracPart)) {
                    throw new InvalidArgumentException('Formato decimal inválido.');
                }
                $canonical = $intPart.'.'.$fracPart;
            } else {
                // Anglo: 1,234.56
                if (substr_count($raw, '.') !== 1) {
                    throw new InvalidArgumentException('Formato decimal ambíguo.');
                }
                $intPart = str_replace(',', '', substr($raw, 0, $lastDot));
                $fracPart = substr($raw, $lastDot + 1);
                if ($intPart === '' || ! ctype_digit($intPart) || ! ctype_digit($fracPart)) {
                    throw new InvalidArgumentException('Formato decimal inválido.');
                }
                $canonical = $intPart.'.'.$fracPart;
            }
        } elseif ($hasComma) {
            // Só vírgula = decimal BR (§9.4)
            if (substr_count($raw, ',') !== 1) {
                throw new InvalidArgumentException('Formato decimal ambíguo.');
            }
            [$intPart, $fracPart] = explode(',', $raw, 2);
            if ($intPart === '' || ! ctype_digit($intPart) || ($fracPart !== '' && ! ctype_digit($fracPart))) {
                throw new InvalidArgumentException('Formato decimal inválido.');
            }
            $canonical = $intPart.($fracPart === '' ? '' : '.'.$fracPart);
        } elseif ($hasDot) {
            // Só ponto = canônico (armazenamento/API)
            if (substr_count($raw, '.') !== 1) {
                throw new InvalidArgumentException('Formato decimal ambíguo.');
            }
            [$intPart, $fracPart] = explode('.', $raw, 2);
            if ($intPart === '' || ! ctype_digit($intPart) || ($fracPart !== '' && ! ctype_digit($fracPart))) {
                throw new InvalidArgumentException('Formato decimal inválido.');
            }
            $canonical = $intPart.($fracPart === '' ? '' : '.'.$fracPart);
        } else {
            if (! ctype_digit($raw)) {
                throw new InvalidArgumentException('Formato decimal inválido.');
            }
            $canonical = $raw;
        }

        // Normaliza zeros à esquerda (mantém "0.x")
        if (str_contains($canonical, '.')) {
            [$i, $f] = explode('.', $canonical, 2);
            $i = ltrim($i, '0');
            $canonical = ($i === '' ? '0' : $i).'.'.$f;
        } else {
            $canonical = ltrim($canonical, '0');
            if ($canonical === '') {
                $canonical = '0';
            }
        }

        $isZero = $canonical === '0' || (bool) preg_match('/^0\.0+$/', $canonical);
        if ($isZero) {
            return '0';
        }

        return $negative ? '-'.$canonical : $canonical;
    }

    /**
     * Parse + valida escala (rejeita excesso de casas — §8.3).
     * Não arredonda na digitação.
     */
    public static function parseStrict(mixed $value, int $scale): ?string
    {
        $canonical = self::parse($value);
        if ($canonical === null) {
            return null;
        }

        if (! self::hasValidScale($canonical, $scale)) {
            throw new InvalidArgumentException(
                "Máximo de {$scale} casas decimais (PADRAO_DECIMAL §8.3)."
            );
        }

        return $canonical;
    }

    public static function hasValidScale(string $canonical, int $scale): bool
    {
        if (! str_contains($canonical, '.')) {
            return true;
        }

        $frac = explode('.', $canonical, 2)[1];

        return strlen($frac) <= $scale;
    }

    /**
     * Arredondamento half-up (§3.1) — único modo padrão do sistema.
     */
    public static function roundHalfUp(string $canonical, int $scale): string
    {
        if (! extension_loaded('bcmath')) {
            throw new InvalidArgumentException('extensão bcmath é obrigatória para aritmética decimal.');
        }

        $negative = str_starts_with($canonical, '-');
        $abs = $negative ? substr($canonical, 1) : $canonical;
        $factor = '0.'.str_repeat('0', $scale).'5';
        $rounded = bcadd($abs, $factor, $scale);

        if ($negative && bccomp($rounded, '0', $scale) !== 0) {
            return '-'.$rounded;
        }

        return $rounded;
    }

    /**
     * Arredondamento para baixo — somente estimativa de retalho (§3 / §7).
     */
    public static function roundFloor(string $canonical, int $scale): string
    {
        if (! extension_loaded('bcmath')) {
            throw new InvalidArgumentException('extensão bcmath é obrigatória para aritmética decimal.');
        }

        $truncated = bcadd($canonical, '0', $scale);
        if (! str_starts_with($canonical, '-')) {
            return $truncated;
        }

        // Floor de negativo: se houve truncamento, afasta mais um passo da escala.
        if (bccomp($canonical, $truncated, max($scale + 8, 12)) !== 0) {
            $step = $scale === 0
                ? '1'
                : '0.'.str_repeat('0', $scale - 1).'1';

            return bcsub($truncated, $step, $scale);
        }

        return $truncated;
    }

    /**
     * Regra Laravel: aceita BR/canônico, rejeita excesso de casas.
     *
     * @return list<\Closure|string>
     */
    public static function rules(int $scale, bool $nullable = true): array
    {
        $rules = [];
        if ($nullable) {
            $rules[] = 'nullable';
        }

        $rules[] = function (string $attribute, mixed $value, \Closure $fail) use ($scale): void {
            if ($value === null || $value === '') {
                return;
            }

            try {
                self::parseStrict($value, $scale);
            } catch (InvalidArgumentException $e) {
                $fail($e->getMessage());
            }
        };

        return $rules;
    }

    /**
     * Canoniza campos decimais de um payload (string com ponto, sem milhar).
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, int>  $fieldScales
     * @return array<string, mixed>
     */
    public static function canonicalizeFields(array $data, array $fieldScales): array
    {
        foreach ($fieldScales as $field => $scale) {
            if (! array_key_exists($field, $data)) {
                continue;
            }

            $value = $data[$field];
            if ($value === null || $value === '') {
                $data[$field] = null;

                continue;
            }

            $data[$field] = self::parseStrict($value, $scale);
        }

        return $data;
    }

    /**
     * Canoniza atributos dimensionais do produto (JSON como string decimal).
     *
     * @param  array<string, mixed>|null  $atributos
     * @return array<string, mixed>|null
     */
    public static function canonicalizeProdutoAtributos(?array $atributos): ?array
    {
        if ($atributos === null) {
            return null;
        }

        $scales = self::produtoAtributoScales();
        foreach ($scales as $field => $scale) {
            if (! array_key_exists($field, $atributos)) {
                continue;
            }
            $value = $atributos[$field];
            if ($value === null || $value === '') {
                unset($atributos[$field]);

                continue;
            }
            $atributos[$field] = self::parseStrict($value, $scale);
        }

        return $atributos;
    }
}
