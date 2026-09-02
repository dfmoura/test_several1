<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\User;
use App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OrcamentoFreteEstimadoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    private Parceiro $parceiro;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('orcamento.ler', 'web');
        Permission::findOrCreate('orcamento.escrever', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-FRT1',
            'razao_social' => 'Empresa Frete',
            'nome_fantasia' => 'Frete',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'BRAHVA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-FRT1',
            'name' => 'Comercial Frete',
            'email' => 'comercial.frete@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever']);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    private function asComercial()
    {
        Sanctum::actingAs($this->comercial);

        return $this->withHeader('X-Empresa-Id', (string) $this->empresa->id);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        return array_merge([
            'parceiro_id' => $this->parceiro->id,
            'medida' => $fx['medida'],
            'largura_cm' => $fx['largura_cm'],
            'puxada_cm' => $fx['puxada_cm'],
            'cores' => $fx['cores'],
            'papel' => $fx['papel'],
            'acabamento' => $fx['acabamento'],
            'modelos' => $fx['modelos'],
            'colunas' => $fx['colunas'],
            'etiq_por_rolo' => $fx['etiq_por_rolo'],
            'tubete' => $fx['tubete'],
            'z' => $fx['z'],
            'maquina' => $fx['maquina'],
            'maquina_roda_servico' => $fx['maquina_roda_servico'],
            'imposto_pct' => $fx['imposto_pct'],
            'matriz' => $fx['matriz'],
            'coluna_rebobinacao' => $fx['coluna_rebobinacao'],
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'faixas' => array_map(static fn (array $f) => [
                'quantidade' => $f['quantidade'],
                'comissao_pct' => $f['comissao_pct'],
            ], $fx['faixas']),
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
            'modo_entrega' => 'RETIRAR',
        ], $overrides);
    }

    public function test_retirar_frete_zero_nao_somavel(): void
    {
        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload());
        $res->assertOk();
        $this->assertSame(OrcamentoFreteEstimadoService::MODO_RETIRAR, $res->json('data.frete.modo'));
        $this->assertSame('0.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertFalse($res->json('data.faixas.0.frete_somavel'));
        $this->assertEqualsWithDelta(
            (float) $res->json('data.faixas.0.valor_total'),
            (float) $res->json('data.faixas.0.valor_total_proposta'),
            0.001,
        );
    }

    public function test_entrega_propria_sem_valor_fica_a_definir(): void
    {
        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGA_PROPRIA',
        ]));
        $res->assertOk();
        $this->assertSame(OrcamentoFreteEstimadoService::MODO_ENTREGA_PROPRIA, $res->json('data.frete.modo'));
        $this->assertTrue($res->json('data.frete.a_definir'));
        $this->assertNull($res->json('data.faixas.0.valor_frete'));
        $this->assertFalse($res->json('data.faixas.0.frete_somavel'));
        $this->assertSame('a_definir', $res->json('data.frete.motivo'));
        $this->assertEqualsWithDelta(
            (float) $res->json('data.faixas.0.valor_total'),
            (float) $res->json('data.faixas.0.valor_total_proposta'),
            0.001,
        );
    }

    public function test_entrega_terceiros_com_valor_nao_soma_no_total(): void
    {
        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGA_TERCEIROS',
            'valor_frete_manual' => 85.5,
        ]));
        $res->assertOk();
        $this->assertSame(OrcamentoFreteEstimadoService::MODO_ENTREGA_TERCEIROS, $res->json('data.frete.modo'));
        $this->assertFalse($res->json('data.frete.a_definir'));
        $this->assertSame('85.50', $res->json('data.faixas.0.valor_frete'));
        $this->assertFalse($res->json('data.faixas.0.frete_somavel'));
        $this->assertEqualsWithDelta(
            (float) $res->json('data.faixas.0.valor_total'),
            (float) $res->json('data.faixas.0.valor_total_proposta'),
            0.001,
        );
        $this->assertSame('85.50', $res->json('data.frete.valor_informado'));
    }

    public function test_legado_entregar_normaliza_para_entrega_propria(): void
    {
        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
            'valor_frete_manual' => 10,
        ]));
        $res->assertOk();
        $this->assertSame(OrcamentoFreteEstimadoService::MODO_ENTREGA_PROPRIA, $res->json('data.frete.modo'));
        $this->assertSame('10.00', $res->json('data.faixas.0.valor_frete'));
    }

    public function test_snapshot_persiste_modo_e_valor_opcional(): void
    {
        $create = $this->asComercial()->postJson('/api/v1/orcamentos', $this->payload([
            'modo_entrega' => 'ENTREGA_PROPRIA',
            'valor_frete_manual' => 40,
        ]));
        $create->assertCreated();
        $this->assertSame('ENTREGA_PROPRIA', $create->json('data.input_snapshot.modo_entrega'));
        $this->assertSame('40.00', $create->json('data.input_snapshot.valor_frete_manual'));
        $this->assertSame('40.00', $create->json('data.result_snapshot.faixas.0.valor_frete'));
        $this->assertFalse($create->json('data.result_snapshot.faixas.0.frete_somavel'));

        $id = $create->json('data.id');
        $show = $this->asComercial()->getJson('/api/v1/orcamentos/'.$id);
        $show->assertOk();
        $this->assertSame('ENTREGA_PROPRIA', $show->json('data.input_snapshot.modo_entrega'));
        $this->assertInstanceOf(Orcamento::class, Orcamento::query()->findOrFail($id));
    }

    public function test_catalogo_nao_expoe_frete_vigente(): void
    {
        $res = $this->asComercial()->getJson('/api/v1/orcamentos/catalogo');
        $res->assertOk();
        $this->assertArrayNotHasKey('frete', $res->json('data') ?? []);
    }
}
