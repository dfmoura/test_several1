<?php

namespace Tests\Unit;

use App\Services\Cadastros\EmpresaCertificadoA1Cadeia;
use App\Services\Cadastros\EmpresaCertificadoA1Tls;
use Tests\TestCase;

class EmpresaCertificadoA1CadeiaTest extends TestCase
{
    public function test_envia_folha_intermediaria_e_raiz_no_fim(): void
    {
        $senha = 'Cadeia-Teste!';
        $pfx = $this->exportarCadeia($senha, true);

        $resumo = (new EmpresaCertificadoA1Cadeia)->resumir($pfx, $senha);

        $this->assertFalse($resumo['incompleta']);
        $this->assertSame(1, $resumo['intermediarios']);
        $this->assertSame(0, $resumo['raizes_omitidas']);
        $this->assertStringContainsString('BEGIN PRIVATE KEY', $resumo['key_pem']);

        $cns = $this->cns($resumo['cert_pem']);
        $this->assertSame(['Empresa Folha', 'AC Intermediaria Teste', 'AC Raiz Teste'], $cns);
    }

    public function test_pfx_sem_intermediaria_marca_cadeia_incompleta(): void
    {
        $senha = 'Cadeia-Teste!';
        $pfx = $this->exportarCadeia($senha, false);

        $resumo = (new EmpresaCertificadoA1Cadeia)->resumir($pfx, $senha);

        $this->assertTrue($resumo['incompleta']);
        $this->assertSame(0, $resumo['intermediarios']);
        $this->assertSame(['Empresa Folha'], $this->cns($resumo['cert_pem']));
    }

    public function test_autoassinado_nao_e_cadeia_incompleta(): void
    {
        $senha = 'Cadeia-Teste!';
        $key = $this->chave();
        $csr = openssl_csr_new(['commonName' => 'Empresa Sozinha'], $key, ['digest_alg' => 'sha256']);
        $this->assertNotFalse($csr);
        $cert = openssl_csr_sign($csr, null, $key, 30, ['digest_alg' => 'sha256']);
        $this->assertNotFalse($cert);
        $pfx = '';
        $this->assertTrue(openssl_pkcs12_export($cert, $pfx, $key, $senha));

        $resumo = (new EmpresaCertificadoA1Cadeia)->resumir($pfx, $senha);

        $this->assertFalse($resumo['incompleta']);
        $this->assertSame(0, $resumo['intermediarios']);
    }

    public function test_curl_prefere_pem_da_cadeia_quando_os_arquivos_existem(): void
    {
        $dir = sys_get_temp_dir().'/a1_tls_'.bin2hex(random_bytes(4));
        mkdir($dir, 0700, true);
        $pfx = $dir.'/cert.pfx';
        file_put_contents($pfx, 'pfx');
        file_put_contents($dir.'/tls-cert.pem', "cert\n");
        file_put_contents($dir.'/tls-key.pem', "key\n");

        $opcoes = EmpresaCertificadoA1Tls::opcoesCurl($pfx, 'senha');

        $this->assertSame($dir.'/tls-cert.pem', $opcoes[CURLOPT_SSLCERT]);
        $this->assertSame($dir.'/tls-key.pem', $opcoes[CURLOPT_SSLKEY]);
        $this->assertArrayNotHasKey(CURLOPT_SSLCERTTYPE, $opcoes);

        @unlink($dir.'/tls-cert.pem');
        @unlink($dir.'/tls-key.pem');
        @unlink($pfx);
        @rmdir($dir);
    }

    public function test_curl_cai_no_pfx_sem_pem(): void
    {
        $opcoes = EmpresaCertificadoA1Tls::opcoesCurl('/tmp/inexistente/cert.pfx', 'senha');

        $this->assertSame('/tmp/inexistente/cert.pfx', $opcoes[CURLOPT_SSLCERT]);
        $this->assertSame('P12', $opcoes[CURLOPT_SSLCERTTYPE]);
        $this->assertSame('senha', $opcoes[CURLOPT_SSLCERTPASSWD]);
    }

    private function exportarCadeia(string $senha, bool $comExtras): string
    {
        $rootKey = $this->chave();
        $root = $this->assinar(['commonName' => 'AC Raiz Teste'], $rootKey, null, $rootKey);

        $intKey = $this->chave();
        $int = $this->assinar(['commonName' => 'AC Intermediaria Teste'], $intKey, $root, $rootKey);

        $leafKey = $this->chave();
        $leaf = $this->assinar(['commonName' => 'Empresa Folha'], $leafKey, $int, $intKey);

        $pfx = '';
        $extras = [];
        if ($comExtras) {
            $rootPem = '';
            $intPem = '';
            openssl_x509_export($root, $rootPem);
            openssl_x509_export($int, $intPem);
            $extras = ['extracerts' => [$rootPem, $intPem]];
        }
        $this->assertTrue(openssl_pkcs12_export($leaf, $pfx, $leafKey, $senha, $extras));

        return $pfx;
    }

    /**
     * @param  array<string, string>  $dn
     * @param  \OpenSSLAsymmetricKey|false  $key
     * @param  \OpenSSLCertificate|false|null  $issuer
     * @param  \OpenSSLAsymmetricKey|false  $issuerKey
     * @return \OpenSSLCertificate
     */
    private function assinar(array $dn, $key, $issuer, $issuerKey)
    {
        $this->assertNotFalse($key);
        $this->assertNotFalse($issuerKey);
        $csr = openssl_csr_new($dn, $key, ['digest_alg' => 'sha256']);
        $this->assertNotFalse($csr);
        $cert = openssl_csr_sign($csr, $issuer, $issuerKey, 30, ['digest_alg' => 'sha256']);
        $this->assertNotFalse($cert);

        return $cert;
    }

    /** @return \OpenSSLAsymmetricKey */
    private function chave()
    {
        $key = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);
        $this->assertNotFalse($key);

        return $key;
    }

    /** @return list<string> */
    private function cns(string $pem): array
    {
        preg_match_all('/-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----/s', $pem, $m);
        $cns = [];
        foreach ($m[0] as $bloco) {
            $parsed = openssl_x509_parse($bloco);
            $this->assertIsArray($parsed);
            $cns[] = (string) ($parsed['subject']['CN'] ?? '');
        }

        return $cns;
    }
}
