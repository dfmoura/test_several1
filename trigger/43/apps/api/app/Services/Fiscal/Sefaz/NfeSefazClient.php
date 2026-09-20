<?php

namespace App\Services\Fiscal\Sefaz;

/**
 * Contrato do canal SEFAZ de saída NF-e (autorização + eventos).
 */
interface NfeSefazClient
{
    /**
     * @param  array{path: string, senha: string}  $cert
     */
    public function autorizar(
        string $uf,
        int $tpAmb,
        string $xmlNfeAssinado,
        array $cert,
    ): NfeSefazResultado;

    /**
     * @param  array{path: string, senha: string}  $cert
     */
    public function consultarRecibo(
        string $uf,
        int $tpAmb,
        string $recibo,
        array $cert,
        ?string $xmlNfeAssinado = null,
    ): NfeSefazResultado;

    /**
     * @param  array{path: string, senha: string}  $cert
     */
    public function enviarEvento(
        string $uf,
        int $tpAmb,
        string $xmlEventoAssinado,
        array $cert,
    ): NfeSefazResultado;
}
