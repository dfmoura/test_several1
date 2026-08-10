<?php

namespace Tests\Unit;

use App\Models\Produto;
use App\Services\Cadastros\FatorConversaoSugeridor;
use App\Services\Cadastros\ProdutoGrupoCatalogData;
use App\Support\ProdutoBobinaDimensoes;
use App\Support\UnidadesMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Guarda de arquitetura — ADR-039-UNID-001 / estudo 32 CONVERSOES_UNIDADES_MEDIDA.
 * Trava regressão: dual canônico + atributos; sem tabela de alternativas abertas.
 */
class ProdutoUnidadesBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_dual_canonico_sem_alternativas_abertas(): void
    {
        $this->assertTrue(Schema::hasTable('produtos'));

        foreach (['unidade_comercial', 'unidade_interna', 'fator_conversao', 'atributos'] as $col) {
            $this->assertTrue(
                Schema::hasColumn('produtos', $col),
                "produtos deve ter {$col}"
            );
        }

        // Modelo Sankhya-like rejeitado nesta fase (ADR-039-UNID-001).
        $this->assertFalse(
            Schema::hasTable('produto_unidades_alternativas'),
            'Não criar produto_unidades_alternativas sem ADR novo'
        );
        $this->assertFalse(Schema::hasTable('produto_unidades'));
        $this->assertFalse(Schema::hasTable('produto_fatores_conversao'));
    }

    public function test_catalogo_oficial_e_motor_de_sugestao_existem(): void
    {
        $codes = UnidadesMedida::codes();
        foreach (['RL', 'M', 'M2', 'KG', 'G', 'UN', 'MIL', 'L', 'CX'] as $code) {
            $this->assertContains($code, $codes);
        }

        $sugeridor = app(FatorConversaoSugeridor::class);
        $igual = $sugeridor->sugerir('KG', 'KG');
        $this->assertSame(FatorConversaoSugeridor::STATUS_IGUAL, $igual['status']);
        $this->assertSame('1', $igual['fator']);

        $kgM2 = $sugeridor->sugerir('KG', 'M2', ['gramatura_g_m2' => '160']);
        $this->assertSame(FatorConversaoSugeridor::STATUS_SUGERIDO, $kgM2['status']);
        $this->assertNotNull($kgM2['fator']);

        $incompleto = $sugeridor->sugerir('KG', 'M2', []);
        $this->assertSame(FatorConversaoSugeridor::STATUS_INCOMPLETO, $incompleto['status']);
        $this->assertContains('gramatura_g_m2', $incompleto['faltando']);
    }

    public function test_catalogo_exige_dimensao_so_grupos_bobina(): void
    {
        $byCodigo = [];
        foreach (ProdutoGrupoCatalogData::grupos() as $row) {
            $byCodigo[$row['codigo']] = (bool) $row['exige_dimensao_sku'];
        }

        foreach (ProdutoBobinaDimensoes::gruposQueExigemDimensao() as $codigo) {
            $this->assertTrue(
                $byCodigo[$codigo] ?? false,
                "{$codigo} deve ter exige_dimensao_sku=true"
            );
        }

        foreach (ProdutoBobinaDimensoes::gruposSemDimensao() as $codigo) {
            $this->assertFalse(
                $byCodigo[$codigo] ?? true,
                "{$codigo} NÃO deve abrir bobina por padrão (exige_dimensao_sku=false)"
            );
        }
    }

    public function test_decisao_ui_bobina_nao_abre_sem_motivo(): void
    {
        $oculto = ProdutoBobinaDimensoes::decide(false, null, null, null, []);
        $this->assertFalse($oculto['show_section']);
        $this->assertSame('oculto', $oculto['mode']);

        $pa = ProdutoBobinaDimensoes::decide(false, null, null, null, []); // PA-ETQ típico
        $this->assertFalse($pa['show_section']);

        $grupo = ProdutoBobinaDimensoes::decide(true, null, null, null, []);
        $this->assertTrue($grupo['show_section']);
        $this->assertSame('grupo', $grupo['mode']);

        $formula = ProdutoBobinaDimensoes::decide(false, null, null, null, ['gramatura_g_m2']);
        $this->assertTrue($formula['show_section']);
        $this->assertSame('formula', $formula['mode']);
        $this->assertTrue($formula['show_gramatura']);
        $this->assertFalse($formula['show_largura']);

        // Faltando densidade (tinta) NÃO abre seção de bobina.
        $tinta = ProdutoBobinaDimensoes::decide(false, null, null, null, ['densidade_g_ml']);
        $this->assertFalse($tinta['show_section']);
    }

    public function test_model_expoe_campos_de_unidade(): void
    {
        $fillable = (new Produto)->getFillable();
        foreach (['unidade_comercial', 'unidade_interna', 'fator_conversao', 'atributos'] as $field) {
            $this->assertContains($field, $fillable);
        }
    }
}
