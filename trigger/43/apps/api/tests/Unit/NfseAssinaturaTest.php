<?php

namespace Tests\Unit;

use App\Services\Fiscal\Sefaz\NfeXmlSigner;
use Tests\TestCase;

class NfseAssinaturaTest extends TestCase
{
    public function test_dps_assina_sha256_e_nfe_permanece_sha1(): void
    {
        if (! $this->opensslCli()) {
            $this->markTestSkipped('openssl CLI indisponível');
        }

        $dir = sys_get_temp_dir().'/nfse-sign-'.bin2hex(random_bytes(4));
        mkdir($dir);
        $p12 = $dir.'/a1.p12';
        $cmd = 'openssl req -x509 -newkey rsa:2048 -keyout '.$dir.'/key.pem -out '.$dir.'/cert.pem -days 1 -nodes -subj /CN=nfse-test >/dev/null 2>&1'
            .' && openssl pkcs12 -export -out '.$p12.' -inkey '.$dir.'/key.pem -in '.$dir.'/cert.pem -passout pass:secret >/dev/null 2>&1';
        exec($cmd, $out, $code);
        $this->assertSame(0, $code);
        $cert = ['path' => $p12, 'senha' => 'secret'];
        $signer = new NfeXmlSigner;

        $dps = '<?xml version="1.0" encoding="UTF-8"?><DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01"><infDPS Id="DPS1"><tpAmb>2</tpAmb></infDPS></DPS>';
        $assinada = $signer->assinarInfDps($dps, $cert);
        $this->assertStringContainsString('http://www.w3.org/2001/04/xmldsig-more#rsa-sha256', $assinada);
        $this->assertStringContainsString('http://www.w3.org/2001/04/xmlenc#sha256', $assinada);
        $this->assertStringContainsString('http://www.w3.org/2001/10/xml-exc-c14n#WithComments', $assinada);
        $this->assertStringNotContainsString('rsa-sha1', $assinada);

        $nfe = '<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe1"><ide><cUF>31</cUF></ide></infNFe></NFe>';
        $nfeAssinada = $signer->assinarNfe($nfe, $cert);
        $this->assertStringContainsString('http://www.w3.org/2000/09/xmldsig#rsa-sha1', $nfeAssinada);
        $this->assertStringNotContainsString('rsa-sha256', $nfeAssinada);
    }

    private function opensslCli(): bool
    {
        exec('openssl version >/dev/null 2>&1', $out, $code);

        return $code === 0;
    }
}
