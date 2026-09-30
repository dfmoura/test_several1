<?php

namespace Tests\Unit;

use App\Services\Fiscal\NfeItemTexto;
use PHPUnit\Framework\TestCase;

class NfeItemTextoTest extends TestCase
{
    public function test_descricao_junta_nome_fiscal_e_spec_do_pedido(): void
    {
        $x = NfeItemTexto::xProd(
            'ETIQUETAS BOPP',
            '1,5X24,5 · COUCHE FASSON 20G · 2 cor(es) · SEM ACABAMENTO · Q 1000',
            'PA-ETQ-001'
        );

        $this->assertSame(
            'ETIQUETAS BOPP · 1,5X24,5 · COUCHE FASSON 20G · 2 cor(es) · SEM ACABAMENTO',
            $x
        );
        $this->assertLessThanOrEqual(120, mb_strlen($x));
    }

    public function test_revenda_nao_repete_codigo_nem_quantidade(): void
    {
        $x = NfeItemTexto::xProd(
            'RIBBON CERA 110MM X 74M',
            'REV-RIB-001 · RIBBON CERA 110MM X 74M · Q 13',
            'REV-RIB-001'
        );

        $this->assertSame('RIBBON CERA 110MM X 74M', $x);
    }

    public function test_sem_fiscal_usa_a_linha_limpa(): void
    {
        $this->assertSame(
            'Etiqueta promocional',
            NfeItemTexto::xProd(null, 'Etiqueta promocional', null)
        );
    }
}
