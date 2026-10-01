<?php

namespace App\Services\Cadastros;

/**
 * Opções cURL do mTLS. Se o materializador gravou a cadeia em PEM
 * ao lado do PFX, a SEFAZ recebe folha + intermediárias. Sem esses
 * arquivos, permanece o PKCS#12 (assinatura XML continua no PFX).
 */
final class EmpresaCertificadoA1Tls
{
    /**
     * @return array<int, string>
     */
    public static function opcoesCurl(string $pfxPath, string $senha): array
    {
        $dir = dirname($pfxPath);
        $cert = $dir.'/tls-cert.pem';
        $key = $dir.'/tls-key.pem';
        if (is_file($cert) && is_file($key)) {
            return [
                CURLOPT_SSLCERT => $cert,
                CURLOPT_SSLKEY => $key,
            ];
        }

        return [
            CURLOPT_SSLCERT => $pfxPath,
            CURLOPT_SSLCERTPASSWD => $senha,
            CURLOPT_SSLCERTTYPE => 'P12',
        ];
    }
}
