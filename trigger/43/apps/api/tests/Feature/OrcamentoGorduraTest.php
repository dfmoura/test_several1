<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Gordura comercial pós-motor (R$) — ADR_ORC_GORDURA_COMERCIAL.
 */
class OrcamentoGorduraTest extends TestCase
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
            'codigo' => 'EMP-GOR1',
            'razao_social' => 'Empresa Gordura Teste',
            'nome_fantasia' => 'GOR',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'email' => 'comercial@gor.test',
            'telefone' => '3133334444',
            'municipio' => 'Betim',
            'uf' => 'MG',
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'BRAHVA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'whatsapp' => '31999998888',
            'contato_nome' => 'Maria Compradora',
            'limite_credito' => '10000.00',
        ]);

        $this->seedParceiroRecorrenteLimpo($this->empresa, $this->parceiro);

        ParceiroContato::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'nome' => 'Maria Compradora',
            'funcao' => 'Compras',
            'whatsapp' => '31999998888',
            'email' => 'maria@cliente.test',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-GOR1',
            'name' => 'Comercial Gordura',
            'email' => 'comercial.gor@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever']);
        $this->comercial->empresas()->attach($this->empresa->id);
    }

    /** @return array<string, mixed> */
    private function payload(float $valorGordura = 0): array
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
            'valor_gordura' => $valorGordura,
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

    public function test_gordura_zero_nao_altera_etiqueta_brahva(): void
    {
        Sanctum::actingAs($this->comercial);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/orcamentos/calcular', $this->payload(0));

        $res->assertOk();
        $this->assertEqualsWithDelta(1900.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertSame(0.0, (float) $res->json('data.valor_gordura'));
        $this->assertArrayNotHasKey('valor_etiqueta_base', $res->json('data.faixas.0'));
    }

    public function test_gordura_em_reais_infla_etiqueta_e_persiste_snapshot(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $preview = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $this->payload(200));
        $preview->assertOk();

        $base = (float) $preview->json('data.faixas.0.valor_etiqueta_base');
        $etiqueta = (float) $preview->json('data.faixas.0.valor_etiqueta');
        $gordura = (float) $preview->json('data.faixas.0.valor_gordura');

        $this->assertEqualsWithDelta(1900.0, $base, 0.01);
        $this->assertSame(200.0, (float) $preview->json('data.valor_gordura'));
        $this->assertSame(200.0, $gordura);
        $this->assertGreaterThan($base, $etiqueta);
        $this->assertGreaterThanOrEqual($base + 200.0, $etiqueta);

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $this->payload(200));
        $create->assertCreated();
        $this->assertSame(200.0, (float) $create->json('data.input_snapshot.valor_gordura'));
        $this->assertSame(200.0, (float) $create->json('data.result_snapshot.valor_gordura'));
        $this->assertEqualsWithDelta(
            $etiqueta,
            (float) $create->json('data.result_snapshot.faixas.0.valor_etiqueta'),
            0.01
        );
    }

    public function test_proposta_publica_nao_vaza_gordura_mas_preco_reflete_pad(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $sem = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $this->payload(0));
        $com = $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', $this->payload(200));
        $etiquetaCom = (float) $com->json('data.faixas.0.valor_etiqueta');
        $this->assertGreaterThan((float) $sem->json('data.faixas.0.valor_etiqueta'), $etiquetaCom);

        $create = $this->withHeaders($h)->postJson('/api/v1/orcamentos', $this->payload(200));
        $create->assertCreated();
        $id = (int) $create->json('data.id');

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env->assertOk();
        $token = $env->json('data.token');

        $pub = $this->getJson("/api/v1/publico/orcamentos/{$token}");
        $pub->assertOk();
        $this->assertArrayNotHasKey('valor_gordura', $pub->json('data'));
        $this->assertArrayNotHasKey('valor_gordura', $pub->json('data.faixas.0'));
        $this->assertArrayNotHasKey('valor_etiqueta_base', $pub->json('data.faixas.0'));
        $this->assertEqualsWithDelta($etiquetaCom, (float) $pub->json('data.faixas.0.valor_etiqueta'), 0.01);

        $prev = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$id}/proposta-comercial");
        $prev->assertOk();
        $this->assertArrayNotHasKey('valor_gordura', $prev->json('data'));
        $this->assertArrayNotHasKey('valor_gordura', $prev->json('data.faixas.0'));
    }
}
