<?php

namespace App\Support;

/**
 * Encaixe do rolo acabado na caixa já escolhida.
 *
 * Confere o comprimento do rolo (largura da etiqueta) com os três lados
 * da caixa. Não calcula diâmetro enrolado, não muda quantidade nem preço.
 */
final class RoloCaixaEncaixe
{
    /**
     * @param  list<string>|null  $ladosCaixaMm
     * @return array{status: string, rolo_mm: ?string, caixa: ?string, texto: ?string}
     */
    public static function avaliar(?string $larguraCm, ?array $ladosCaixaMm, ?string $rotuloCaixa = null): array
    {
        $rolo = self::mmDaLargura($larguraCm);
        $lados = self::lados($ladosCaixaMm);
        if ($rolo === null || $lados === null) {
            return [
                'status' => 'sem_dados',
                'rolo_mm' => $rolo,
                'caixa' => $rotuloCaixa,
                'texto' => null,
            ];
        }

        $maior = $lados[0];
        foreach ($lados as $lado) {
            if (bccomp($lado, $maior, PadraoDecimal::SCALE_DIM) > 0) {
                $maior = $lado;
            }
        }
        $rotulo = $rotuloCaixa !== null && $rotuloCaixa !== ''
            ? $rotuloCaixa
            : implode('x', array_map(self::rotuloMm(...), $lados));
        $roloTxt = self::rotuloMm($rolo);
        $maiorTxt = self::rotuloMm($maior);

        if (bccomp($maior, $rolo, PadraoDecimal::SCALE_DIM) >= 0) {
            return [
                'status' => 'cabe',
                'rolo_mm' => $rolo,
                'caixa' => $rotulo,
                'texto' => "O rolo de {$roloTxt} mm cabe na caixa {$rotulo}.",
            ];
        }

        return [
            'status' => 'nao_cabe',
            'rolo_mm' => $rolo,
            'caixa' => $rotulo,
            'texto' => "O rolo de {$roloTxt} mm é mais longo que o maior lado da caixa {$rotulo} ({$maiorTxt} mm).",
        ];
    }

    private static function mmDaLargura(?string $larguraCm): ?string
    {
        $cm = PadraoDecimal::parse($larguraCm);
        if ($cm === null || bccomp($cm, '0', PadraoDecimal::SCALE_DIM) <= 0) {
            return null;
        }
        if (! PadraoDecimal::hasValidScale($cm, PadraoDecimal::SCALE_DIM)) {
            return null;
        }

        return bcmul($cm, '10', PadraoDecimal::SCALE_DIM);
    }

    /**
     * @param  list<string>|null  $lados
     * @return list<string>|null
     */
    private static function lados(?array $lados): ?array
    {
        if ($lados === null || count($lados) < 3) {
            return null;
        }
        $out = [];
        foreach (array_slice($lados, 0, 3) as $lado) {
            $mm = CaixaMedida::normalizarMm($lado);
            if ($mm === null) {
                return null;
            }
            $out[] = $mm;
        }

        return $out;
    }

    private static function rotuloMm(string $mm): string
    {
        $n = rtrim(rtrim($mm, '0'), '.');

        return $n === '' ? '0' : $n;
    }
}
