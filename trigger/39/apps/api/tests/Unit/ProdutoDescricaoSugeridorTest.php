<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Models\Produto;
use App\Services\Cadastros\ProdutoDescricaoSugeridor;
use App\Services\Cadastros\ProdutoGrupoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProdutoDescricaoSugeridorTest extends TestCase
{
    use RefreshDatabase;

    private ProdutoDescricaoSugeridor $sugeridor;

    private Empresa $empresa;

    /** @var array<string, int> */
    private array $grupoIds;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sugeridor = app(ProdutoDescricaoSugeridor::class);
        app(ProdutoGrupoService::class)->seedCatalog();

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-DSC',
            'razao_social' => 'Empresa Desc',
            'nome_fantasia' => 'Desc',
            'cnpj' => '00000000000434',
            'situacao' => 'ATIVA',
        ]);

        $this->grupoIds = \App\Models\ProdutoGrupo::query()->pluck('id', 'codigo')->all();
    }

    public function test_pa_etq_bopp_estavel_com_placeholders_sem_texto(): void
    {
        $r = $this->sugeridor->sugerir($this->empresa, [
            'grupo_id' => $this->grupoIds['PA-ETQ'],
            'texto_livre' => 'bopp fosco',
        ]);

        $this->assertSame('ETIQUETAS BOPP', $r['descricao_fiscal']);
        $this->assertStringContainsString('BOPP', $r['descricao_comercial']);
        $this->assertSame('regra', $r['origem']);
    }

    public function test_pa_etq_sem_texto_gera_template_placeholders(): void
    {
        $r = $this->sugeridor->sugerir($this->empresa, [
            'grupo_id' => $this->grupoIds['PA-ETQ'],
        ]);

        $this->assertNotSame('', $r['descricao_fiscal']);
        $this->assertStringContainsString('{MATERIAL}', $r['descricao_comercial']);
    }

    public function test_mp_pap_marca_vai_ao_comercial(): void
    {
        $r = $this->sugeridor->sugerir($this->empresa, [
            'grupo_id' => $this->grupoIds['MP-PAP'],
            'texto_livre' => 'couché 80g Fasson',
        ]);

        $this->assertSame('PAPEL COUCHE AUTOADESIVO BOBINA', $r['descricao_fiscal']);
        $this->assertStringContainsStringIgnoringCase('Fasson', $r['descricao_comercial']);
        $this->assertFalse(str_contains(mb_strtolower($r['descricao_fiscal']), 'fasson'));
    }

    public function test_rev_rib_com_dimensao(): void
    {
        $r = $this->sugeridor->sugerir($this->empresa, [
            'grupo_id' => $this->grupoIds['REV-RIB'],
            'texto_livre' => 'ribbon cera 110x300 todaytec',
        ]);

        $this->assertSame('RIBBON CERA 110x300', $r['descricao_fiscal']);
        $this->assertStringContainsStringIgnoringCase('Todaytec', $r['descricao_comercial']);
    }

    public function test_remove_pejorativo_e_avisa(): void
    {
        $r = $this->sugeridor->sugerir($this->empresa, [
            'grupo_id' => $this->grupoIds['MP-TEC'],
            'texto_livre' => 'resinado importado ruim',
        ]);

        $this->assertStringNotContainsStringIgnoringCase('ruim', $r['descricao_fiscal']);
        $this->assertStringNotContainsStringIgnoringCase('ruim', $r['descricao_comercial']);
        $this->assertNotEmpty($r['avisos']);
    }

    public function test_similares_no_mesmo_grupo(): void
    {
        Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PA-ETQ-001',
            'familia' => 'PA',
            'grupo_id' => $this->grupoIds['PA-ETQ'],
            'descricao_fiscal' => 'ETIQUETAS BOPP',
            'situacao' => 'ATIVO',
        ]);

        $r = $this->sugeridor->sugerir($this->empresa, [
            'grupo_id' => $this->grupoIds['PA-ETQ'],
            'texto_livre' => 'etiquetas bopp brilho',
        ]);

        $this->assertNotEmpty($r['similares']);
        $this->assertSame('PA-ETQ-001', $r['similares'][0]['codigo']);
    }

    public function test_exige_grupo(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->sugeridor->sugerir($this->empresa, []);
    }
}
