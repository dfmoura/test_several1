<?php

namespace Tests\Unit;

use App\Services\Fiscal\Dfe\DfeDistribuicaoResultado;
use App\Services\Fiscal\Dfe\SefazNfeDistribuicaoClient;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class DfeSoapEnvelopeTest extends TestCase
{
    public function test_envelope_nao_escapa_dist_dfe_int(): void
    {
        $client = new SefazNfeDistribuicaoClient;
        $m = new ReflectionMethod($client, 'montarEnvelope');
        $m->setAccessible(true);
        $dist = '<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>2</tpAmb></distDFeInt>';
        $soap = $m->invoke($client, $dist);

        $this->assertStringContainsString('<nfeDadosMsg><distDFeInt', $soap);
        $this->assertStringNotContainsString('&lt;distDFeInt', $soap);
    }

    public function test_rejeicao_nao_conta_como_esgotado(): void
    {
        $r = new DfeDistribuicaoResultado('225', 'Rejeicao: XML mal formado', '000000000000000', '000000000000000', []);
        $this->assertTrue($r->rejeitado());
        $this->assertFalse($r->esgotado());
        $this->assertFalse($r->ok());
    }

    public function test_137_esgota_e_138_igual_esgota(): void
    {
        $vazio = new DfeDistribuicaoResultado('137', 'Nenhum documento', '000000000000010', '000000000000010', []);
        $this->assertTrue($vazio->esgotado());
        $this->assertTrue($vazio->ok());

        $igual = new DfeDistribuicaoResultado('138', 'Documento localizado', '000000000000005', '000000000000005', []);
        $this->assertTrue($igual->esgotado());
    }
}
