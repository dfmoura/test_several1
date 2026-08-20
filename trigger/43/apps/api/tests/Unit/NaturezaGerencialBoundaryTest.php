<?php

namespace Tests\Unit;

use App\Models\NaturezaGerencial;
use App\Models\ProdutoGrupo;
use App\Services\Cadastros\NaturezaGerencialCatalogData;
use App\Services\Cadastros\NaturezaGerencialService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Guarda de arquitetura — ADR-039-NAT-001 / estudo 32.
 * Trava regressão: NAT gerencial ≠ produto.natureza ≠ CoA ≠ LAI.
 */
class NaturezaGerencialBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_naturezas_gerenciais_existe_e_sem_plano_contas(): void
    {
        $this->assertTrue(Schema::hasTable('naturezas_gerenciais'));
        $this->assertFalse(Schema::hasTable('plano_contas'));
        $this->assertFalse(Schema::hasTable('natureza_de_para_contador'));

        foreach ([
            'codigo',
            'codigo_exibicao',
            'grupo',
            'nivel',
            'parent_id',
            'nome',
            'aceita_lancamento',
            'ativo',
        ] as $col) {
            $this->assertTrue(
                Schema::hasColumn('naturezas_gerenciais', $col),
                "naturezas_gerenciais deve ter {$col}"
            );
        }

        // Sem campos contábeis oficiais nesta fundação.
        foreach (['conta_contador', 'conta_contabil', 'sped_conta'] as $col) {
            $this->assertFalse(
                Schema::hasColumn('naturezas_gerenciais', $col),
                "naturezas_gerenciais NÃO deve ter {$col}"
            );
        }
    }

    public function test_produto_grupos_natureza_permanece_compra_venda_ambos(): void
    {
        $this->assertTrue(Schema::hasTable('produto_grupos'));
        $this->assertTrue(Schema::hasColumn('produto_grupos', 'natureza'));
        $this->assertSame(['COMPRA', 'VENDA', 'AMBOS'], ProdutoGrupo::NATUREZAS);
        $this->assertNotContains('RECEITA', ProdutoGrupo::NATUREZAS);
    }

    public function test_seed_arvore_grupos_1_a_5_sem_grupo_9(): void
    {
        $service = app(NaturezaGerencialService::class);
        $count = $service->seedCatalog();

        $this->assertSame(count(NaturezaGerencialCatalogData::itens()), $count);
        $this->assertGreaterThan(40, $count);

        $grupos = NaturezaGerencial::query()->distinct()->pluck('grupo')->sort()->values()->all();
        $this->assertSame([1, 2, 3, 4, 5], $grupos);

        $this->assertSame(0, NaturezaGerencial::query()->where('grupo', 9)->count());
        $this->assertSame(0, NaturezaGerencial::query()->where('codigo', 'like', '9%')->count());

        $folha = NaturezaGerencial::query()->where('codigo', '1.01.01')->first();
        $this->assertNotNull($folha);
        $this->assertTrue($folha->aceita_lancamento);
        $this->assertSame('NAT-1.01.01', $folha->codigo_exibicao);

        $raiz = NaturezaGerencial::query()->where('codigo', '1')->first();
        $this->assertNotNull($raiz);
        $this->assertFalse($raiz->aceita_lancamento);
    }

    public function test_seed_idempotente_preserva_nome_customizado(): void
    {
        $service = app(NaturezaGerencialService::class);
        $service->seedCatalog();

        $n = NaturezaGerencial::query()->where('codigo', '1.01.01')->firstOrFail();
        $n->update(['nome' => 'Venda PA (rótulo RLP)']);

        $service->seedCatalog();

        $n->refresh();
        $this->assertSame('Venda PA (rótulo RLP)', $n->nome);
        $this->assertTrue($n->aceita_lancamento);
    }

    public function test_update_bloqueia_campos_estruturais(): void
    {
        $service = app(NaturezaGerencialService::class);
        $service->seedCatalog();
        $n = NaturezaGerencial::query()->where('codigo', '3.02.01')->firstOrFail();

        $this->expectException(ValidationException::class);
        $service->update($n, ['grupo' => 9]);
    }
}
