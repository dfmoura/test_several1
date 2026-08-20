<?php

namespace App\Services\Fiscal;

/**
 * Chave de acesso NF-e (44 dígitos + DV módulo 11) — layout SEFAZ.
 * Usada pelo emissor de teste para o DANFE acompanhar o fluxo; não é chave do fisco.
 */
final class NfeChaveAcesso
{
    /** cUF IBGE por UF. */
    private const CUF = [
        'RO' => '11', 'AC' => '12', 'AM' => '13', 'RR' => '14', 'PA' => '15', 'AP' => '16', 'TO' => '17',
        'MA' => '21', 'PI' => '22', 'CE' => '23', 'RN' => '24', 'PB' => '25', 'PE' => '26', 'AL' => '27', 'SE' => '28', 'BA' => '29',
        'MG' => '31', 'ES' => '32', 'RJ' => '33', 'SP' => '35',
        'PR' => '41', 'SC' => '42', 'RS' => '43',
        'MS' => '50', 'MT' => '51', 'GO' => '52', 'DF' => '53',
    ];

    /**
     * @param  array{
     *   uf?: string,
     *   cnpj: string,
     *   modelo?: string,
     *   serie?: int,
     *   numero: int,
     *   tipo_emissao?: int,
     *   codigo_numerico?: int,
     *   ano?: int,
     *   mes?: int
     * }  $p
     */
    public static function montar(array $p): string
    {
        $cuf = self::cuf((string) ($p['uf'] ?? 'MG'));
        $ano = (int) ($p['ano'] ?? now()->year);
        $mes = (int) ($p['mes'] ?? now()->month);
        $aamm = sprintf('%02d%02d', $ano % 100, max(1, min(12, $mes)));
        $cnpj = str_pad(preg_replace('/\D/', '', (string) $p['cnpj']) ?: '0', 14, '0', STR_PAD_LEFT);
        $mod = str_pad(preg_replace('/\D/', '', (string) ($p['modelo'] ?? '55')) ?: '55', 2, '0', STR_PAD_LEFT);
        $serie = str_pad((string) max(0, (int) ($p['serie'] ?? 1)), 3, '0', STR_PAD_LEFT);
        $nnf = str_pad((string) max(1, (int) $p['numero']), 9, '0', STR_PAD_LEFT);
        $tpEmis = (string) max(1, min(9, (int) ($p['tipo_emissao'] ?? 9)));
        $cnf = str_pad((string) max(0, (int) ($p['codigo_numerico'] ?? 0)), 8, '0', STR_PAD_LEFT);

        $base = $cuf.$aamm.$cnpj.$mod.$serie.$nnf.$tpEmis.$cnf;

        return $base.self::digitoVerificador($base);
    }

    public static function valida(string $chave): bool
    {
        $d = preg_replace('/\D/', '', $chave) ?: '';
        if (strlen($d) !== 44) {
            return false;
        }

        return self::digitoVerificador(substr($d, 0, 43)) === $d[43];
    }

    public static function cuf(string $uf): string
    {
        $uf = strtoupper(trim($uf));

        return self::CUF[$uf] ?? '31';
    }

    public static function digitoVerificador(string $base43): string
    {
        $base43 = preg_replace('/\D/', '', $base43) ?: '';
        $base43 = str_pad(substr($base43, 0, 43), 43, '0', STR_PAD_LEFT);
        $soma = 0;
        $peso = 2;
        for ($i = 42; $i >= 0; $i--) {
            $soma += (int) $base43[$i] * $peso;
            $peso++;
            if ($peso > 9) {
                $peso = 2;
            }
        }
        $resto = $soma % 11;

        return $resto < 2 ? '0' : (string) (11 - $resto);
    }
}
