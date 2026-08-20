<?php

namespace Tests\Unit;

use App\Services\Fiscal\FiscalEmissorPolicy;
use App\Services\Fiscal\NfeChaveAcesso;
use Tests\TestCase;

class NfeChaveAcessoTest extends TestCase
{
    public function test_valida_chave_real_do_estudo_32(): void
    {
        $chave = '31260601423183000110550010000061121000000014';
        $this->assertTrue(NfeChaveAcesso::valida($chave));
        $this->assertSame('4', NfeChaveAcesso::digitoVerificador(substr($chave, 0, 43)));
    }

    public function test_montar_gera_44_digitos_com_dv(): void
    {
        $chave = NfeChaveAcesso::montar([
            'uf' => 'MG',
            'cnpj' => '01423183000110',
            'modelo' => '55',
            'serie' => 1,
            'numero' => 6112,
            'tipo_emissao' => 1,
            'codigo_numerico' => 1,
            'ano' => 2026,
            'mes' => 6,
        ]);
        $this->assertSame(44, strlen($chave));
        $this->assertTrue(NfeChaveAcesso::valida($chave));
        $this->assertSame('31260601423183000110550010000061121000000014', $chave);
    }

    public function test_policy_recusa_homolog_e_production(): void
    {
        $policy = new FiscalEmissorPolicy;
        config(['erp.fiscal_emissor' => 'stub', 'erp.stage' => 'local']);
        $this->assertTrue($policy->permitido());

        config(['erp.stage' => 'homolog']);
        $this->assertFalse($policy->permitido());

        config(['erp.stage' => 'production']);
        $this->assertFalse($policy->permitido());

        config(['erp.fiscal_emissor' => 'focus', 'erp.stage' => 'local']);
        $this->assertFalse($policy->permitido());
    }

    public function test_hub_apto_desliga_stub(): void
    {
        $policy = new FiscalEmissorPolicy;
        config(['erp.fiscal_emissor' => 'stub', 'erp.stage' => 'local']);
        $this->assertTrue($policy->ativoNaAusenciaDoHub(false));
        $this->assertFalse($policy->ativoNaAusenciaDoHub(true));
    }
}
