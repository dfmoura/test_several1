<?php

namespace Tests\Unit;

use App\Services\Fiscal\Nfse\NfseCanal;
use Tests\TestCase;

class NfseCanalTest extends TestCase
{
    public function test_stage_operacional_usa_sefin_e_adn_oficiais(): void
    {
        config([
            'erp.nfse.driver' => '',
            'erp.nfse.caixa_driver' => '',
            'erp.nfse.stages_permitidos' => ['local', 'homolog', 'production'],
            'erp.stage' => 'local',
        ]);
        $this->assertSame('sefin', NfseCanal::emissao());
        $this->assertSame('adn', NfseCanal::caixa());
        $this->assertFalse(NfseCanal::producao());
        $this->assertTrue(NfseCanal::adnProducao());

        config(['erp.nfse.adn_ambiente' => 'restrita']);
        $this->assertFalse(NfseCanal::adnProducao());
        config(['erp.nfse.adn_ambiente' => '']);

        config(['erp.stage' => 'production']);
        $this->assertTrue(NfseCanal::producao());
        $this->assertTrue(NfseCanal::adnProducao());
        $this->assertSame('sefin', NfseCanal::emissao());
    }

    public function test_testing_permanece_desligado_salvo_driver_explicito(): void
    {
        config([
            'erp.nfse.driver' => '',
            'erp.nfse.caixa_driver' => '',
            'erp.nfse.stages_permitidos' => ['local', 'homolog', 'production'],
            'erp.stage' => 'testing',
        ]);
        $this->assertSame('off', NfseCanal::emissao());
        $this->assertSame('off', NfseCanal::caixa());

        config(['erp.nfse.driver' => 'fake']);
        $this->assertSame('fake', NfseCanal::emissao());
    }

    public function test_numero_oficial_sai_da_chave(): void
    {
        $chave = '31702062'.'2'.str_repeat('1', 14).'0000000000042'.'2610'.str_repeat('3', 9).'8';
        $this->assertSame(50, strlen($chave));
        $this->assertSame('42', NfseCanal::numeroNaChave($chave));
    }
}
