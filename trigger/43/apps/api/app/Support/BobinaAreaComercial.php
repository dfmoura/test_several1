<?php

namespace App\Support;

use App\Models\Produto;
use Illuminate\Validation\ValidationException;

/**
 * Converte área física (m²) de bobina para quantidade na unidade comercial do SKU.
 * Norma: ADR_UNIDADES_PRODUTO — 1 comercial = fator × interna (interna = M2).
 */
final class BobinaAreaComercial
{
    /**
     * @throws ValidationException
     */
    public static function fromAreaM2(Produto $produto, string $areaM2, ?string $fieldKey = null): string
    {
        $areaM2 = PadraoDecimal::roundHalfUp($areaM2, PadraoDecimal::SCALE_QTY);
        $com = self::normUnidade((string) ($produto->unidade_comercial ?? ''));
        $int = self::normUnidade((string) ($produto->unidade_interna ?? ''));

        if ($com === 'M2' || $com === '') {
            return $areaM2;
        }

        $key = $fieldKey ?? 'composicao';
        if ($int !== 'M2') {
            throw ValidationException::withMessages([
                $key => [
                    'Composição (m²) exige unidade interna M2 (ou comercial M2). '
                    .'Ajuste o cadastro do produto '.$produto->codigo.' (hoje '.$com.'/'.$int.').',
                ],
            ]);
        }

        $fator = PadraoDecimal::parseStrict(
            (string) ($produto->fator_conversao ?? '1'),
            PadraoDecimal::SCALE_FACTOR
        );
        if ($fator === null || bccomp($fator, '0', PadraoDecimal::SCALE_FACTOR) <= 0) {
            throw ValidationException::withMessages([
                $key => [
                    'Produto com composição em m² precisa de fator_conversao válido para converter à unidade comercial '.$com.'.',
                ],
            ]);
        }

        // qtde_comercial = area_interna / fator  (1 comercial = fator × interna)
        return PadraoDecimal::roundHalfUp(
            bcdiv($areaM2, $fator, PadraoDecimal::SCALE_QTY + 6),
            PadraoDecimal::SCALE_QTY
        );
    }

    private static function normUnidade(string $raw): string
    {
        $u = strtoupper(trim($raw));

        return str_replace('M²', 'M2', $u);
    }
}
