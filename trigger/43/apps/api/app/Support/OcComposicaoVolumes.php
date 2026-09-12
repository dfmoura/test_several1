<?php

namespace App\Support;

use App\Models\OrdemCompraItemComposicao;
use Illuminate\Support\Collection;

/**
 * Expande composição do pedido (OC) em volumes sugeridos na conferência.
 * Norma: ADR_OC_RASCUNHO_ENVIO · ADR_ENTRADA_XML_ASSIST — XML prevalece; isto é fallback.
 *
 * qtde de cada volume = unidade comercial do SKU (m² físicos convertidos via fator quando com≠M2).
 * Σ m² físico para confronto continua em somaAreaM2().
 *
 * nLote vazio → código interno provisório determinístico (não aleatório), editável.
 * Formato: INT-{OC}-I{ordem}-{LxC}-{seq}  (máx. 60; prefixo INT = não é lote do fornecedor).
 */
final class OcComposicaoVolumes
{
    public const CODIGO_PREFIXO = 'INT';

    /**
     * @param  iterable<int, OrdemCompraItemComposicao|array<string, mixed>>  $composicoes
     * @return list<array{
     *   codigo: string,
     *   qtde: string,
     *   data_entrada: ?string,
     *   data_fabricacao: ?string,
     *   data_validade: ?string,
     *   largura_mm: string,
     *   comprimento_m: string,
     *   fonte: string
     * }>
     */
    public static function expandir(
        iterable $composicoes,
        ?string $dataEntrada = null,
        ?string $ocCodigo = null,
        ?int $itemOrdem = null,
        ?\App\Models\Produto $produto = null,
    ): array {
        $out = [];
        $seq = 1;
        foreach ($composicoes as $raw) {
            $largura = self::str($raw, 'largura_mm');
            $quantidade = self::str($raw, 'quantidade');
            $comprimento = self::str($raw, 'comprimento_m');
            $areaFaixa = self::str($raw, 'area_m2');

            if ($largura === null || $quantidade === null || $comprimento === null) {
                continue;
            }
            if (bccomp($largura, '0', PadraoDecimal::SCALE_DIM) <= 0
                || bccomp($quantidade, '0', PadraoDecimal::SCALE_QTY) <= 0
                || bccomp($comprimento, '0', PadraoDecimal::SCALE_DIM) <= 0) {
                continue;
            }

            $largura = PadraoDecimal::roundHalfUp($largura, PadraoDecimal::SCALE_DIM);
            $quantidade = PadraoDecimal::roundHalfUp($quantidade, PadraoDecimal::SCALE_QTY);
            $comprimento = PadraoDecimal::roundHalfUp($comprimento, PadraoDecimal::SCALE_DIM);
            $areaUnit = NfeExactDimensoes::areaM2($largura, $comprimento);

            if ($areaFaixa === null || bccomp($areaFaixa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                $areaFaixa = PadraoDecimal::roundHalfUp(
                    bcmul($quantidade, $areaUnit, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
            } else {
                $areaFaixa = PadraoDecimal::roundHalfUp($areaFaixa, PadraoDecimal::SCALE_QTY);
            }

            $nBobinas = self::bobinasInteiras($quantidade);
            if ($nBobinas !== null && $nBobinas >= 1 && $nBobinas <= 500) {
                for ($i = 0; $i < $nBobinas; $i++) {
                    $out[] = self::volumeStub(
                        self::qtdeComercial($produto, $areaUnit),
                        $largura,
                        $comprimento,
                        $dataEntrada,
                        self::codigoInterno($ocCodigo, $itemOrdem, $largura, $comprimento, $seq),
                    );
                    $seq++;
                }
            } else {
                $out[] = self::volumeStub(
                    self::qtdeComercial($produto, $areaFaixa),
                    $largura,
                    $comprimento,
                    $dataEntrada,
                    self::codigoInterno($ocCodigo, $itemOrdem, $largura, $comprimento, $seq),
                );
                $seq++;
            }
        }

        return $out;
    }

    /**
     * Código interno provisório — determinístico, auditável, ≠ nLote de fornecedor.
     */
    public static function codigoInterno(
        ?string $ocCodigo,
        ?int $itemOrdem,
        string $larguraMm,
        string $comprimentoM,
        int $seq,
    ): string {
        $oc = self::slugOc($ocCodigo);
        $item = 'I'.str_pad((string) max(1, $itemOrdem ?? 1), 2, '0', STR_PAD_LEFT);
        $dim = self::dimSlug($larguraMm).'x'.self::dimSlug($comprimentoM);
        $n = str_pad((string) max(1, $seq), 2, '0', STR_PAD_LEFT);
        $codigo = self::CODIGO_PREFIXO.'-'.$oc.'-'.$item.'-'.$dim.'-'.$n;
        if (strlen($codigo) <= 60) {
            return $codigo;
        }

        // Encolhe OC se estourar max do lote (60).
        $ocCurto = substr($oc, 0, max(4, 60 - strlen(self::CODIGO_PREFIXO.'--'.$item.'-'.$dim.'-'.$n)));

        return self::CODIGO_PREFIXO.'-'.$ocCurto.'-'.$item.'-'.$dim.'-'.$n;
    }

    /**
     * Σ m² físicos das faixas (confronto pedido × NF) — independente da un. comercial.
     *
     * @param  Collection<int, OrdemCompraItemComposicao>|iterable<int, OrdemCompraItemComposicao|array<string, mixed>>  $composicoes
     */
    public static function somaAreaM2(iterable $composicoes): string
    {
        $sum = '0';
        foreach ($composicoes as $raw) {
            $area = self::str($raw, 'area_m2');
            if ($area !== null && bccomp($area, '0', PadraoDecimal::SCALE_QTY) > 0) {
                $sum = bcadd($sum, $area, PadraoDecimal::SCALE_QTY + 2);

                continue;
            }
            $largura = self::str($raw, 'largura_mm');
            $quantidade = self::str($raw, 'quantidade');
            $comprimento = self::str($raw, 'comprimento_m');
            if ($largura === null || $quantidade === null || $comprimento === null) {
                continue;
            }
            $areaUnit = NfeExactDimensoes::areaM2($largura, $comprimento);
            $sum = bcadd(
                $sum,
                bcmul($quantidade, $areaUnit, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY + 2
            );
        }

        return PadraoDecimal::roundHalfUp($sum, PadraoDecimal::SCALE_QTY);
    }

    private static function qtdeComercial(?\App\Models\Produto $produto, string $areaM2): string
    {
        if ($produto === null) {
            return PadraoDecimal::roundHalfUp($areaM2, PadraoDecimal::SCALE_QTY);
        }

        return BobinaAreaComercial::fromAreaM2($produto, $areaM2);
    }

    /**
     * @return array{
     *   codigo: string,
     *   qtde: string,
     *   data_entrada: ?string,
     *   data_fabricacao: ?string,
     *   data_validade: ?string,
     *   largura_mm: string,
     *   comprimento_m: string,
     *   fonte: string
     * }
     */
    private static function volumeStub(
        string $qtde,
        string $largura,
        string $comprimento,
        ?string $dataEntrada,
        string $codigo,
    ): array {
        return [
            'codigo' => $codigo,
            'qtde' => PadraoDecimal::roundHalfUp($qtde, PadraoDecimal::SCALE_QTY),
            'data_entrada' => $dataEntrada,
            'data_fabricacao' => null,
            'data_validade' => null,
            'largura_mm' => $largura,
            'comprimento_m' => $comprimento,
            'fonte' => 'oc_composicao',
        ];
    }

    private static function slugOc(?string $ocCodigo): string
    {
        $raw = strtoupper(trim((string) $ocCodigo));
        if ($raw === '') {
            return 'OC';
        }
        $slug = preg_replace('/[^A-Z0-9]+/', '', $raw) ?? 'OC';

        return $slug !== '' ? $slug : 'OC';
    }

    private static function dimSlug(string $decimal): string
    {
        $v = PadraoDecimal::roundHalfUp($decimal, PadraoDecimal::SCALE_DIM);
        if (str_contains($v, '.')) {
            $v = rtrim(rtrim($v, '0'), '.');
        }

        return $v !== '' ? $v : '0';
    }

    private static function bobinasInteiras(string $quantidade): ?int
    {
        if (! preg_match('/^\d+(\.0+)?$/', $quantidade)) {
            return null;
        }

        return (int) $quantidade;
    }

    /**
     * @param  OrdemCompraItemComposicao|array<string, mixed>  $raw
     */
    private static function str(mixed $raw, string $key): ?string
    {
        if ($raw instanceof OrdemCompraItemComposicao) {
            $v = $raw->{$key} ?? null;
        } elseif (is_array($raw)) {
            $v = $raw[$key] ?? null;
        } else {
            return null;
        }
        if ($v === null || $v === '') {
            return null;
        }

        return (string) $v;
    }
}
