<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OrcamentoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmpresa;

    private User $comercial;

    private User $consulta;

    private Parceiro $parceiro;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('orcamento.ler', 'web');
        Permission::findOrCreate('orcamento.escrever', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-ORC1',
            'razao_social' => 'Empresa ORC Teste',
            'nome_fantasia' => 'ORC',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);

        $this->outraEmpresa = Empresa::query()->create([
            'codigo' => 'EMP-ORC2',
            'razao_social' => 'Outra Empresa ORC',
            'nome_fantasia' => 'ORC2',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'BRAHVA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        Parceiro::query()->create([
            'empresa_id' => $this->outraEmpresa->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'OUTRO',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-ORC1',
            'name' => 'Comercial ORC',
            'email' => 'comercial.orc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever']);
        $this->comercial->empresas()->attach($this->empresa->id);

        $this->consulta = User::query()->create([
            'codigo' => 'USR-ORC2',
            'name' => 'Consulta ORC',
            'email' => 'consulta.orc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->consulta->givePermissionTo('orcamento.ler');
        $this->consulta->empresas()->attach($this->empresa->id);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        return [
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
        ];
    }

    public function test_calcular_preview_sem_persistir(): void
    {
        Sanctum::actingAs($this->comercial);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/orcamentos/calcular', $this->payload());

        $res->assertOk();
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertSame(0, Orcamento::query()->count());
    }

    public function test_crud_rascunho_calculado(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $this->payload());
        $create->assertCreated();
        $this->assertSame('CALCULADO', $create->json('data.status'));
        $this->assertTrue($create->json('data.editavel'));
        $this->assertMatchesRegularExpression('/^ORC-\d{4}-\d{5}$/', $create->json('data.codigo'));
        $id = $create->json('data.id');

        $list = $this->withHeaders($h)->getJson('/api/v1/orcamentos');
        $list->assertOk();
        $this->assertCount(1, $list->json('data'));

        $show = $this->withHeaders($h)->getJson('/api/v1/orcamentos/'.$id);
        $show->assertOk();
        $this->assertEqualsWithDelta(3090.0, (float) $show->json('data.result_snapshot.faixas.0.valor_etiqueta'), 0.01);

        $updPayload = $this->payload();
        $updPayload['modelos'] = 8;
        $update = $this->withHeaders($h)->putJson('/api/v1/orcamentos/'.$id, $updPayload);
        $update->assertOk();
        $this->assertSame(2, $update->json('data.versao'));
        $this->assertSame('CALCULADO', $update->json('data.status'));

        $del = $this->withHeaders($h)->deleteJson('/api/v1/orcamentos/'.$id);
        $del->assertOk();
        $this->assertSame(0, Orcamento::query()->count());
        $this->assertSame(1, Orcamento::withTrashed()->count());
        $this->assertSame('CANCELADO', Orcamento::withTrashed()->first()->status);
    }

    public function test_bloqueia_edicao_apos_enviado(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $id = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $this->payload())->json('data.id');
        Orcamento::query()->whereKey($id)->update(['status' => Orcamento::STATUS_ENVIADO]);

        $update = $this->withHeaders($h)->putJson('/api/v1/orcamentos/'.$id, $this->payload());
        $update->assertStatus(422);

        $delete = $this->withHeaders($h)->deleteJson('/api/v1/orcamentos/'.$id);
        $delete->assertStatus(422);
    }

    public function test_parceiro_obrigatorio_e_escopo_empresa(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $bad = $this->payload();
        unset($bad['parceiro_id']);
        $this->withHeaders($h)->postJson('/api/v1/orcamentos', $bad)->assertStatus(422);

        $cross = $this->payload();
        $cross['parceiro_id'] = Parceiro::query()
            ->where('empresa_id', $this->outraEmpresa->id)
            ->value('id');
        $this->withHeaders($h)->postJson('/api/v1/orcamentos', $cross)->assertStatus(422);
    }

    public function test_rbac_consulta_nao_escreve(): void
    {
        Sanctum::actingAs($this->consulta);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)->getJson('/api/v1/orcamentos/catalogo')->assertOk();
        $this->withHeaders($h)->postJson('/api/v1/orcamentos', $this->payload())->assertForbidden();
    }

    public function test_orcamento_com_prospect_e_faca_nova(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $prospect = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00077',
            'razao_social' => 'Prospect Alpha',
            'is_prospect' => true,
            'situacao' => 'ATIVO',
            'municipio' => 'Betim',
            'uf' => 'MG',
            'whatsapp' => '31988887777',
        ]);

        $payload = $this->payload();
        $payload['parceiro_id'] = $prospect->id;
        $payload['faca_nova'] = true;
        $payload['formato_faca'] = 'OVAL';
        $payload['valor_faca_nova'] = 800;
        $payload['prazo_faca_dias'] = 10;

        $res = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $payload);
        $res->assertOk();
        $this->assertTrue($res->json('data.faca_nova'));
        $this->assertEqualsWithDelta(800.0, (float) $res->json('data.valor_faca_nova'), 0.01);
        $this->assertSame(10, $res->json('data.prazo_faca_dias'));
        // motor BRAHVA intacto
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertEqualsWithDelta(4426.0, (float) $res->json('data.faixas.0.valor_total_com_faca'), 0.01);

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload);
        $create->assertCreated();
        $this->assertTrue($create->json('data.parceiro.is_prospect'));
        $this->assertTrue($create->json('data.input_snapshot.faca_nova'));
        $this->assertEqualsWithDelta(800.0, (float) $create->json('data.input_snapshot.valor_faca_nova'), 0.01);
    }
}
