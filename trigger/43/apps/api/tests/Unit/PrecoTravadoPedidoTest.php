<?php

namespace Tests\Unit;

use App\Models\PedidoItem;
use App\Services\Comercial\PrecoTravadoPedido;
use Tests\TestCase;

/**
 * Motor ORC: valor_etiqueta é o TOTAL da faixa, não o unitário (estudo 32 / BRAHVA).
 */
class PrecoTravadoPedidoTest extends TestCase
{
    public function test_faixa_do_motor_deriva_unitario_e_nao_repete_o_total(): void
    {
        $t = PrecoTravadoPedido::daFaixa([
            'quantidade' => 20000,
            'valor_etiqueta' => 1930,
            'valor_matriz' => 340,
            'valor_total' => 2270,
        ]);

        $this->assertSame('20000.0000', $t['qtde_faixa']);
        $this->assertSame('1930.00', $t['valor_etiqueta']);
        $this->assertSame('0.096500', $t['preco_unitario']);
        $this->assertSame('340.00', $t['valor_matriz']);
        $this->assertSame('2270.00', $t['valor_comercial']);
        $this->assertSame('1930.00', PrecoTravadoPedido::valorEtiquetas('20000.0000', $t));
    }

    public function test_qtde_readequada_proporcional_matriz_fica_fixa(): void
    {
        $t = PrecoTravadoPedido::daFaixa([
            'quantidade' => 20000,
            'valor_etiqueta' => '1930.00',
            'valor_matriz' => '340.00',
            'valor_total' => '2270.00',
        ]);

        $this->assertSame('1737.00', PrecoTravadoPedido::valorEtiquetas('18000.0000', $t));
        $this->assertSame('340.00', $t['valor_matriz']);
    }

    public function test_matriz_ausente_sai_do_total_menos_etiqueta(): void
    {
        $t = PrecoTravadoPedido::daFaixa([
            'quantidade' => 7000,
            'valor_etiqueta' => 3090,
            'valor_total' => 3626,
        ]);

        $this->assertSame('536.00', $t['valor_matriz']);
        $this->assertSame('0.441429', $t['preco_unitario']);
    }

    public function test_item_contaminado_com_total_no_unitario_e_recuperado(): void
    {
        $item = new PedidoItem;
        $item->qtde_pedida = '20000.0000';
        $item->preco_unitario = '1930.000000';
        $item->valor_total = '2270.00';

        $t = PrecoTravadoPedido::doItem($item);
        $this->assertSame('0.096500', $t['preco_unitario']);
        $this->assertSame('1930.00', $t['valor_etiqueta']);
        $this->assertSame('340.00', $t['valor_matriz']);
        $this->assertSame('1930.00', PrecoTravadoPedido::valorEtiquetas('20000.0000', $t));
    }

    public function test_item_com_unitario_real_nao_e_tratado_como_total(): void
    {
        $item = new PedidoItem;
        $item->qtde_pedida = '10000.0000';
        $item->preco_unitario = '0.350000';
        $item->valor_total = '3500.00';

        $t = PrecoTravadoPedido::doItem($item);
        $this->assertSame('0.350000', $t['preco_unitario']);
        $this->assertSame('3500.00', $t['valor_etiqueta']);
        $this->assertSame('0.00', $t['valor_matriz']);
    }
}
