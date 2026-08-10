<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OrcamentoAprovacaoTest extends TestCase
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
            'codigo' => 'EMP-APV1',
            'razao_social' => 'RLP Teste Aprovacao',
            'nome_fantasia' => 'RLP',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'email' => 'comercial@rlp.test',
            'telefone' => '3133334444',
            'municipio' => 'Betim',
            'uf' => 'MG',
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'CLIENTE APV',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-APV1',
            'name' => 'Comercial APV',
            'email' => 'comercial.apv@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever']);
        $this->comercial->empresas()->attach($this->empresa->id);
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

    private function criarOrcamento(): int
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        return (int) $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $this->payload())
            ->json('data.id');
    }

    public function test_enviar_gera_link_e_trava_edicao(): void
    {
        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env->assertOk();
        $this->assertSame('ENVIADO', $env->json('data.orcamento.status'));
        $this->assertFalse($env->json('data.orcamento.editavel'));
        $url = $env->json('data.url');
        $this->assertStringContainsString('/p/', $url);
        $this->assertStringContainsString($env->json('data.token'), $env->json('data.mensagem'));

        $upd = $this->withHeaders($h)->putJson("/api/v1/orcamentos/{$id}", $this->payload());
        $upd->assertStatus(422);

        $del = $this->withHeaders($h)->deleteJson("/api/v1/orcamentos/{$id}");
        $del->assertStatus(422);
    }

    public function test_cliente_aprova_pelo_link_e_link_some(): void
    {
        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        $token = $this->withHeaders($h)
            ->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao")
            ->json('data.token');

        $pub = $this->getJson("/api/v1/publico/orcamentos/{$token}");
        $pub->assertOk();
        $this->assertSame('VISUALIZADO', $pub->json('data.status'));
        $this->assertArrayNotHasKey('imposto', $pub->json('data'));
        $this->assertArrayHasKey('faixas', $pub->json('data'));
        // DTO comercial não vaza composição de custo
        $this->assertArrayNotHasKey('valor_papel', $pub->json('data.faixas.0'));

        $ok = $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'APROVAR',
            'faixa_index' => 0,
            'nome_cliente' => 'Maria Compradora',
        ]);
        $ok->assertOk();
        $this->assertSame('APROVADO', $ok->json('data.status'));

        $orc = Orcamento::query()->findOrFail($id);
        $this->assertSame('APROVADO', $orc->status);
        $this->assertSame(0, $orc->aceite_faixa_index);
        $this->assertSame('Maria Compradora', $orc->aceite_nome_cliente);

        $gone = $this->getJson("/api/v1/publico/orcamentos/{$token}");
        $gone->assertStatus(410);
    }

    public function test_recusa_permite_editar_e_reenviar(): void
    {
        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        $token = $this->withHeaders($h)
            ->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao")
            ->json('data.token');

        $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", [
            'acao' => 'RECUSAR',
            'motivo' => 'Preço alto',
        ])->assertOk();

        $this->getJson("/api/v1/publico/orcamentos/{$token}")->assertStatus(410);

        $show = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$id}");
        $show->assertOk();
        $this->assertSame('REPROVADO', $show->json('data.status'));
        $this->assertTrue($show->json('data.editavel'));

        $payload = $this->payload();
        $payload['modelos'] = 4;
        $upd = $this->withHeaders($h)->putJson("/api/v1/orcamentos/{$id}", $payload);
        $upd->assertOk();
        $this->assertSame('CALCULADO', $upd->json('data.status'));
        $this->assertSame(2, $upd->json('data.versao'));

        $linkAntigo = OrcamentoLinkAprovacao::query()->where('orcamento_id', $id)->first();
        $this->assertFalse((bool) $linkAntigo?->ativo);

        $env2 = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env2->assertOk();
        $token2 = $env2->json('data.token');
        $this->assertNotSame($token, $token2);
        $this->getJson("/api/v1/publico/orcamentos/{$token2}")->assertOk();
    }

    public function test_lembrete_reusa_mesmo_token(): void
    {
        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $t1 = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao")->json('data.token');
        $t2 = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $t2->assertOk();
        $this->assertTrue($t2->json('data.reutilizado'));
        $this->assertSame($t1, $t2->json('data.token'));
    }
}
