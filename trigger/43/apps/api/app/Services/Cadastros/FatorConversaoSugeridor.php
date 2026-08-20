<?php

namespace App\Services\Cadastros;

use App\Support\PadraoDecimal;
use InvalidArgumentException;

/**
 * Sugere fator_conversao a partir do par de unidades + atributos do SKU.
 *
 * Convenção (domínio 32 / CONVERSOES_UNIDADES_MEDIDA):
 *   1 × unidade_comercial  =  fator × unidade_interna
 *
 * Ex.: MIL→UN ⇒ 1000; KG→M2 ⇒ 1000/gramatura_g_m2.
 *
 * Nunca inventa fator sem dados — quando a fórmula exige atributo ausente,
 * devolve status "incompleto" com a lista do que falta (regra de ouro §12.10).
 */
class FatorConversaoSugeridor
{
    public const STATUS_IGUAL = 'igual';

    public const STATUS_SUGERIDO = 'sugerido';

    public const STATUS_INCOMPLETO = 'incompleto';

    public const STATUS_SEM_FORMULA = 'sem_formula';

    public const STATUS_INVALIDO = 'invalido';

    /**
     * @param  array<string, mixed>  $atributos  largura_mm, comprimento_m, gramatura_g_m2,
     *                                           qtd_por_caixa, densidade_g_ml, metragem_por_milheiro
     * @return array{
     *   status: string,
     *   fator: ?string,
     *   formula: ?string,
     *   origem: ?string,
     *   faltando: list<string>,
     *   mensagem: ?string,
     *   de: ?string,
     *   para: ?string
     * }
     */
    public function sugerir(?string $unidadeComercial, ?string $unidadeInterna, array $atributos = []): array
    {
        $de = $this->normUnit($unidadeComercial);
        $para = $this->normUnit($unidadeInterna);

        if ($de === null && $para === null) {
            return $this->result(self::STATUS_IGUAL, '1', 'unidades não definidas', 'default', [], null, $de, $para);
        }

        if ($de === null || $para === null) {
            return $this->result(
                self::STATUS_SEM_FORMULA,
                null,
                null,
                null,
                [],
                'Informe unidade comercial e unidade interna para sugerir o fator.',
                $de,
                $para
            );
        }

        if ($de === $para) {
            return $this->result(
                self::STATUS_IGUAL,
                '1',
                '1 '.$de.' = 1 '.$para,
                'unidades_iguais',
                [],
                'Unidades iguais — fator = 1.',
                $de,
                $para
            );
        }

        $attrs = $this->parseAttrs($atributos);

        return match (true) {
            $this->isPair($de, $para, 'MIL', 'UN') => $this->constant(
                $de,
                $para,
                'MIL',
                '1000',
                '1 MIL = 1000 UN',
                'constante_mil_un'
            ),
            $this->isPair($de, $para, 'KG', 'G') => $this->constant(
                $de,
                $para,
                'KG',
                '1000',
                '1 KG = 1000 G',
                'constante_kg_g'
            ),
            $this->isPair($de, $para, 'RL', 'M') => $this->fromAttr(
                $de,
                $para,
                'RL',
                $attrs['comprimento_m'],
                'comprimento_m',
                '1 RL = comprimento_m (m)',
                'ponte_rl_m'
            ),
            $this->isPair($de, $para, 'M', 'M2') => $this->fromComputed(
                $de,
                $para,
                'M',
                fn () => $this->requireAttr($attrs, 'largura_mm'),
                function (string $larguraMm) {
                    // largura_m = largura_mm / 1000
                    return bcdiv($larguraMm, '1000', PadraoDecimal::SCALE_FACTOR + 4);
                },
                ['largura_mm'],
                '1 M = (largura_mm / 1000) M2',
                'ponte_m_m2'
            ),
            $this->isPair($de, $para, 'M2', 'KG') => $this->fromComputed(
                $de,
                $para,
                'M2',
                fn () => $this->requireAttr($attrs, 'gramatura_g_m2'),
                function (string $gramatura) {
                    // kg = m2 × gramatura / 1000  ⇒  1 M2 = gramatura/1000 KG
                    return bcdiv($gramatura, '1000', PadraoDecimal::SCALE_FACTOR + 4);
                },
                ['gramatura_g_m2'],
                '1 M2 = gramatura_g_m2 / 1000 KG',
                'ponte_m2_kg'
            ),
            $this->isPair($de, $para, 'RL', 'M2') => $this->fromComputed(
                $de,
                $para,
                'RL',
                function () use ($attrs) {
                    return [
                        $this->requireAttr($attrs, 'comprimento_m'),
                        $this->requireAttr($attrs, 'largura_mm'),
                    ];
                },
                function (array $parts) {
                    [$comp, $larguraMm] = $parts;
                    $larguraM = bcdiv($larguraMm, '1000', PadraoDecimal::SCALE_FACTOR + 4);

                    return bcmul($comp, $larguraM, PadraoDecimal::SCALE_FACTOR + 4);
                },
                ['comprimento_m', 'largura_mm'],
                '1 RL = comprimento_m × (largura_mm / 1000) M2',
                'ponte_rl_m2'
            ),
            $this->isPair($de, $para, 'RL', 'KG') => $this->fromComputed(
                $de,
                $para,
                'RL',
                function () use ($attrs) {
                    return [
                        $this->requireAttr($attrs, 'comprimento_m'),
                        $this->requireAttr($attrs, 'largura_mm'),
                        $this->requireAttr($attrs, 'gramatura_g_m2'),
                    ];
                },
                function (array $parts) {
                    [$comp, $larguraMm, $gramatura] = $parts;
                    $larguraM = bcdiv($larguraMm, '1000', PadraoDecimal::SCALE_FACTOR + 4);
                    $m2 = bcmul($comp, $larguraM, PadraoDecimal::SCALE_FACTOR + 4);

                    return bcmul($m2, bcdiv($gramatura, '1000', PadraoDecimal::SCALE_FACTOR + 4), PadraoDecimal::SCALE_FACTOR + 4);
                },
                ['comprimento_m', 'largura_mm', 'gramatura_g_m2'],
                '1 RL = comprimento_m × (largura_mm/1000) × (gramatura/1000) KG',
                'ponte_rl_kg'
            ),
            $this->isPair($de, $para, 'M', 'KG') => $this->fromComputed(
                $de,
                $para,
                'M',
                function () use ($attrs) {
                    return [
                        $this->requireAttr($attrs, 'largura_mm'),
                        $this->requireAttr($attrs, 'gramatura_g_m2'),
                    ];
                },
                function (array $parts) {
                    [$larguraMm, $gramatura] = $parts;
                    $larguraM = bcdiv($larguraMm, '1000', PadraoDecimal::SCALE_FACTOR + 4);

                    // kg = m × largura_m × gramatura / 1000
                    return bcmul(
                        bcmul($larguraM, $gramatura, PadraoDecimal::SCALE_FACTOR + 4),
                        bcdiv('1', '1000', PadraoDecimal::SCALE_FACTOR + 4),
                        PadraoDecimal::SCALE_FACTOR + 4
                    );
                },
                ['largura_mm', 'gramatura_g_m2'],
                '1 M = (largura_mm/1000) × gramatura_g_m2 / 1000 KG',
                'ponte_m_kg'
            ),
            $this->isPair($de, $para, 'L', 'KG') => $this->fromAttr(
                $de,
                $para,
                'L',
                $attrs['densidade_g_ml'],
                'densidade_g_ml',
                '1 L = densidade_g_ml KG (g/ml)',
                'ponte_l_kg'
            ),
            $this->isPair($de, $para, 'MIL', 'M') => $this->fromAttr(
                $de,
                $para,
                'MIL',
                $attrs['metragem_por_milheiro'],
                'metragem_por_milheiro',
                '1 MIL = metragem_por_milheiro (m) — ficha técnica',
                'ponte_mil_m'
            ),
            $this->isCxPair($de, $para) => $this->cxFactor($de, $para, $attrs),
            default => $this->result(
                self::STATUS_SEM_FORMULA,
                null,
                null,
                null,
                [],
                "Sem fórmula automática para {$de} → {$para}. Informe o fator manualmente (domínio 32).",
                $de,
                $para
            ),
        };
    }

    /**
     * @param  array<string, mixed>  $atributos
     * @return array{
     *   largura_mm: ?string,
     *   comprimento_m: ?string,
     *   gramatura_g_m2: ?string,
     *   qtd_por_caixa: ?string,
     *   densidade_g_ml: ?string,
     *   metragem_por_milheiro: ?string
     * }
     */
    private function parseAttrs(array $atributos): array
    {
        $keys = [
            'largura_mm',
            'comprimento_m',
            'gramatura_g_m2',
            'qtd_por_caixa',
            'densidade_g_ml',
            'metragem_por_milheiro',
        ];

        $out = [];
        foreach ($keys as $key) {
            if (! array_key_exists($key, $atributos) || $atributos[$key] === '' || $atributos[$key] === null) {
                $out[$key] = null;

                continue;
            }
            try {
                $parsed = PadraoDecimal::parse($atributos[$key]);
            } catch (InvalidArgumentException) {
                $out[$key] = null;

                continue;
            }
            if ($parsed === null || bccomp($parsed, '0', 12) <= 0) {
                $out[$key] = null;

                continue;
            }
            $out[$key] = $parsed;
        }

        return $out;
    }

    private function normUnit(?string $unit): ?string
    {
        if ($unit === null) {
            return null;
        }
        $u = strtoupper(trim($unit));

        return $u === '' ? null : $u;
    }

    private function isPair(string $a, string $b, string $x, string $y): bool
    {
        return ($a === $x && $b === $y) || ($a === $y && $b === $x);
    }

    private function isCxPair(string $de, string $para): bool
    {
        $conteudos = ['MIL', 'UN', 'RL'];

        return ($de === 'CX' && in_array($para, $conteudos, true))
            || ($para === 'CX' && in_array($de, $conteudos, true));
    }

    /**
     * @param  array{qtd_por_caixa: ?string}  $attrs
     * @return array<string, mixed>
     */
    private function cxFactor(string $de, string $para, array $attrs): array
    {
        $qtd = $attrs['qtd_por_caixa'];
        if ($qtd === null) {
            return $this->result(
                self::STATUS_INCOMPLETO,
                null,
                '1 CX = qtd_por_caixa × conteúdo',
                null,
                ['qtd_por_caixa'],
                'Informe a quantidade por caixa para calcular CX ↔ conteúdo.',
                $de,
                $para
            );
        }

        if ($de === 'CX') {
            return $this->result(
                self::STATUS_SUGERIDO,
                $this->finalize($qtd),
                '1 CX = qtd_por_caixa '.$para,
                'ponte_cx',
                [],
                null,
                $de,
                $para
            );
        }

        // 1 conteúdo = 1/qtd CX
        $inv = bcdiv('1', $qtd, PadraoDecimal::SCALE_FACTOR + 4);

        return $this->result(
            self::STATUS_SUGERIDO,
            $this->finalize($inv),
            '1 '.$de.' = 1/qtd_por_caixa CX',
            'ponte_cx',
            [],
            null,
            $de,
            $para
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function constant(
        string $de,
        string $para,
        string $forwardFrom,
        string $forwardFactor,
        string $formula,
        string $origem
    ): array {
        $fator = $de === $forwardFrom
            ? $forwardFactor
            : bcdiv('1', $forwardFactor, PadraoDecimal::SCALE_FACTOR + 4);

        return $this->result(
            self::STATUS_SUGERIDO,
            $this->finalize($fator),
            $formula,
            $origem,
            [],
            null,
            $de,
            $para
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function fromAttr(
        string $de,
        string $para,
        string $forwardFrom,
        ?string $value,
        string $attrName,
        string $formula,
        string $origem
    ): array {
        if ($value === null) {
            return $this->result(
                self::STATUS_INCOMPLETO,
                null,
                $formula,
                null,
                [$attrName],
                "Preencha {$attrName} para calcular {$de} → {$para}.",
                $de,
                $para
            );
        }

        $fator = $de === $forwardFrom
            ? $value
            : bcdiv('1', $value, PadraoDecimal::SCALE_FACTOR + 4);

        return $this->result(
            self::STATUS_SUGERIDO,
            $this->finalize($fator),
            $formula,
            $origem,
            [],
            null,
            $de,
            $para
        );
    }

    /**
     * @param  callable(): (string|list<string>)  $require
     * @param  callable(string|list<string>): string  $computeForward  valor de 1× forwardFrom em destino
     * @param  list<string>  $faltandoKeys
     * @return array<string, mixed>
     */
    private function fromComputed(
        string $de,
        string $para,
        string $forwardFrom,
        callable $require,
        callable $computeForward,
        array $faltandoKeys,
        string $formula,
        string $origem
    ): array {
        try {
            $parts = $require();
        } catch (IncompleteAttrsException $e) {
            return $this->result(
                self::STATUS_INCOMPLETO,
                null,
                $formula,
                null,
                $e->faltando !== [] ? $e->faltando : $faltandoKeys,
                $e->getMessage(),
                $de,
                $para
            );
        }

        $forward = $computeForward($parts);
        $fator = $de === $forwardFrom
            ? $forward
            : bcdiv('1', $forward, PadraoDecimal::SCALE_FACTOR + 4);

        if (bccomp($fator, '0', PadraoDecimal::SCALE_FACTOR + 4) <= 0) {
            return $this->result(
                self::STATUS_INVALIDO,
                null,
                $formula,
                null,
                [],
                'Fator calculado inválido (≤ 0).',
                $de,
                $para
            );
        }

        return $this->result(
            self::STATUS_SUGERIDO,
            $this->finalize($fator),
            $formula,
            $origem,
            [],
            null,
            $de,
            $para
        );
    }

    /**
     * @param  array<string, ?string>  $attrs
     */
    private function requireAttr(array $attrs, string $key): string
    {
        $value = $attrs[$key] ?? null;
        if ($value === null) {
            throw new IncompleteAttrsException(
                "Preencha {$key} para calcular a conversão.",
                [$key]
            );
        }

        return $value;
    }

    private function finalize(string $raw): string
    {
        return PadraoDecimal::roundHalfUp($raw, PadraoDecimal::SCALE_FACTOR);
    }

    /**
     * @param  list<string>  $faltando
     * @return array{
     *   status: string,
     *   fator: ?string,
     *   formula: ?string,
     *   origem: ?string,
     *   faltando: list<string>,
     *   mensagem: ?string,
     *   de: ?string,
     *   para: ?string
     * }
     */
    private function result(
        string $status,
        ?string $fator,
        ?string $formula,
        ?string $origem,
        array $faltando,
        ?string $mensagem,
        ?string $de,
        ?string $para
    ): array {
        return [
            'status' => $status,
            'fator' => $fator,
            'formula' => $formula,
            'origem' => $origem,
            'faltando' => array_values($faltando),
            'mensagem' => $mensagem,
            'de' => $de,
            'para' => $para,
        ];
    }
}
