<?php

namespace Tests\Unit;

use App\Services\Fiscal\Nfse\NfsePedRegBuilder;
use App\Services\Fiscal\Sefaz\NfeXmlSigner;
use RuntimeException;
use Tests\TestCase;

class NfsePedRegTest extends TestCase
{
    public function test_pedido_de_cancelamento_segue_o_evento_e101101(): void
    {
        $chave = '31702062253369941000163000000000000926076272894013';
        $xml = (new NfsePedRegBuilder)->xml($chave, '53369941000163', '1', 'Erro na emissao da nota', 2);

        $this->assertStringContainsString('<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">', $xml);
        $this->assertStringContainsString('<infPedReg Id="PRE'.$chave.'101101">', $xml);
        $this->assertSame(59, strlen('PRE'.$chave.'101101'));
        $this->assertStringContainsString('<e101101>', $xml);
        $this->assertStringContainsString('<cMotivo>1</cMotivo>', $xml);
        $this->assertStringContainsString('<xMotivo>Erro na emissao da nota</xMotivo>', $xml);
        $this->assertStringContainsString('<tpAmb>2</tpAmb>', $xml);
    }

    public function test_motivo_curto_nao_monta_o_pedido(): void
    {
        $this->expectException(RuntimeException::class);
        (new NfsePedRegBuilder)->motivo('curto');
    }

    public function test_evento_assina_no_perfil_da_nfse(): void
    {
        if (! $this->opensslCli()) {
            $this->markTestSkipped('openssl CLI indisponível');
        }
        $dir = sys_get_temp_dir().'/nfse-evt-'.bin2hex(random_bytes(4));
        mkdir($dir);
        $p12 = $dir.'/a1.p12';
        exec(
            'openssl req -x509 -newkey rsa:2048 -keyout '.$dir.'/key.pem -out '.$dir.'/cert.pem -days 1 -nodes -subj /CN=nfse-evt >/dev/null 2>&1'
            .' && openssl pkcs12 -export -out '.$p12.' -inkey '.$dir.'/key.pem -in '.$dir.'/cert.pem -passout pass:secret >/dev/null 2>&1',
            $out,
            $code
        );
        $this->assertSame(0, $code);

        $chave = str_repeat('1', 50);
        $xml = (new NfsePedRegBuilder)->xml($chave, '11222333000181', '2', 'Servico nao foi prestado', 1);
        $assinada = (new NfeXmlSigner)->assinarInfPedReg($xml, ['path' => $p12, 'senha' => 'secret']);

        $this->assertStringContainsString('rsa-sha256', $assinada);
        $this->assertStringNotContainsString('rsa-sha1', $assinada);
        $this->assertStringContainsString('infPedReg', $assinada);
    }

    private function opensslCli(): bool
    {
        exec('openssl version', $out, $code);

        return $code === 0;
    }
}
