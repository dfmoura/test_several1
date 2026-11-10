<?php

namespace App\Support;

/**
 * Plano de partida / refile de bobina na OP (ADR_PRODUCAO_PARTIDA_BOBINA).
 *
 * Pai L_p × C_p → consome L_n × C_u na faixa do papel;
 * sobra refile (L_p−L_n)×C_p e sobra útil L_n×(C_p−C_u). Conserva área M2.
 */
final class PartidaBobina
{
    /** Mesma tolerância da coleta (mm). */
    public const LARGURA_TOL_MM = '0.51';

    public const MODO_EXATO = 'exato';

    public const MODO_CABIVEL = 'cabivel';

    public const FAIXA_PAPEL = 'papel';

    public const FAIXA_PARTIDA = 'partida';

    /**
     * Grupos M2 em que L×C vive no volume e a partida faz sentido.
     * TEC/CLD/ADF ficam de fora (largura identifica SKU).
     *
     * @var list<string>
     */
    public const GRUPOS_PARTIDA = ['MP-PAP', 'MP-FLM', 'MP-LAM'];

    /**
     * Lote cabe na largura do papel.
     * exato: |L − L_n| < tol · cabivel: L ≥ L_n − tol (nunca mais estreito).
     */
    public static function cabeNaLargura(
        mixed $larguraLoteMm,
        ?string $larguraPapelMm,
        string $modo = self::MODO_EXATO,
    ): bool {
        if ($larguraPapelMm === null || $larguraPapelMm === '' || bccomp($larguraPapelMm, '0', 4) <= 0) {
            return true;
        }
        $l = self::dim($larguraLoteMm);
        if ($l === null) {
            return false;
        }
        $delta = bcsub($l, $larguraPapelMm, 6);
        $abs = bccomp($delta, '0', 6) < 0 ? bcmul($delta, '-1', 6) : $delta;

        if ($modo === self::MODO_CABIVEL) {
            // L >= L_n − tol  ≡  L_n − L <= tol
            $faltando = bcsub($larguraPapelMm, $l, 6);

            return bccomp($faltando, self::LARGURA_TOL_MM, 4) <= 0;
        }

        return bccomp($abs, self::LARGURA_TOL_MM, 4) < 0;
    }

    public static function ehMaisLarga(mixed $larguraLoteMm, ?string $larguraPapelMm): bool
    {
        if ($larguraPapelMm === null || $larguraPapelMm === '' || bccomp($larguraPapelMm, '0', 4) <= 0) {
            return false;
        }
        $l = self::dim($larguraLoteMm);
        if ($l === null) {
            return false;
        }

        return bccomp(bcsub($l, $larguraPapelMm, 6), self::LARGURA_TOL_MM, 4) >= 0;
    }

    public static function produtoPermitePartida(
        ?string $codigoProduto,
        ?string $codigoGrupo,
    ): bool {
        $candidatos = [
            strtoupper(trim((string) $codigoProduto)),
            strtoupper(trim((string) $codigoGrupo)),
        ];
        foreach (self::GRUPOS_PARTIDA as $grupo) {
            foreach ($candidatos as $codigo) {
                if ($codigo === $grupo || str_starts_with($codigo, $grupo.'-')) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return array{
     *   aplica: bool,
     *   lote_pai_id?: int,
     *   L_p: string,
     *   C_p: string,
     *   L_n: string,
     *   C_n: string,
     *   C_u: string,
     *   area_pai: string,
     *   area_consumida: string,
     *   refile: ?array{largura_mm: string, comprimento_m: string, area_m2: string, qtde: string},
     *   sobra: ?array{largura_mm: string, comprimento_m: string, area_m2: string, qtde: string},
     *   mensagem: ?string
     * }|array{aplica: false, mensagem: string}
     */
    public static function planejar(
        mixed $larguraPaiMm,
        mixed $comprimentoPaiM,
        mixed $larguraPapelMm,
        mixed $metrosNecessarios,
        ?int $lotePaiId = null,
        mixed $metrosUsados = null,
    ): array {
        $lP = self::dim($larguraPaiMm);
        $cP = self::dim($comprimentoPaiM);
        $lN = self::dim($larguraPapelMm);
        $cN = self::dim($metrosNecessarios);

        if ($lP === null || $cP === null || $lN === null || $cN === null) {
            return ['aplica' => false, 'mensagem' => 'Geometria incompleta para partida.'];
        }
        if (! self::cabeNaLargura($lP, $lN, self::MODO_CABIVEL)) {
            return ['aplica' => false, 'mensagem' => 'Bobina mais estreita que o papel da ordem.'];
        }
        if (! self::ehMaisLarga($lP, $lN)) {
            return ['aplica' => false, 'mensagem' => 'Medida exata — sem partida.'];
        }
        if (bccomp($cP, $cN, PadraoDecimal::SCALE_DIM) < 0) {
            return ['aplica' => false, 'mensagem' => 'Comprimento do volume não cobre a metragem da ordem.'];
        }

        $cU = $metrosUsados !== null && $metrosUsados !== ''
            ? self::dim($metrosUsados)
            : $cN;
        if ($cU === null) {
            return ['aplica' => false, 'mensagem' => 'Metros usados inválidos.'];
        }
        if (bccomp($cU, '0', PadraoDecimal::SCALE_DIM) < 0) {
            return ['aplica' => false, 'mensagem' => 'Metros usados negativos.'];
        }
        if (bccomp($cU, $cP, PadraoDecimal::SCALE_DIM) > 0) {
            return ['aplica' => false, 'mensagem' => 'Metros usados excedem o comprimento do volume.'];
        }

        $geoPai = VolumeGeometria::fechar($lP, $cP, null, 'M2');
        if ($geoPai['status'] !== VolumeGeometria::STATUS_FECHADO || $geoPai['qtde'] === null) {
            return ['aplica' => false, 'mensagem' => $geoPai['mensagem'] ?? 'Área do volume pai não fecha.'];
        }

        $geoCons = VolumeGeometria::fechar($lN, $cU, null, 'M2');
        if ($geoCons['status'] !== VolumeGeometria::STATUS_FECHADO || $geoCons['qtde'] === null) {
            return ['aplica' => false, 'mensagem' => $geoCons['mensagem'] ?? 'Área consumida não fecha.'];
        }

        $deltaL = PadraoDecimal::roundHalfUp(bcsub($lP, $lN, 6), PadraoDecimal::SCALE_DIM);
        $refile = null;
        if (bccomp($deltaL, self::LARGURA_TOL_MM, 4) >= 0) {
            $geoRef = VolumeGeometria::fechar($deltaL, $cP, null, 'M2');
            if ($geoRef['status'] !== VolumeGeometria::STATUS_FECHADO || $geoRef['qtde'] === null) {
                return ['aplica' => false, 'mensagem' => $geoRef['mensagem'] ?? 'Área do refile não fecha.'];
            }
            $refile = [
                'largura_mm' => (string) $geoRef['largura_mm'],
                'comprimento_m' => (string) $geoRef['comprimento_m'],
                'area_m2' => (string) $geoRef['area_m2'],
                'qtde' => (string) $geoRef['qtde'],
            ];
        }

        $deltaC = PadraoDecimal::roundHalfUp(bcsub($cP, $cU, 6), PadraoDecimal::SCALE_DIM);
        $sobra = null;
        if (bccomp($deltaC, '0', PadraoDecimal::SCALE_DIM) > 0) {
            $geoSob = VolumeGeometria::fechar($lN, $deltaC, null, 'M2');
            if ($geoSob['status'] !== VolumeGeometria::STATUS_FECHADO || $geoSob['qtde'] === null) {
                return ['aplica' => false, 'mensagem' => $geoSob['mensagem'] ?? 'Área da sobra útil não fecha.'];
            }
            $sobra = [
                'largura_mm' => (string) $geoSob['largura_mm'],
                'comprimento_m' => (string) $geoSob['comprimento_m'],
                'area_m2' => (string) $geoSob['area_m2'],
                'qtde' => (string) $geoSob['qtde'],
            ];
        }

        $soma = (string) $geoCons['qtde'];
        if ($refile !== null) {
            $soma = bcadd($soma, $refile['qtde'], PadraoDecimal::SCALE_QTY + 4);
        }
        if ($sobra !== null) {
            $soma = bcadd($soma, $sobra['qtde'], PadraoDecimal::SCALE_QTY + 4);
        }
        $soma = PadraoDecimal::roundHalfUp($soma, PadraoDecimal::SCALE_QTY);
        $areaPai = PadraoDecimal::roundHalfUp((string) $geoPai['qtde'], PadraoDecimal::SCALE_QTY);
        if (bccomp($soma, $areaPai, PadraoDecimal::SCALE_QTY) !== 0) {
            return [
                'aplica' => false,
                'mensagem' => "Conservação de área falhou ({$soma} ≠ {$areaPai} M2).",
            ];
        }

        return [
            'aplica' => true,
            'lote_pai_id' => $lotePaiId !== null && $lotePaiId > 0 ? $lotePaiId : null,
            'L_p' => $lP,
            'C_p' => $cP,
            'L_n' => $lN,
            'C_n' => $cN,
            'C_u' => $cU,
            'area_pai' => $areaPai,
            'area_consumida' => PadraoDecimal::roundHalfUp((string) $geoCons['qtde'], PadraoDecimal::SCALE_QTY),
            'refile' => $refile,
            'sobra' => $sobra,
            'mensagem' => null,
        ];
    }

    /**
     * Persistível em ordem_producao_materiais.partida_prevista[].
     *
     * @param  array<string, mixed>  $plano  retorno de planejar() com aplica=true
     * @return array<string, mixed>
     */
    public static function paraPersistencia(array $plano): array
    {
        return [
            'lote_pai_id' => (int) ($plano['lote_pai_id'] ?? 0),
            'L_p' => (string) $plano['L_p'],
            'C_p' => (string) $plano['C_p'],
            'L_n' => (string) $plano['L_n'],
            'C_n' => (string) $plano['C_n'],
            'C_u_previsto' => (string) $plano['C_u'],
            'area_pai' => (string) $plano['area_pai'],
            'area_consumida' => (string) $plano['area_consumida'],
            'refile' => $plano['refile'],
            'sobra' => $plano['sobra'],
            'status' => 'pendente',
        ];
    }

    /**
     * Preview enxuto para a UI do kit.
     *
     * @param  array<string, mixed>  $plano
     * @return array<string, mixed>|null
     */
    public static function previewUi(array $plano): ?array
    {
        if (($plano['aplica'] ?? false) !== true) {
            return null;
        }

        return [
            'L_p' => (string) $plano['L_p'],
            'C_p' => (string) $plano['C_p'],
            'L_n' => (string) $plano['L_n'],
            'C_u' => (string) $plano['C_u'],
            'refile' => $plano['refile'],
            'sobra' => $plano['sobra'],
            'area_consumida' => (string) $plano['area_consumida'],
        ];
    }

    private static function dim(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        // Metros da coleta podem vir com 6 casas — arredonda para SCALE_DIM (não parseStrict).
        $parsed = PadraoDecimal::parse((string) $value);
        if ($parsed === null || bccomp($parsed, '0', PadraoDecimal::SCALE_DIM) < 0) {
            return null;
        }

        return PadraoDecimal::roundHalfUp($parsed, PadraoDecimal::SCALE_DIM);
    }
}
