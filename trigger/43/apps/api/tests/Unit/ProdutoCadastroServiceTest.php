<?php

namespace Tests\Unit;

use App\Models\CodigoSequence;
use App\Models\Empresa;
use App\Models\Produto;
use App\Services\Cadastros\ProdutoCadastroCatalogData;
use App\Services\Cadastros\ProdutoCadastroService;
use App\Services\Cadastros\ProdutoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProdutoCadastroServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalogo_tem_89_familias_sem_duplicar_cian(): void
    {
        $familias = ProdutoCadastroCatalogData::familias();

        $this->assertCount(ProdutoCadastroCatalogData::TOTAL_FAMILIAS, $familias);

        $codigos = array_column($familias, 'codigo');
        $this->assertCount(count($codigos), array_unique($codigos));

        $descricoes = array_map('strtoupper', array_column($familias, 'descricao_fiscal'));
        $this->assertFalse(
            (bool) array_filter($descricoes, fn (string $d) => str_contains($d, ' CIAN ') || str_ends_with($d, ' CIAN')),
            'CIAN deve permanecer unificado em CYAN (MP-TIN-008)'
        );
        $this->assertContains('MP-TIN-008', $codigos);
    }

    public function test_seed_cria_familias_camada_a_com_unidades_iguais(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP TESTE',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);

        $result = app(ProdutoCadastroService::class)->seedForEmpresa($empresa);

        $this->assertSame(89, $result['familias']);
        $this->assertSame(2, $result['demos']);

        $this->assertSame(89, Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('atributos->camada_cadastro', 'A')
            ->count());

        $fosco = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'MP-PAP-001')
            ->firstOrFail();

        $this->assertSame('PAPEL FOSCO AUTOADESIVO COLACRIL ADC 1000', $fosco->descricao_fiscal);
        $this->assertSame('48114190', $fosco->ncm);
        $this->assertSame('KG', $fosco->unidade_comercial);
        $this->assertSame('KG', $fosco->unidade_interna);
        $this->assertSame('1.0000000000', (string) $fosco->fator_conversao);
        $this->assertSame('SEM GTIN', $fosco->gtin);
        $this->assertSame(0, (int) $fosco->origem); // default schema; XML confirma na 1ª NF
        $this->assertTrue($fosco->atributos['origem_pendente_xml'] ?? false);
        $this->assertSame('A', $fosco->atributos['camada_cadastro'] ?? null);
        $this->assertSame('VAL', $fosco->atributos['ncm_situacao'] ?? null);
        $this->assertSame('11', $fosco->atributos['grupo_estoque'] ?? null);

        $tecido = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'MP-TEC-001')
            ->firstOrFail();
        $this->assertNull($tecido->ncm);

        $bopp = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'MP-FLM-001')
            ->firstOrFail();
        $this->assertSame('39199010', $bopp->ncm);
        $this->assertSame('M2', $bopp->unidade_comercial);

        $ribbon = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'REV-RIB-001')
            ->firstOrFail();
        $this->assertSame('00', $ribbon->tipo_item_sped);
        $this->assertSame('2102', $ribbon->cfop_entrada_padrao);
        $this->assertSame('5102', $ribbon->cfop_saida_padrao);
        $this->assertSame('102', $ribbon->csosn);
        $this->assertFalse((bool) $ribbon->controla_lote);

        $this->assertTrue((bool) $fosco->controla_lote);
        $this->assertTrue((bool) $fosco->controla_validade);
        $this->assertSame(548, (int) $fosco->prazo_validade_dias);

        $this->assertTrue((bool) $tecido->controla_lote);
        $this->assertFalse((bool) $tecido->controla_validade);

        $tubete = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'EMB-TUB-001')
            ->firstOrFail();
        $this->assertFalse((bool) $tubete->controla_lote);

        $seqPap = CodigoSequence::query()
            ->where('empresa_id', $empresa->id)
            ->where('prefixo', 'MP-PAP')
            ->firstOrFail();
        $this->assertSame(13, (int) $seqPap->proximo);

        $seqTin = CodigoSequence::query()
            ->where('empresa_id', $empresa->id)
            ->where('prefixo', 'MP-TIN')
            ->firstOrFail();
        $this->assertSame(27, (int) $seqTin->proximo);
    }

    public function test_catalogo_tintas_26_familias_ncm_un_lote(): void
    {
        $tintas = array_values(array_filter(
            ProdutoCadastroCatalogData::familias(),
            fn (array $r) => str_starts_with($r['codigo'], 'MP-TIN-')
        ));

        $this->assertCount(26, $tintas);

        $porCodigo = [];
        foreach ($tintas as $row) {
            $porCodigo[$row['codigo']] = $row;
        }

        $this->assertSame('32151100', $porCodigo['MP-TIN-001']['ncm']);
        $this->assertSame('KG', $porCodigo['MP-TIN-001']['unidade_comercial']);
        $this->assertSame('TINTA', $porCodigo['MP-TIN-001']['listagem_grupo']);
        $this->assertSame('32151900', $porCodigo['MP-TIN-008']['ncm']);
        $this->assertSame('CYAN', substr($porCodigo['MP-TIN-008']['descricao_fiscal'], -4));
        $this->assertNull($porCodigo['MP-TIN-024']['ncm']);
        $this->assertSame('KG', $porCodigo['MP-TIN-024']['unidade_comercial']);
        $this->assertSame('38140090', $porCodigo['MP-TIN-025']['ncm']);
        $this->assertSame('L', $porCodigo['MP-TIN-025']['unidade_comercial']);
        $this->assertSame('L', $porCodigo['MP-TIN-026']['unidade_comercial']);
        $this->assertSame('AUX_IMPRESSAO', $porCodigo['MP-TIN-026']['listagem_grupo']);
    }

    public function test_seed_tintas_com_lote_validade_e_listagem_completa(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP TESTE',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);

        app(ProdutoCadastroService::class)->seedForEmpresa($empresa);

        $black = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'MP-TIN-001')
            ->firstOrFail();
        $this->assertTrue((bool) $black->controla_lote);
        $this->assertTrue((bool) $black->controla_validade);
        $this->assertSame(365, (int) $black->prazo_validade_dias);
        $this->assertSame('32151100', $black->ncm);
        $this->assertSame('KG', $black->unidade_interna);

        $diluente = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'MP-TIN-025')
            ->firstOrFail();
        $this->assertSame('L', $diluente->unidade_interna);
        $this->assertTrue((bool) $diluente->controla_lote);

        $list = app(ProdutoService::class)->list($empresa);
        $codigos = $list->pluck('codigo');
        $this->assertTrue($codigos->contains('MP-TIN-001'));
        $this->assertTrue($codigos->contains('MP-TIN-026'));
        $this->assertSame(
            26,
            $codigos->filter(fn (string $c) => str_starts_with($c, 'MP-TIN-'))->count()
        );
    }

    public function test_reseed_preserva_custo_medio_e_reaplica_lote(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP TESTE',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);

        $service = app(ProdutoCadastroService::class);
        $service->seedForEmpresa($empresa);

        $fosco = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'MP-PAP-001')
            ->firstOrFail();
        $fosco->custo_medio = '12.345000';
        $fosco->atributos = array_merge($fosco->atributos ?? [], ['origem_pendente_xml' => false]);
        $fosco->save();

        $service->seedForEmpresa($empresa);
        $fosco->refresh();

        $this->assertSame('12.345000', (string) $fosco->custo_medio);
        $this->assertTrue((bool) $fosco->controla_lote);
        $this->assertTrue((bool) $fosco->controla_validade);
        $this->assertFalse((bool) ($fosco->atributos['origem_pendente_xml'] ?? true));
    }

    public function test_seed_e_idempotente(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP TESTE',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);

        $service = app(ProdutoCadastroService::class);
        $service->seedForEmpresa($empresa);
        $service->seedForEmpresa($empresa);

        $this->assertSame(
            89 + 2,
            Produto::query()->where('empresa_id', $empresa->id)->count()
        );
    }
}
