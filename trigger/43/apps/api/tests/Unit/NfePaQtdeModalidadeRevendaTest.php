<?php

namespace Tests\Unit;

use App\Models\PaEmbalagem;
use App\Services\Fiscal\NfePaQtdeModalidade;
use App\Services\Producao\PaEmbalagemService;
use Illuminate\Support\Collection;
use Tests\TestCase;

/**
 * PED misto PA+REV: embalagem da etiqueta não vaza para infAdProd do ribbon.
 */
class NfePaQtdeModalidadeRevendaTest extends TestCase
{
    public function test_revenda_nao_herda_inf_ad_da_embalagem_do_pa(): void
    {
        $embPa = new PaEmbalagem([
            'pedido_item_id' => 10,
            'qtde_bobinas' => 5,
            'qtde_caixas' => 1,
            'qtde_etiquetas' => '5000.0000',
            'tubete' => '3"',
            'saida_etiqueta' => 'ESQUERDA',
            'caixa_medida' => '500x300x300',
        ]);
        $embPa->setRelation('bobinas', new Collection);
        $embPa->setRelation('pedidoItem', null);
        $embs = new Collection([$embPa]);

        $svc = app(NfePaQtdeModalidade::class);

        $pa = $svc->aplicarItem([
            'pedido_item_id' => 10,
            'familia_fiscal' => 'PA-ETQ',
            'descricao' => '1,5X24,5 · COUCHE',
            'qtde' => '1000.0000',
            'unidade' => 'MIL',
            'preco_unitario' => '0.500000',
            'valor' => '500.00',
            'especificacao' => [
                'medida' => '1,5X24,5',
                'papel' => 'COUCHE FASSON 20G',
                'cores' => '2',
                'acabamento' => 'SEM ACABAMENTO',
            ],
        ], $embs, NfePaQtdeModalidade::MODO_ETIQUETA);

        $this->assertNotNull($pa['inf_ad']);
        $this->assertStringContainsString('BOB', (string) $pa['inf_ad']);
        $this->assertStringContainsString('COUCHE FASSON 20G', (string) $pa['inf_ad']);

        $rev = $svc->aplicarItem([
            'pedido_item_id' => 20,
            'familia_fiscal' => 'REV-RIB',
            'descricao' => 'REV-RIB-001 · RIBBON CERA 110MM X 74M · Q 13',
            'qtde' => '13.0000',
            'unidade' => 'RL',
            'preco_unitario' => '1.500000',
            'valor' => '19.50',
            'especificacao' => [
                'necessidade' => 'REVENDA',
                'produto_codigo' => 'REV-RIB-001',
                'produto_descricao' => 'RIBBON CERA 110MM X 74M',
            ],
        ], $embs, NfePaQtdeModalidade::MODO_ETIQUETA);

        $this->assertNull($rev['inf_ad'], 'REV não pode carregar med/papel/bobina da etiqueta');
        $this->assertSame('13.0000', $rev['linha']['qtde']);
        $this->assertSame('RL', $rev['linha']['unidade']);
    }

    public function test_resolver_nao_herda_embalagem_unica_para_outro_item(): void
    {
        $embPa = new PaEmbalagem([
            'pedido_item_id' => 10,
            'qtde_bobinas' => 2,
            'qtde_caixas' => 1,
        ]);
        $embs = new Collection([$embPa]);
        $svc = app(PaEmbalagemService::class);

        $this->assertSame(10, (int) $svc->resolverParaItem($embs, 10)?->pedido_item_id);
        $this->assertNull($svc->resolverParaItem($embs, 20));
        $this->assertSame(10, (int) $svc->resolverParaItem($embs, null)?->pedido_item_id);
    }
}
