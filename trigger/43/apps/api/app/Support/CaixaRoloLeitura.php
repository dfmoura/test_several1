<?php

namespace App\Support;

/**
 * Quais caixas cadastradas acomodam a face do rolo (largura da etiqueta).
 *
 * Usa a mesma conferência de RoloCaixaEncaixe. Não escolhe caixa,
 * não calcula diâmetro enrolado e não altera preço nem quantidade.
 */
final class CaixaRoloLeitura
{
    /**
     * @param  list<array{codigo: string, descricao: string, medida: string, lados: list<string>}>  $caixas
     * @return array{
     *   largura_mm: ?string,
     *   caixas: list<array{codigo: string, descricao: string, medida: string, cabe: bool}>
     * }
     */
    public static function avaliar(?string $larguraCm, array $caixas): array
    {
        $amostra = $caixas[0]['lados'] ?? null;
        $bruta = RoloCaixaEncaixe::avaliar($larguraCm, is_array($amostra) ? $amostra : null)['rolo_mm'];
        $larguraMm = $bruta !== null ? self::rotuloMm($bruta) : null;

        $out = [];
        foreach ($caixas as $caixa) {
            $medida = trim($caixa['medida']);
            if ($medida === '') {
                continue;
            }
            $status = RoloCaixaEncaixe::avaliar($larguraCm, $caixa['lados'], $medida)['status'];
            $out[] = [
                'codigo' => $caixa['codigo'],
                'descricao' => $caixa['descricao'],
                'medida' => $medida,
                'cabe' => $status === 'cabe',
            ];
        }

        return [
            'largura_mm' => $larguraMm,
            'caixas' => $out,
        ];
    }

    private static function rotuloMm(string $mm): string
    {
        $n = rtrim(rtrim($mm, '0'), '.');

        return $n === '' ? '0' : $n;
    }
}
