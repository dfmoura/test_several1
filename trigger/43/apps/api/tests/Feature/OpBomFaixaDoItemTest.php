<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Services\Producao\OpBomDeriver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * REV-05 — empenho da OP usa a faixa da linha, não a do primeiro item no cabeçalho.
 */
class OpBomFaixaDoItemTest extends TestCase
{
    use RefreshDatabase;

    public function test_segunda_linha_usa_m2_da_propria_faixa(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BOM1',
            'razao_social' => 'Grafica BOM',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);
        Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'MP-FLM-901',
            'familia' => 'MP',
            'descricao_fiscal' => 'BOPP PRATA AUTOADESIVO',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        $pedido = new Pedido([
            'snapshot' => [
                'input' => ['papel' => 'BOPP PRATA'],
                'faixa' => ['m2' => 10, 'metragem' => 100, 'rolos' => 1, 'qtde_caixas' => 1],
            ],
        ]);
        $item = new PedidoItem([
            'especificacao' => [
                'papel' => 'BOPP PRATA',
                'faixa' => ['m2' => 40, 'metragem' => 400, 'rolos' => 4, 'qtde_caixas' => 2],
            ],
        ]);

        $linhas = app(OpBomDeriver::class)->derivar($empresa, $pedido, $item);
        $papel = collect($linhas)->firstWhere('componente', 'PAPEL');

        $this->assertNotNull($papel);
        $this->assertSame(0, bccomp((string) $papel['qtde'], '40', 4));
    }

    public function test_item_antigo_sem_faixa_cai_no_cabecalho(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BOM2',
            'razao_social' => 'Grafica BOM 2',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);
        Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'MP-FLM-902',
            'familia' => 'MP',
            'descricao_fiscal' => 'BOPP PRATA AUTOADESIVO',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        $pedido = new Pedido([
            'snapshot' => [
                'input' => ['papel' => 'BOPP PRATA'],
                'faixa' => ['m2' => 10],
            ],
        ]);
        $item = new PedidoItem([
            'especificacao' => ['papel' => 'BOPP PRATA'],
        ]);

        $linhas = app(OpBomDeriver::class)->derivar($empresa, $pedido, $item);
        $papel = collect($linhas)->firstWhere('componente', 'PAPEL');

        $this->assertNotNull($papel);
        $this->assertSame(0, bccomp((string) $papel['qtde'], '10', 4));
    }

    public function test_guia_aponta_tinta_e_acabamento_sem_sku(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BOM3',
            'razao_social' => 'Grafica BOM 3',
            'cnpj' => '00000000000353',
            'situacao' => 'ATIVA',
        ]);
        $pedido = new Pedido(['snapshot' => ['input' => []]]);
        $item = new PedidoItem([
            'especificacao' => [
                'cores' => 2,
                'acabamento' => 'VERNIZ',
                'faixa' => [
                    'm2' => 10,
                    'perda_acerto' => 1,
                    'perda_acabamento' => 2,
                ],
            ],
        ]);

        $guia = app(OpBomDeriver::class)->guiaApontada($empresa, $pedido, $item);
        $tinta = collect($guia)->firstWhere('componente', 'TINTA');
        $acab = collect($guia)->firstWhere('componente', 'ACABAMENTO');

        $this->assertNotNull($tinta);
        $this->assertSame('2 cor(es)', $tinta['origem_texto']);
        $this->assertSame(0, bccomp((string) $tinta['qtde'], '11', 4));
        $this->assertNotNull($acab);
        $this->assertSame('VERNIZ', $acab['origem_texto']);
        $this->assertSame(0, bccomp((string) $acab['qtde'], '13', 4));

        $itemSem = new PedidoItem([
            'especificacao' => [
                'acabamento' => 'SEM ACABAMENTO',
                'faixa' => ['m2' => 10],
            ],
        ]);
        $sem = app(OpBomDeriver::class)->guiaApontada($empresa, $pedido, $itemSem);
        $this->assertNull(collect($sem)->firstWhere('componente', 'ACABAMENTO'));
    }
}
