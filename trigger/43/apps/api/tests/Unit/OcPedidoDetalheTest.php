<?php

namespace Tests\Unit;

use App\Support\OcPedidoDetalhe;
use App\Support\ProdutoBobinaDimensoes;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OcPedidoDetalheTest extends TestCase
{
    #[Test]
    public function substrato_abre_detalhe_bobina(): void
    {
        $d = OcPedidoDetalhe::decide(true, 'MP-FLM');
        $this->assertTrue($d['show_detalhe_bobina']);
        $this->assertSame('bobina', $d['mode']);
    }

    #[Test]
    public function tinta_caixa_ribbon_ocultam_detalhe(): void
    {
        foreach (['MP-TIN', 'EMB-TUB', 'EMB-CX', 'REV-RIB'] as $grupo) {
            $d = OcPedidoDetalhe::decide(false, $grupo);
            $this->assertFalse(
                $d['show_detalhe_bobina'],
                "{$grupo} não deve abrir faixas L×bobinas×m"
            );
            $this->assertSame('oculto', $d['mode']);
        }
    }

    #[Test]
    public function fallback_por_codigo_do_grupo_canonicamente_bobina(): void
    {
        foreach (ProdutoBobinaDimensoes::gruposQueExigemDimensao() as $codigo) {
            $d = OcPedidoDetalhe::decide(null, $codigo);
            $this->assertTrue($d['show_detalhe_bobina'], $codigo);
        }
    }

    #[Test]
    public function legado_com_composicao_mantem_editor(): void
    {
        $d = OcPedidoDetalhe::decide(false, 'MP-TIN', temComposicao: true);
        $this->assertTrue($d['show_detalhe_bobina']);
        $this->assertSame('legado', $d['mode']);
    }

    #[Test]
    public function sem_produto_sem_composicao_oculta(): void
    {
        $d = OcPedidoDetalhe::decide(null, null);
        $this->assertFalse($d['show_detalhe_bobina']);
        $this->assertSame('oculto', $d['mode']);
    }
}
