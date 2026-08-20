<?php

namespace Tests\Unit;

use App\Models\ProdutoGrupo;
use App\Services\Cadastros\ProdutoGrupoCatalogData;
use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProdutoGrupoServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_seed_catalog_cria_grupos_canonicos_do_dominio(): void
    {
        $service = app(ProdutoGrupoService::class);
        $count = $service->seedCatalog();

        $this->assertSame(count(ProdutoGrupoCatalogData::grupos()), $count);
        $this->assertTrue(ProdutoGrupo::query()->where('codigo', 'MP-PAP')->exists());
        $this->assertTrue(ProdutoGrupo::query()->where('codigo', 'PA-ETQ')->exists());
        $this->assertTrue(ProdutoGrupo::query()->where('codigo', 'REV-RIB')->exists());
        $this->assertTrue(ProdutoGrupo::query()->where('codigo', 'EMB-TUB')->exists());
        $this->assertTrue(ProdutoGrupo::query()->where('codigo', 'FAC')->exists());
    }

    public function test_resolve_rejeita_grupo_de_outra_familia(): void
    {
        $service = app(ProdutoGrupoService::class);
        $service->seedCatalog();

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service->resolveForFamilia('PA', null, 'MP-PAP');
    }

    public function test_list_filtra_por_familia_e_natureza(): void
    {
        $service = app(ProdutoGrupoService::class);
        $service->seedCatalog();

        $mp = $service->list('MP');
        $this->assertTrue($mp->every(fn (ProdutoGrupo $g) => $g->familia === 'MP'));
        $this->assertTrue($mp->contains(fn (ProdutoGrupo $g) => $g->codigo === 'MP-PAP'));

        $venda = $service->list(null, 'VENDA');
        $this->assertTrue($venda->contains(fn (ProdutoGrupo $g) => $g->codigo === 'PA-ETQ'));
        $this->assertTrue($venda->contains(fn (ProdutoGrupo $g) => $g->codigo === 'REV-RIB')); // AMBOS
        $this->assertFalse($venda->contains(fn (ProdutoGrupo $g) => $g->codigo === 'MP-TIN'));
    }

    public function test_defaults_por_familia(): void
    {
        $service = app(ProdutoGrupoService::class);
        $service->seedCatalog();

        $this->assertSame('MP-PAP', $service->defaultGrupoForFamilia('MP')?->codigo);
        $this->assertSame('PA-ETQ', $service->defaultGrupoForFamilia('PA')?->codigo);
        $this->assertSame('REV-RIB', $service->defaultGrupoForFamilia('REV')?->codigo);
    }
}
