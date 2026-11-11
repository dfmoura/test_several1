<?php

namespace App\Support;

/**
 * Plano de retorno de bobina na OP (ADR_PRODUCAO_PARTIDA_BOBINA).
 *
 * - Partida: L_p > L_n → refile + sobra útil.
 * - Sobra comprimento: L_p ≈ L_n e C_p > C_u → «Passa» vira retorno previsto.
 *
 * Conserva área M2. Sem segundo writer.
 */
final class PartidaBobina
{
    /** Mesma tolerância da coleta (mm). */
    public const LARGURA_TOL_MM = '0.51';

    public const MODO_EXATO = 'exato';

    public const MODO_CABIVEL = 'cabivel';

    public const FAIXA_PAPEL = 'papel';

    public const FAIXA_PARTIDA = 'partida';

    public const FAIXA_SOBRA = 'sobra';

    public const TIPO_PARTIDA = 'partida';

    public const TIPO_SOBRA_COMPRIMENTO = 'sobra_comprimento';

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
        $areaPai = PadraoDecimal::roundHalfUp((string) $geoPai['qtde'], PadraoDecimal::SCALE_QTY);

        // C_u = 0: nada consumido na faixa do papel — área consumida zero (VolumeGeometria rejeita C≤0).
        $areaConsumida = '0.0000';
        if (bccomp($cU, '0', PadraoDecimal::SCALE_DIM) > 0) {
            $geoCons = VolumeGeometria::fechar($lN, $cU, null, 'M2');
            if ($geoCons['status'] !== VolumeGeometria::STATUS_FECHADO || $geoCons['qtde'] === null) {
                return ['aplica' => false, 'mensagem' => $geoCons['mensagem'] ?? 'Área consumida não fecha.'];
            }
            $areaConsumida = PadraoDecimal::roundHalfUp((string) $geoCons['qtde'], PadraoDecimal::SCALE_QTY);
        }

        $deltaL = PadraoDecimal::roundHalfUp(bcsub($lP, $lN, 6), PadraoDecimal::SCALE_DIM);
        $refile = null;
        $areaRefile = '0.0000';
        if (bccomp($deltaL, self::LARGURA_TOL_MM, 4) >= 0) {
            $geoRef = VolumeGeometria::fechar($deltaL, $cP, null, 'M2');
            if ($geoRef['status'] !== VolumeGeometria::STATUS_FECHADO || $geoRef['qtde'] === null) {
                return ['aplica' => false, 'mensagem' => $geoRef['mensagem'] ?? 'Área do refile não fecha.'];
            }
            $areaRefile = PadraoDecimal::roundHalfUp((string) $geoRef['qtde'], PadraoDecimal::SCALE_QTY);
            $refile = [
                'largura_mm' => (string) $geoRef['largura_mm'],
                'comprimento_m' => (string) $geoRef['comprimento_m'],
                'area_m2' => $areaRefile,
                'qtde' => $areaRefile,
            ];
        }

        // Sobra = residual de área (conservação por construção — evita 0,0001 M2 de arredondamento L×C).
        $areaSobra = PadraoDecimal::roundHalfUp(
            bcsub(
                bcsub($areaPai, $areaConsumida, PadraoDecimal::SCALE_QTY + 4),
                $areaRefile,
                PadraoDecimal::SCALE_QTY + 4
            ),
            PadraoDecimal::SCALE_QTY
        );
        $sobra = null;
        if (bccomp($areaSobra, '0', PadraoDecimal::SCALE_QTY) > 0) {
            $corpo = self::corpoFromAreaResidual($lN, $areaSobra);
            if ($corpo === null) {
                return ['aplica' => false, 'mensagem' => 'Área da sobra útil não fecha.'];
            }
            $sobra = $corpo;
        }

        return [
            'aplica' => true,
            'tipo' => self::TIPO_PARTIDA,
            'lote_pai_id' => $lotePaiId !== null && $lotePaiId > 0 ? $lotePaiId : null,
            'L_p' => $lP,
            'C_p' => $cP,
            'L_n' => $lN,
            'C_n' => $cN,
            'C_u' => $cU,
            'area_pai' => $areaPai,
            'area_consumida' => $areaConsumida,
            'refile' => $refile,
            'sobra' => $sobra,
            'mensagem' => null,
        ];
    }

    /**
     * Medida exata: «Passa» de comprimento → sobra L_n × (C_p − C_u).
     *
     * @return array<string, mixed>
     */
    public static function planejarSobraComprimento(
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
            return ['aplica' => false, 'mensagem' => 'Geometria incompleta para sobra.'];
        }
        if (! self::cabeNaLargura($lP, $lN, self::MODO_EXATO)) {
            return ['aplica' => false, 'mensagem' => 'Sobra de comprimento exige a medida do papel.'];
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
            return ['aplica' => false, 'mensagem' => 'Área da sobra não fecha.'];
        }
        $areaPai = PadraoDecimal::roundHalfUp((string) $geoPai['qtde'], PadraoDecimal::SCALE_QTY);

        // Volume além da necessidade (C_u = 0): bobina física inteira volta — 1 VOL:.
        if (bccomp($cU, '0', PadraoDecimal::SCALE_DIM) === 0) {
            return [
                'aplica' => true,
                'tipo' => self::TIPO_SOBRA_COMPRIMENTO,
                'lote_pai_id' => $lotePaiId !== null && $lotePaiId > 0 ? $lotePaiId : null,
                'L_p' => $lP,
                'C_p' => $cP,
                'L_n' => $lN,
                'C_n' => $cN,
                'C_u' => $cU,
                'area_pai' => $areaPai,
                'area_consumida' => '0.0000',
                'refile' => null,
                'sobra' => [
                    'largura_mm' => (string) $geoPai['largura_mm'],
                    'comprimento_m' => (string) $geoPai['comprimento_m'],
                    'area_m2' => $areaPai,
                    'qtde' => $areaPai,
                ],
                'mensagem' => null,
            ];
        }

        $deltaC = PadraoDecimal::roundHalfUp(bcsub($cP, $cU, 6), PadraoDecimal::SCALE_DIM);
        if (bccomp($deltaC, '0', PadraoDecimal::SCALE_DIM) <= 0) {
            return ['aplica' => false, 'mensagem' => 'Sem passa de comprimento.'];
        }

        $geoCons = VolumeGeometria::fechar($lN, $cU, null, 'M2');
        if ($geoCons['status'] !== VolumeGeometria::STATUS_FECHADO || $geoCons['qtde'] === null) {
            return ['aplica' => false, 'mensagem' => 'Área da sobra não fecha.'];
        }
        $areaConsumida = PadraoDecimal::roundHalfUp((string) $geoCons['qtde'], PadraoDecimal::SCALE_QTY);
        $areaSobra = PadraoDecimal::roundHalfUp(
            bcsub($areaPai, $areaConsumida, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );
        if (bccomp($areaSobra, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            return ['aplica' => false, 'mensagem' => 'Sem passa de comprimento.'];
        }
        $corpo = self::corpoFromAreaResidual($lN, $areaSobra);
        if ($corpo === null) {
            return ['aplica' => false, 'mensagem' => 'Área da sobra não fecha.'];
        }

        return [
            'aplica' => true,
            'tipo' => self::TIPO_SOBRA_COMPRIMENTO,
            'lote_pai_id' => $lotePaiId !== null && $lotePaiId > 0 ? $lotePaiId : null,
            'L_p' => $lP,
            'C_p' => $cP,
            'L_n' => $lN,
            'C_n' => $cN,
            'C_u' => $cU,
            'area_pai' => $areaPai,
            'area_consumida' => $areaConsumida,
            'refile' => null,
            'sobra' => $corpo,
            'mensagem' => null,
        ];
    }

    /**
     * Corpo de retorno a partir do residual de área (L + m² → C).
     * Garante conservação: qtde oficial = residual, não L×C re-arredondado.
     *
     * @return array{largura_mm: string, comprimento_m: string, area_m2: string, qtde: string}|null
     */
    private static function corpoFromAreaResidual(string $larguraMm, string $areaResidual): ?array
    {
        $geo = VolumeGeometria::fechar($larguraMm, null, $areaResidual, 'M2');
        if ($geo['status'] !== VolumeGeometria::STATUS_FECHADO
            || $geo['comprimento_m'] === null
            || $geo['largura_mm'] === null) {
            return null;
        }

        return [
            'largura_mm' => (string) $geo['largura_mm'],
            'comprimento_m' => (string) $geo['comprimento_m'],
            'area_m2' => $areaResidual,
            'qtde' => $areaResidual,
        ];
    }

    /**
     * Persistível em ordem_producao_materiais.partida_prevista[].
     *
     * @param  array<string, mixed>  $plano  retorno de planejar* com aplica=true
     * @return array<string, mixed>
     */
    public static function paraPersistencia(array $plano): array
    {
        $tipo = (string) ($plano['tipo'] ?? self::TIPO_PARTIDA);

        return [
            'tipo' => $tipo,
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
     * Área que volta à prateleira (refile + sobra).
     *
     * @param  array<string, mixed>  $plano
     */
    public static function areaRetorno(array $plano): string
    {
        $area = '0';
        if (is_array($plano['refile'] ?? null)) {
            $area = bcadd($area, (string) ($plano['refile']['qtde'] ?? '0'), PadraoDecimal::SCALE_QTY + 4);
        }
        if (is_array($plano['sobra'] ?? null)) {
            $area = bcadd($area, (string) ($plano['sobra']['qtde'] ?? '0'), PadraoDecimal::SCALE_QTY + 4);
        }

        return PadraoDecimal::roundHalfUp($area, PadraoDecimal::SCALE_QTY);
    }

    /**
     * Grade operacional: 1 bobina por corpo a devolver (refile e/ou sobra).
     *
     * @param  array<string, mixed>  $plano
     * @return list<array{
     *   chave: string,
     *   lote_pai_id: int,
     *   tipo: string,
     *   largura_mm: string,
     *   comprimento_m: string,
     *   area_m2: string,
     *   qtde: string,
     *   status: string,
     *   lote_id: int|null
     * }>
     */
    public static function bobinasRetorno(array $plano): array
    {
        $pai = (int) ($plano['lote_pai_id'] ?? 0);
        $status = (string) ($plano['status'] ?? 'pendente');
        $geradosPorTipo = [];
        foreach (is_array($plano['volumes_gerados'] ?? null) ? $plano['volumes_gerados'] : [] as $g) {
            if (! is_array($g)) {
                continue;
            }
            $t = (string) ($g['tipo'] ?? '');
            if ($t !== '') {
                $geradosPorTipo[$t] = (int) ($g['lote_id'] ?? 0);
            }
        }
        $out = [];
        foreach (['refile', 'sobra'] as $tipo) {
            $geo = $plano[$tipo] ?? null;
            if (! is_array($geo)) {
                continue;
            }
            $qtde = PadraoDecimal::roundHalfUp((string) ($geo['qtde'] ?? '0'), PadraoDecimal::SCALE_QTY);
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }
            $loteId = $geradosPorTipo[$tipo] ?? null;
            $out[] = [
                'chave' => $pai.'-'.$tipo,
                'lote_pai_id' => $pai,
                'tipo' => $tipo,
                'largura_mm' => (string) ($geo['largura_mm'] ?? ''),
                'comprimento_m' => (string) ($geo['comprimento_m'] ?? ''),
                'area_m2' => (string) ($geo['area_m2'] ?? $qtde),
                'qtde' => $qtde,
                'status' => $status,
                'lote_id' => $loteId !== null && $loteId > 0 ? $loteId : null,
            ];
        }

        return $out;
    }

    /**
     * Preview enxuto para a UI do kit.
     *
     * @param  array<string, mixed>  $plano
     * @return array<string, mixed>|null
     */
    public static function previewUi(array $plano): ?array
    {
        if (! isset($plano['L_p']) && ($plano['aplica'] ?? false) !== true) {
            return null;
        }
        if (($plano['aplica'] ?? null) === false) {
            return null;
        }

        return [
            'tipo' => (string) ($plano['tipo'] ?? self::TIPO_PARTIDA),
            'L_p' => (string) ($plano['L_p'] ?? ''),
            'C_p' => (string) ($plano['C_p'] ?? ''),
            'L_n' => (string) ($plano['L_n'] ?? ''),
            'C_u' => (string) ($plano['C_u'] ?? $plano['C_u_previsto'] ?? ''),
            'refile' => $plano['refile'] ?? null,
            'sobra' => $plano['sobra'] ?? null,
            'area_consumida' => isset($plano['area_consumida']) ? (string) $plano['area_consumida'] : null,
            'area_retorno' => self::areaRetorno($plano),
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
