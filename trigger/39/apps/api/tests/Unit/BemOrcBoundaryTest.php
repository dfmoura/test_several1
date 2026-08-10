<?php

namespace Tests\Unit;

use App\Models\BemPatrimonial;
use App\Models\OrcCatalogoMaquina;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Guarda de arquitetura — ADR-039-BEM-001 / estudo 32 §5.2.
 * Não testa UX; trava regressão de fronteira BEM × G10.
 */
class BemOrcBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_schema_separa_bem_fisico_de_tarifa_g10(): void
    {
        $this->assertTrue(Schema::hasTable('bens_patrimoniais'));
        $this->assertTrue(Schema::hasTable('orc_catalogo_maquinas'));

        // BEM carrega identidade de ativo + ponte opcional ao grupo ORC.
        foreach (['codigo', 'descricao', 'categoria', 'status', 'valor_aquisicao', 'orc_catalogo_maquina_id', 'empresa_id'] as $col) {
            $this->assertTrue(
                Schema::hasColumn('bens_patrimoniais', $col),
                "bens_patrimoniais deve ter {$col}"
            );
        }

        // G10 é catálogo de tarifa — sem campos de patrimônio.
        foreach (['valor_aquisicao', 'numero_serie', 'empresa_id', 'status', 'local', 'placa'] as $col) {
            $this->assertFalse(
                Schema::hasColumn('orc_catalogo_maquinas', $col),
                "orc_catalogo_maquinas NÃO deve ter campo de patrimônio: {$col}"
            );
        }

        foreach (['nome', 'ativo', 'ordem'] as $col) {
            $this->assertTrue(Schema::hasColumn('orc_catalogo_maquinas', $col));
        }
    }

    public function test_relacoes_eloquent_respeitam_ponte_opcional(): void
    {
        $grupo = OrcCatalogoMaquina::query()->create([
            'nome' => 'BETA',
            'ativo' => true,
            'ordem' => 1,
        ]);

        $this->assertInstanceOf(
            \Illuminate\Database\Eloquent\Relations\HasMany::class,
            $grupo->bensPatrimoniais()
        );

        $bem = new BemPatrimonial;
        $this->assertInstanceOf(
            \Illuminate\Database\Eloquent\Relations\BelongsTo::class,
            $bem->grupoHoraMaquina()
        );

        $this->assertContains('orc_catalogo_maquina_id', $bem->getFillable());
        $this->assertTrue(
            (new \ReflectionClass(BemPatrimonial::class))->hasConstant('CATEGORIA_MAQUINA_GRAFICA')
        );
    }
}
