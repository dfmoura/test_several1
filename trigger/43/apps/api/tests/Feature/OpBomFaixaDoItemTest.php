<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\OrcCatalogoAcabamento;
use App\Models\OrcCatalogoPapel;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
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
        $filme = ProdutoGrupo::query()->create([
            'codigo' => 'MP-FLM',
            'nome' => 'Filmes',
            'familia' => 'MP',
            'natureza' => 'COMPRA',
            'tipo_item_sped' => '01',
            'situacao' => 'ATIVO',
        ]);
        OrcCatalogoPapel::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'BOPP PRATA',
            'grupo_id' => $filme->id,
            'preco_m2' => 1,
            'ativo' => true,
            'ordem' => 1,
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

        $diag = app(OpBomDeriver::class)->diagnostico($empresa, $pedido, $item);
        $papel = collect($diag['linhas'])->firstWhere('componente', 'PAPEL');

        $this->assertNotNull($papel);
        $this->assertNull($papel['produto_id']);
        $this->assertSame($filme->id, $papel['grupo_id']);
        $this->assertSame(0, bccomp((string) $papel['qtde'], '40', 4));
        $this->assertNull(collect($diag['nao_casados'])->firstWhere('componente', 'PAPEL'));
    }

    public function test_item_antigo_sem_faixa_cai_no_cabecalho(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BOM2',
            'razao_social' => 'Grafica BOM 2',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);
        $filme = ProdutoGrupo::query()->create([
            'codigo' => 'MP-FLM',
            'nome' => 'Filmes',
            'familia' => 'MP',
            'natureza' => 'COMPRA',
            'tipo_item_sped' => '01',
            'situacao' => 'ATIVO',
        ]);
        OrcCatalogoPapel::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'BOPP PRATA',
            'grupo_id' => $filme->id,
            'preco_m2' => 1,
            'ativo' => true,
            'ordem' => 1,
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

        $diag = app(OpBomDeriver::class)->diagnostico($empresa, $pedido, $item);
        $papel = collect($diag['linhas'])->firstWhere('componente', 'PAPEL');

        $this->assertNotNull($papel);
        $this->assertNull($papel['produto_id']);
        $this->assertSame($filme->id, $papel['grupo_id']);
        $this->assertSame(0, bccomp((string) $papel['qtde'], '10', 4));
        $this->assertNull(collect($diag['nao_casados'])->firstWhere('componente', 'PAPEL'));
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

        $linhas = app(OpBomDeriver::class)->derivar($empresa, $pedido, $item);
        $this->assertNull(collect($linhas)->firstWhere('componente', 'ACABAMENTO'));
        $this->assertNull(collect(app(OpBomDeriver::class)->derivar($empresa, $pedido, $itemSem))->firstWhere('componente', 'ACABAMENTO'));
    }

    public function test_grupo_do_catalogo_nao_escolhe_sku_pelo_texto(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BOM4',
            'razao_social' => 'Grafica BOM 4',
            'cnpj' => '00000000000434',
            'situacao' => 'ATIVA',
        ]);
        $filme = ProdutoGrupo::query()->create([
            'codigo' => 'MP-FLM',
            'nome' => 'Filmes',
            'familia' => 'MP',
            'natureza' => 'COMPRA',
            'tipo_item_sped' => '01',
            'situacao' => 'ATIVO',
        ]);
        $lam = ProdutoGrupo::query()->create([
            'codigo' => 'MP-LAM',
            'nome' => 'Laminação',
            'familia' => 'MP',
            'natureza' => 'COMPRA',
            'tipo_item_sped' => '01',
            'situacao' => 'ATIVO',
        ]);
        Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'MP-FLM-901',
            'familia' => 'MP',
            'grupo_id' => $filme->id,
            'descricao_fiscal' => 'BOPP PRATA AUTOADESIVO',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);
        OrcCatalogoPapel::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'BOPP PRATA',
            'grupo_id' => $filme->id,
            'preco_m2' => 1,
            'ativo' => true,
            'ordem' => 1,
        ]);
        OrcCatalogoAcabamento::query()->create([
            'empresa_id' => $empresa->id,
            'nome' => 'VERNIZ',
            'grupo_id' => $lam->id,
            'preco_m2' => 1,
            'perda_m2' => 0,
            'ativo' => true,
            'ordem' => 1,
        ]);

        $pedido = new Pedido(['snapshot' => ['input' => []]]);
        $item = new PedidoItem([
            'especificacao' => [
                'papel' => 'BOPP PRATA',
                'acabamento' => 'VERNIZ',
                'faixa' => ['m2' => 40, 'perda_acerto' => 1, 'perda_acabamento' => 2],
            ],
        ]);

        $linhas = app(OpBomDeriver::class)->derivar($empresa, $pedido, $item);
        $papel = collect($linhas)->firstWhere('componente', 'PAPEL');
        $acab = collect($linhas)->firstWhere('componente', 'ACABAMENTO');

        $this->assertNotNull($papel);
        $this->assertNull($papel['produto_id']);
        $this->assertSame($filme->id, $papel['grupo_id']);
        $this->assertSame(0, bccomp((string) $papel['qtde'], '41', 4));
        $this->assertNotNull($acab);
        $this->assertNull($acab['produto_id']);
        $this->assertSame($lam->id, $acab['grupo_id']);
        $this->assertSame(0, bccomp((string) $acab['qtde'], '43', 4));
    }

    public function test_papel_sem_grupo_nao_escolhe_sku_pelo_texto(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BOM5',
            'razao_social' => 'Grafica BOM 5',
            'cnpj' => '00000000000515',
            'situacao' => 'ATIVA',
        ]);
        Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'MP-FLM-905',
            'familia' => 'MP',
            'descricao_fiscal' => 'BOPP PRATA AUTOADESIVO',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        $pedido = new Pedido(['snapshot' => ['input' => []]]);
        $item = new PedidoItem([
            'especificacao' => [
                'papel' => 'BOPP PRATA',
                'faixa' => ['m2' => 40],
            ],
        ]);

        $diag = app(OpBomDeriver::class)->diagnostico($empresa, $pedido, $item);
        $this->assertNull(collect($diag['linhas'])->firstWhere('componente', 'PAPEL'));
        $solto = collect($diag['nao_casados'])->firstWhere('componente', 'PAPEL');
        $this->assertNotNull($solto);
        $this->assertSame('BOPP PRATA', $solto['origem_texto']);
        $this->assertSame(0, bccomp((string) $solto['qtde'], '40', 4));
        $this->assertStringContainsString('sem grupo', $solto['motivo']);
    }

    public function test_caixa_casa_pela_medida_nominal_e_nao_pelo_nome(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BOM-CX',
            'razao_social' => 'Grafica caixa',
            'cnpj' => '00000000000353',
            'situacao' => 'ATIVA',
        ]);
        $peloNome = Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'EMB-CX-NOME',
            'familia' => 'EMB',
            'descricao_fiscal' => 'CAIXA PAPELAO 500X300X300',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'atributos' => ['comp_mm' => '200', 'larg_mm' => '150', 'alt_mm' => '120'],
        ]);
        $pelaMedida = Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'EMB-CX-MED',
            'familia' => 'EMB',
            'descricao_fiscal' => 'CAIXA DE EXPEDICAO',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
            'atributos' => ['comp_mm' => '500', 'larg_mm' => '300', 'alt_mm' => '300'],
        ]);
        $legado = Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'EMB-CX-LEG',
            'familia' => 'EMB',
            'descricao_fiscal' => 'CAIXA PAPELAO 250X200X200',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        $pedido = new Pedido([
            'snapshot' => ['faixa' => ['qtde_caixas' => 2, 'caixa_medida' => '500x300x300']],
        ]);
        $item = new PedidoItem(['especificacao' => []]);
        $diag = app(OpBomDeriver::class)->diagnostico($empresa, $pedido, $item);
        $caixa = collect($diag['linhas'])->firstWhere('componente', 'CAIXA');

        $this->assertNotNull($caixa);
        $this->assertSame($pelaMedida->id, $caixa['produto_id']);
        $this->assertNotSame($peloNome->id, $caixa['produto_id']);

        $pedidoLegado = new Pedido([
            'snapshot' => ['faixa' => ['qtde_caixas' => 1, 'caixa_medida' => '250x200x200']],
        ]);
        $diagLegado = app(OpBomDeriver::class)->diagnostico($empresa, $pedidoLegado, $item);
        $caixaLegado = collect($diagLegado['linhas'])->firstWhere('componente', 'CAIXA');

        $this->assertNotNull($caixaLegado);
        $this->assertSame($legado->id, $caixaLegado['produto_id']);
    }

    public function test_tubete_da_op_nasce_inteiro(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-BOM5',
            'razao_social' => 'Grafica BOM 5',
            'cnpj' => '00000000000515',
            'situacao' => 'ATIVA',
        ]);
        $sku = Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'EMB-TUB-001',
            'familia' => 'EMB',
            'descricao_fiscal' => 'TUBETE PAPELAO 3"',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        $diag = app(OpBomDeriver::class)->diagnostico($empresa, new Pedido([
            'snapshot' => ['input' => ['tubete' => '3"', 'etiq_por_rolo' => 3000]],
        ]), new PedidoItem([
            'qtde_pedida' => '10000.0000',
            'especificacao' => [
                'tubete' => '3"',
                'etiq_por_rolo' => 3000,
                'tubete_produto_id' => $sku->id,
                'faixa' => ['quantidade' => 10000, 'rolos' => 10000 / 3000],
            ],
        ]));
        $tubete = collect($diag['linhas'])->firstWhere('componente', 'TUBETE');
        $this->assertNotNull($tubete);
        $this->assertSame($sku->id, $tubete['produto_id']);
        $this->assertSame('4.0000', $tubete['qtde']);
        $this->assertSame('UN', $tubete['unidade']);

        $exato = app(OpBomDeriver::class)->diagnostico($empresa, new Pedido([
            'snapshot' => ['input' => []],
        ]), new PedidoItem([
            'especificacao' => [
                'tubete' => '3"',
                'etiq_por_rolo' => 1000,
                'tubete_produto_id' => $sku->id,
                'faixa' => ['quantidade' => 7000, 'rolos' => 7.0000002],
            ],
        ]));
        $this->assertSame('7.0000', collect($exato['linhas'])->firstWhere('componente', 'TUBETE')['qtde']);

        $semEtiq = app(OpBomDeriver::class)->diagnostico($empresa, new Pedido([
            'snapshot' => ['input' => []],
        ]), new PedidoItem([
            'especificacao' => [
                'tubete' => '1"',
                'faixa' => ['rolos' => 2.4],
            ],
        ]));
        $semEtiqLinha = collect($semEtiq['linhas'])->concat($semEtiq['nao_casados'])->firstWhere('componente', 'TUBETE');
        $this->assertNotNull($semEtiqLinha);
        $this->assertSame('3.0000', $semEtiqLinha['qtde']);

        $roloCheio = app(OpBomDeriver::class)->diagnostico($empresa, new Pedido([
            'snapshot' => ['input' => []],
        ]), new PedidoItem([
            'especificacao' => [
                'tubete' => '1"',
                'faixa' => ['rolos' => 5],
            ],
        ]));
        $roloCheioLinha = collect($roloCheio['linhas'])->concat($roloCheio['nao_casados'])->firstWhere('componente', 'TUBETE');
        $this->assertNotNull($roloCheioLinha);
        $this->assertSame('5.0000', $roloCheioLinha['qtde']);
    }
}
