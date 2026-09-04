<?php

namespace App\Services\Fiscal\Dfe;

/**
 * Cliente NFeDistribuicaoDFe (Ambiente Nacional). Sem Focus.
 */
interface DfeDistribuicaoClient
{
    /**
     * @param  non-empty-string  $cnpj  14 dígitos
     * @param  non-empty-string  $cUfAutor  cUF IBGE (ex. 31 = MG)
     * @param  non-empty-string  $ultNsu  15 dígitos
     * @param  non-empty-string  $pfxPath  PKCS#12 em disco temporário
     */
    public function distNsu(
        string $cnpj,
        string $cUfAutor,
        string $ultNsu,
        string $pfxPath,
        string $senhaPfx,
        int $tpAmb,
    ): DfeDistribuicaoResultado;

    /**
     * Consulta documento por chave (após ciência / quando o AN disponibiliza o XML).
     *
     * @param  non-empty-string  $chave  44 dígitos
     */
    public function consChNFe(
        string $cnpj,
        string $cUfAutor,
        string $chave,
        string $pfxPath,
        string $senhaPfx,
        int $tpAmb,
    ): DfeDistribuicaoResultado;
}
