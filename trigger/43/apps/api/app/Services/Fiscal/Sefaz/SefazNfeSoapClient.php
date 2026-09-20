<?php

namespace App\Services\Fiscal\Sefaz;

use RuntimeException;

/**
 * Cliente SOAP genérico com mTLS A1 (mesmo espírito do DF-e).
 */
final class SefazNfeSoapClient
{
    /**
     * @param  array{path: string, senha: string}  $cert
     */
    public function post(string $url, string $soapAction, string $body, array $cert): string
    {
        if (! is_file($cert['path'] ?? '')) {
            throw new RuntimeException('Arquivo temporário do A1 indisponível para SEFAZ NF-e.');
        }

        $timeout = max(5, (int) ceil((float) config('erp.nfe.timeout_sec', 60)));

        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Falha ao iniciar HTTP para SEFAZ NF-e.');
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/soap+xml; charset=utf-8; action="'.$soapAction.'"',
            ],
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_SSLCERT => $cert['path'],
            CURLOPT_SSLCERTPASSWD => $cert['senha'],
            CURLOPT_SSLCERTTYPE => 'P12',
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => min(20, $timeout),
        ]);

        $resp = curl_exec($ch);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || ! is_string($resp) || $resp === '') {
            throw new RuntimeException('Falha de rede na SEFAZ NF-e: '.($err !== '' ? $err : 'resposta vazia'));
        }
        if ($http >= 400) {
            throw new RuntimeException('SEFAZ NF-e HTTP '.$http.'.');
        }

        return $resp;
    }

    public function envelope(string $innerXml, string $nsWsdl): string
    {
        return '<?xml version="1.0" encoding="utf-8"?>'
            .'<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
            .' xmlns:xsd="http://www.w3.org/2001/XMLSchema"'
            .' xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">'
            .'<soap12:Body>'
            .'<nfeDadosMsg xmlns="'.$nsWsdl.'">'.$innerXml.'</nfeDadosMsg>'
            .'</soap12:Body>'
            .'</soap12:Envelope>';
    }
}
