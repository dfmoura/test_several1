<?php

namespace Tests\Unit;

use App\Support\CaixaMedida;
use PHPUnit\Framework\TestCase;

class CaixaMedidaTest extends TestCase
{
    public function test_rotulo_e_casa_independem_da_ordem_dos_lados(): void
    {
        $attrs = ['comp_mm' => '250', 'larg_mm' => '200', 'alt_mm' => '200'];

        $this->assertSame('250x200x200', CaixaMedida::rotulo($attrs));
        $this->assertTrue(CaixaMedida::casaAtributos($attrs, '200x250x200'));
        $this->assertFalse(CaixaMedida::casaAtributos($attrs, '500x300x300'));
    }

    public function test_sem_tripla_deixa_o_texto_decidir(): void
    {
        $this->assertNull(CaixaMedida::casaAtributos(['comp_mm' => '250'], '250x200x200'));
        $this->assertNull(CaixaMedida::casaAtributos(
            ['comp_mm' => '500', 'larg_mm' => '300', 'alt_mm' => '300'],
            '500x300',
        ));
        $this->assertNull(CaixaMedida::rotulo(null));
    }

    public function test_canonicas_cobrem_as_nove_caixas(): void
    {
        $this->assertCount(9, CaixaMedida::CANONICAS);
        $this->assertSame(
            ['comp_mm' => '540', 'larg_mm' => '405', 'alt_mm' => '335'],
            CaixaMedida::atributosDoCodigo('EMB-CX-009'),
        );
        $this->assertNull(CaixaMedida::atributosDoCodigo('EMB-CX-099'));
    }
}
