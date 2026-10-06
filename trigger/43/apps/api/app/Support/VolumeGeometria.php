<?php

namespace App\Support;

/**
 * Fecha a geometria de um volume (bobina inteira).
 *
 * Largura, metro linear e m² são a mesma conta. O saldo oficial é um só:
 * M2 quando a área soma (papel, filme, laminação, retalho);
 * M quando a largura é do SKU e o que varia é o comprimento (tecido, foil, fita).
 * Kg não entra aqui — gramatura no SKU, ponte em FatorConversaoSugeridor.
 *
 * Norma: ADR_CADASTRO_INSUMO_VOLUME · ADR_UNIDADES_PRODUTO.
 */
final class VolumeGeometria
{
    public const STATUS_FECHADO = 'fechado';

    public const STATUS_CONTRADITORIO = 'contraditorio';

    /**
     * @return array{
     *   status: string,
     *   largura_mm: ?string,
     *   comprimento_m: ?string,
     *   area_m2: ?string,
     *   qtde: ?string,
     *   mensagem: ?string
     * }
     */
    public static function fechar(
        mixed $larguraMm,
        mixed $comprimentoM,
        mixed $qtde,
        ?string $unidadeInterna,
    ): array {
        $largura = self::dim($larguraMm);
        $comprimento = self::dim($comprimentoM);
        $qtdeOficial = self::qtde($qtde);
        $unidade = self::norm($unidadeInterna);

        if ($unidade === 'M2') {
            return self::fecharArea($largura, $comprimento, $qtdeOficial);
        }

        if ($unidade === 'M') {
            return self::fecharMetros($largura, $comprimento, $qtdeOficial);
        }

        $area = ($largura !== null && $comprimento !== null)
            ? NfeExactDimensoes::areaM2($largura, $comprimento)
            : null;

        return self::out(self::STATUS_FECHADO, $largura, $comprimento, $area, $qtdeOficial, null);
    }

    /**
     * Quantidade do pedido a partir das faixas, quando o saldo não é m².
     * null = o chamador usa a ponte de área (M2 / KG→M2).
     *
     * @param  list<array{quantidade?: string, comprimento_m?: string}>  $faixas
     */
    public static function qtdePedido(string $unidadeComercial, string $unidadeInterna, array $faixas): ?string
    {
        $com = self::norm($unidadeComercial);
        $int = self::norm($unidadeInterna);

        if ($com === 'M' || ($com === '' && $int === 'M')) {
            return self::somaMetros($faixas);
        }

        if ($com === 'RL' && $int !== 'M2') {
            return self::somaRolos($faixas);
        }

        return null;
    }

    /**
     * Quantidade de um volume na unidade comercial.
     * null = o chamador converte a área (M2).
     */
    public static function qtdeDeUmVolume(
        ?string $unidadeComercial,
        ?string $unidadeInterna,
        string $comprimentoM,
    ): ?string {
        $com = self::norm($unidadeComercial);
        $int = self::norm($unidadeInterna);

        if ($com === 'M' || ($com === '' && $int === 'M')) {
            $metros = self::dim($comprimentoM);
            if ($metros === null) {
                return null;
            }

            return PadraoDecimal::roundHalfUp($metros, PadraoDecimal::SCALE_QTY);
        }

        if ($com === 'RL' && $int !== 'M2') {
            return PadraoDecimal::roundHalfUp('1', PadraoDecimal::SCALE_QTY);
        }

        return null;
    }

    public static function norm(?string $unidade): string
    {
        $u = strtoupper(trim((string) $unidade));

        return str_replace(['M²', ' '], ['M2', ''], $u);
    }

    /**
     * @param  list<array{quantidade?: string, comprimento_m?: string}>  $faixas
     */
    private static function somaMetros(array $faixas): string
    {
        $sum = '0';
        foreach ($faixas as $faixa) {
            $n = self::qtde($faixa['quantidade'] ?? null);
            $c = self::dim($faixa['comprimento_m'] ?? null);
            if ($n === null || $c === null) {
                continue;
            }
            $sum = bcadd($sum, bcmul($n, $c, PadraoDecimal::SCALE_QTY + 4), PadraoDecimal::SCALE_QTY + 2);
        }

        return PadraoDecimal::roundHalfUp($sum, PadraoDecimal::SCALE_QTY);
    }

    /**
     * @param  list<array{quantidade?: string}>  $faixas
     */
    private static function somaRolos(array $faixas): string
    {
        $sum = '0';
        foreach ($faixas as $faixa) {
            $n = self::qtde($faixa['quantidade'] ?? null);
            if ($n === null) {
                continue;
            }
            $sum = bcadd($sum, $n, PadraoDecimal::SCALE_QTY + 2);
        }

        return PadraoDecimal::roundHalfUp($sum, PadraoDecimal::SCALE_QTY);
    }

    /**
     * @return array{status: string, largura_mm: ?string, comprimento_m: ?string, area_m2: ?string, qtde: ?string, mensagem: ?string}
     */
    private static function fecharArea(?string $largura, ?string $comprimento, ?string $qtde): array
    {
        if ($largura !== null && $comprimento !== null) {
            $area = NfeExactDimensoes::areaM2($largura, $comprimento);
            if ($qtde !== null && bccomp($qtde, $area, PadraoDecimal::SCALE_QTY) !== 0) {
                return self::out(
                    self::STATUS_CONTRADITORIO,
                    $largura,
                    $comprimento,
                    $area,
                    $qtde,
                    "Quantidade ({$qtde} M2) não fecha com largura × comprimento ({$area} M2).",
                );
            }

            return self::out(self::STATUS_FECHADO, $largura, $comprimento, $area, $qtde ?? $area, null);
        }

        if ($comprimento === null && $largura !== null && $qtde !== null) {
            $comprimento = NfeExactDimensoes::comprimentoFromArea($qtde, $largura);
        }

        if ($largura === null && $comprimento !== null && $qtde !== null) {
            $largura = self::larguraFromArea($qtde, $comprimento);
        }

        $area = ($largura !== null && $comprimento !== null)
            ? NfeExactDimensoes::areaM2($largura, $comprimento)
            : $qtde;

        return self::out(self::STATUS_FECHADO, $largura, $comprimento, $area, $qtde, null);
    }

    /**
     * @return array{status: string, largura_mm: ?string, comprimento_m: ?string, area_m2: ?string, qtde: ?string, mensagem: ?string}
     */
    private static function fecharMetros(?string $largura, ?string $comprimento, ?string $qtde): array
    {
        if ($comprimento === null && $qtde !== null) {
            $comprimento = PadraoDecimal::roundHalfUp($qtde, PadraoDecimal::SCALE_DIM);
        }

        if ($qtde === null && $comprimento !== null) {
            $qtde = PadraoDecimal::roundHalfUp($comprimento, PadraoDecimal::SCALE_QTY);
        }

        if ($comprimento !== null && $qtde !== null) {
            $qtdeComoMetro = PadraoDecimal::roundHalfUp($qtde, PadraoDecimal::SCALE_DIM);
            if (bccomp($qtdeComoMetro, $comprimento, PadraoDecimal::SCALE_DIM) !== 0) {
                return self::out(
                    self::STATUS_CONTRADITORIO,
                    $largura,
                    $comprimento,
                    null,
                    $qtde,
                    "Quantidade ({$qtde} M) não fecha com o comprimento do volume ({$comprimento} M).",
                );
            }
        }

        $area = ($largura !== null && $comprimento !== null)
            ? NfeExactDimensoes::areaM2($largura, $comprimento)
            : null;

        return self::out(self::STATUS_FECHADO, $largura, $comprimento, $area, $qtde, null);
    }

    private static function larguraFromArea(string $qtdeM2, string $comprimentoM): ?string
    {
        if (bccomp($qtdeM2, '0', PadraoDecimal::SCALE_QTY) <= 0
            || bccomp($comprimentoM, '0', PadraoDecimal::SCALE_DIM) <= 0) {
            return null;
        }

        $mm = bcmul(
            bcdiv($qtdeM2, $comprimentoM, PadraoDecimal::SCALE_DIM + 6),
            '1000',
            PadraoDecimal::SCALE_DIM + 4
        );

        return PadraoDecimal::roundHalfUp($mm, PadraoDecimal::SCALE_DIM);
    }

    private static function dim(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $parsed = PadraoDecimal::parseStrict((string) $value, PadraoDecimal::SCALE_DIM);
        if ($parsed === null || bccomp($parsed, '0', PadraoDecimal::SCALE_DIM) <= 0) {
            return null;
        }

        return PadraoDecimal::roundHalfUp($parsed, PadraoDecimal::SCALE_DIM);
    }

    private static function qtde(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $parsed = PadraoDecimal::parseStrict((string) $value, PadraoDecimal::SCALE_QTY);
        if ($parsed === null || bccomp($parsed, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            return null;
        }

        return PadraoDecimal::roundHalfUp($parsed, PadraoDecimal::SCALE_QTY);
    }

    /**
     * @return array{status: string, largura_mm: ?string, comprimento_m: ?string, area_m2: ?string, qtde: ?string, mensagem: ?string}
     */
    private static function out(
        string $status,
        ?string $largura,
        ?string $comprimento,
        ?string $area,
        ?string $qtde,
        ?string $mensagem,
    ): array {
        return [
            'status' => $status,
            'largura_mm' => $largura,
            'comprimento_m' => $comprimento,
            'area_m2' => $area,
            'qtde' => $qtde,
            'mensagem' => $mensagem,
        ];
    }
}
