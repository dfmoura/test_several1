<?php

namespace Tests\Unit;

use App\Suporte\Dinheiro;
use App\Suporte\Documento;
use PHPUnit\Framework\TestCase;

class DocumentoTest extends TestCase
{
    public function test_cnpj_e_cpf_conhecidos(): void
    {
        $this->assertTrue(Documento::cnpjValido('11.222.333/0001-81'));
        $this->assertFalse(Documento::cnpjValido('11.222.333/0001-80'));
        $this->assertTrue(Documento::cpfValido('529.982.247-25'));
        $this->assertFalse(Documento::cpfValido('111.111.111-11'));
    }

    public function test_mascara_cpf_sem_expor_o_numero_inteiro(): void
    {
        $mascara = Documento::mascararCpf('52998224725');
        $this->assertSame('***.982.247-**', $mascara);
        $this->assertStringNotContainsString('529', $mascara);
        $this->assertStringNotContainsString('25', substr($mascara, -2));
    }

    public function test_converte_reais_sem_ponto_flutuante(): void
    {
        $this->assertSame(450000, Dinheiro::centavosDeTexto('4.500,00'));
        $this->assertSame(50000, Dinheiro::centavosDeTexto('500,00'));
        $this->assertSame(10050, Dinheiro::centavosDePix('100.50'));
        $this->assertSame('R$ 1.500,00', Dinheiro::reais(150000));
    }
}
