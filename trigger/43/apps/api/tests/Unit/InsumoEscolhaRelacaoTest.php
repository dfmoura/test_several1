<?php

namespace Tests\Unit;

use App\Support\InsumoEscolhaRelacao;
use PHPUnit\Framework\TestCase;

class InsumoEscolhaRelacaoTest extends TestCase
{
    public function test_polegada_aprovada_casa_o_diametro_do_tubete(): void
    {
        $this->assertSame('3', InsumoEscolhaRelacao::chavePolegada('3"'));
        $this->assertSame('1', InsumoEscolhaRelacao::chavePolegada('1"'));
        $this->assertSame('1.5', InsumoEscolhaRelacao::chavePolegada('1 1/2"'));
        $this->assertSame('1.5', InsumoEscolhaRelacao::chavePolegada('1,5"'));
        $this->assertSame('3', InsumoEscolhaRelacao::chavePolegada('TUBETE PAPELAO 3" ESP 2,0MM'));
        $this->assertSame('3', InsumoEscolhaRelacao::chavePolegada('76 mm'));
        $this->assertNull(InsumoEscolhaRelacao::chavePolegada('EMB-TUB-003'));
        $this->assertSame('3"', InsumoEscolhaRelacao::rotuloPolegada('3"'));
        $this->assertSame('1 1/2"', InsumoEscolhaRelacao::rotuloPolegada('1.5'));
    }

    public function test_caixa_casa_a_sequencia_da_medida(): void
    {
        $this->assertTrue(InsumoEscolhaRelacao::caixaCompativel(
            '500x300x300',
            'CAIXA PAPELAO 500X300X300',
        ));
        $this->assertTrue(InsumoEscolhaRelacao::caixaCompativel(
            '500x300',
            'CAIXA PAPELAO 500X300X300',
        ));
        $this->assertFalse(InsumoEscolhaRelacao::caixaCompativel(
            '500x300x300',
            'CAIXA PAPELAO 500X400X300',
        ));
        $this->assertFalse(InsumoEscolhaRelacao::caixaCompativel('caixa', 'CAIXA PAPELAO 200X150X120'));
        $this->assertSame(
            '500x300x300',
            InsumoEscolhaRelacao::rotuloMedidaCaixa('500x300', 'CAIXA PAPELAO 500X300X300'),
        );
        $this->assertSame(
            '500x300x300',
            InsumoEscolhaRelacao::rotuloMedidaCaixa('500x300', 'CAIXA PAPELAO 500X300X300 2KG'),
        );
    }
}
