<?php

namespace Tests\Feature;

use App\Mail\OrcamentoPropostaMail;
use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
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
            'whatsapp' => '31999998888',
            'contato_nome' => 'Maria Compradora',
            // Crédito liberado → sem adiantamento PIX (cenário B). PIX = AdiantamentoOrcamentoTest.
            'limite_credito' => '10000.00',
        ]);

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

        ParceiroContato::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'nome' => 'João Financeiro',
            'funcao' => 'Financeiro',
            'email' => 'joao@cliente.test',
            'principal' => false,
            'autorizado_aprovar' => false,
            'ordem' => 1,
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

        $dest = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$id}/destinatarios-aprovacao");
        $dest->assertOk();
        $this->assertCount(1, $dest->json('data.destinatarios'));
        $this->assertSame('Maria Compradora', $dest->json('data.destinatarios.0.nome'));
        $contatoId = $dest->json('data.destinatarios.0.parceiro_contato_id');

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao", [
            'parceiro_contato_id' => $contatoId,
        ]);
        $env->assertOk();
        $this->assertSame('ENVIADO', $env->json('data.orcamento.status'));
        $this->assertFalse($env->json('data.orcamento.editavel'));
        $this->assertSame('Maria Compradora', $env->json('data.destinatario.nome'));
        $this->assertStringContainsString('Maria', $env->json('data.mensagem'));
        $url = $env->json('data.url');
        $this->assertStringContainsString('/p/', $url);
        $this->assertStringContainsString($env->json('data.token'), $env->json('data.mensagem'));
        $this->assertStringContainsString('wa.me/', (string) $env->json('data.canal_url'));
        $this->assertStringContainsString('não encaminhe', $env->json('data.mensagem'));

        $upd = $this->withHeaders($h)->putJson("/api/v1/orcamentos/{$id}", $this->payload());
        $upd->assertStatus(422);

        $del = $this->withHeaders($h)->deleteJson("/api/v1/orcamentos/{$id}");
        $del->assertStatus(422);
    }

    public function test_exige_destinatario_quando_ha_varios_autorizados(): void
    {
        ParceiroContato::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'nome' => 'Ana Diretora',
            'funcao' => 'Diretora',
            'whatsapp' => '31988887777',
            'principal' => false,
            'autorizado_aprovar' => true,
            'ordem' => 2,
        ]);

        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $fail = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao", []);
        $fail->assertStatus(422);

        $lista = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$id}/destinatarios-aprovacao");
        $this->assertCount(2, $lista->json('data.destinatarios'));
        $cid = $lista->json('data.destinatarios.1.parceiro_contato_id');

        $ok = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao", [
            'parceiro_contato_id' => $cid,
        ]);
        $ok->assertOk();
        $this->assertSame('Ana Diretora', $ok->json('data.destinatario.nome'));
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
        $this->assertSame('Maria Compradora', $pub->json('data.destinatario.nome'));
        $this->assertStringContainsString('Maria Compradora', $pub->json('data.destinatario.instrucao'));
        $this->assertArrayNotHasKey('imposto', $pub->json('data'));
        $this->assertArrayHasKey('faixas', $pub->json('data'));
        // DTO comercial não vaza composição de custo
        $this->assertArrayNotHasKey('valor_papel', $pub->json('data.faixas.0'));
        $this->assertSame('RETIRAR', $pub->json('data.frete.modo'));
        $this->assertSame('Retirada no local', $pub->json('data.frete.texto'));
        $this->assertFalse($pub->json('data.frete.somavel'));
        $this->assertEqualsWithDelta(
            (float) $pub->json('data.faixas.0.valor_etiqueta') + (float) $pub->json('data.faixas.0.valor_matriz'),
            (float) $pub->json('data.faixas.0.valor_total'),
            0.02,
        );

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

    public function test_proposta_publica_expoe_composicao_dos_modelos(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $payload = $this->payload();
        $payload['modelos'] = 2;
        $payload['modelos_composicao'] = [
            ['nome' => 'maçã verde', 'percentual' => 30],
            ['nome' => 'abacate', 'percentual' => 70],
        ];

        $id = (int) $this->withHeaders($h)->postJson('/api/v1/orcamentos', $payload)->json('data.id');
        $token = $this->withHeaders($h)
            ->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao")
            ->json('data.token');

        $pub = $this->getJson("/api/v1/publico/orcamentos/{$token}");
        $pub->assertOk();
        $this->assertSame(2, $pub->json('data.descricao.modelos'));
        $this->assertSame('maçã verde', $pub->json('data.descricao.modelos_composicao.0.nome'));
        $this->assertEqualsWithDelta(30.0, (float) $pub->json('data.descricao.modelos_composicao.0.percentual'), 0.01);
        $this->assertSame('abacate', $pub->json('data.descricao.modelos_composicao.1.nome'));
        $this->assertEqualsWithDelta(70.0, (float) $pub->json('data.descricao.modelos_composicao.1.percentual'), 0.01);
        // Continua sem vazar breakdown de custo
        $this->assertArrayNotHasKey('valor_papel', $pub->json('data.faixas.0'));
    }

    public function test_previa_interna_sem_decidir_e_sem_consumir_link(): void
    {
        Sanctum::actingAs($this->comercial);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $id = $this->criarOrcamento();
        $prev = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$id}/proposta-comercial");
        $prev->assertOk();
        $this->assertSame('preview', $prev->json('data.modo'));
        $this->assertTrue($prev->json('data.somente_leitura'));
        $this->assertFalse($prev->json('data.disponivel'));
        $this->assertArrayHasKey('faixas', $prev->json('data'));
        $this->assertArrayHasKey('formato_faca', $prev->json('data.descricao'));
        $this->assertArrayHasKey('medida', $prev->json('data.descricao'));
        $this->assertArrayNotHasKey('z', $prev->json('data.descricao'));
        $this->assertArrayNotHasKey('maquina', $prev->json('data.descricao'));
        $this->assertArrayNotHasKey('valor_papel', $prev->json('data.faixas.0'));

        $token = $this->withHeaders($h)
            ->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao")
            ->json('data.token');

        // Prévia não marca VISUALIZADO
        $this->assertSame('ENVIADO', Orcamento::query()->findOrFail($id)->status);

        $prev2 = $this->withHeaders($h)->getJson("/api/v1/orcamentos/{$id}/proposta-comercial");
        $prev2->assertOk();
        $this->assertSame('preview', $prev2->json('data.modo'));
        $this->assertSame('ENVIADO', Orcamento::query()->findOrFail($id)->status);

        // Link do cliente continua decidível
        $pub = $this->getJson("/api/v1/publico/orcamentos/{$token}");
        $pub->assertOk();
        $this->assertTrue($pub->json('data.disponivel'));
        $this->assertNotSame('preview', $pub->json('data.modo'));
    }

    public function test_enviar_dispara_email_ao_contato_mesmo_com_whatsapp_preferido(): void
    {
        Mail::fake();

        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env->assertOk();
        $this->assertTrue($env->json('data.email_enviado'));
        $this->assertSame('maria@cliente.test', $env->json('data.email_destino'));
        $this->assertNull($env->json('data.email_motivo'));
        // Canal preferido continua WhatsApp (clipboard / wa.me intactos).
        $this->assertStringContainsString('wa.me/', (string) $env->json('data.canal_url'));

        Mail::assertSent(OrcamentoPropostaMail::class, function (OrcamentoPropostaMail $mail) {
            return $mail->hasTo('maria@cliente.test')
                && $mail->hasReplyTo('comercial@rlp.test')
                && str_contains($mail->url, '/p/');
        });
    }

    public function test_enviar_sem_email_no_cadastro_nao_quebra_link(): void
    {
        Mail::fake();

        ParceiroContato::query()
            ->where('parceiro_id', $this->parceiro->id)
            ->where('autorizado_aprovar', true)
            ->update(['email' => null]);

        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env->assertOk();
        $this->assertSame('ENVIADO', $env->json('data.orcamento.status'));
        $this->assertFalse($env->json('data.email_enviado'));
        $this->assertSame('sem_email_cadastro', $env->json('data.email_motivo'));
        $this->assertStringContainsString('/p/', $env->json('data.url'));

        Mail::assertNothingSent();
    }

    public function test_flag_orcamento_email_auto_desliga_envio(): void
    {
        Mail::fake();
        config(['erp.orcamento_email_auto' => false]);

        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env->assertOk();
        $this->assertFalse($env->json('data.email_enviado'));
        $this->assertSame('desligado', $env->json('data.email_motivo'));
        Mail::assertNothingSent();
    }

    public function test_enviar_dispara_whatsapp_via_viazap_mesmo_com_email_no_cadastro(): void
    {
        Mail::fake();
        Http::fake([
            '*/v1/messages' => Http::response(['id' => 'msg_1', 'status' => 'queued'], 202),
        ]);
        config([
            'erp.viazap.base_url' => 'https://viazap.test',
            'erp.viazap.token' => 'zpv_test_token',
            'erp.orcamento_whatsapp_auto' => true,
        ]);

        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env->assertOk();
        $this->assertTrue($env->json('data.zap_enviado'));
        $this->assertSame('5531999998888', $env->json('data.zap_destino'));
        $this->assertNull($env->json('data.zap_motivo'));
        $this->assertStringContainsString('wa.me/', (string) $env->json('data.canal_url'));

        Http::assertSent(function ($request) {
            $body = $request->data();

            return str_contains($request->url(), '/v1/messages')
                && $request->hasHeader('Authorization', 'Bearer zpv_test_token')
                && ($body['external_id'] ?? '') === Orcamento::query()->orderByDesc('id')->value('codigo')
                && ($body['to'] ?? '') === '5531999998888'
                && ($body['type'] ?? '') === 'text'
                && str_contains((string) ($body['body'] ?? ''), '/p/');
        });
    }

    public function test_enviar_sem_whatsapp_no_cadastro_nao_quebra_link(): void
    {
        Mail::fake();
        Http::fake();
        config([
            'erp.viazap.base_url' => 'https://viazap.test',
            'erp.viazap.token' => 'zpv_test_token',
            'erp.orcamento_whatsapp_auto' => true,
        ]);

        ParceiroContato::query()
            ->where('parceiro_id', $this->parceiro->id)
            ->where('autorizado_aprovar', true)
            ->update(['whatsapp' => null]);
        $this->parceiro->update(['whatsapp' => null]);

        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env->assertOk();
        $this->assertSame('ENVIADO', $env->json('data.orcamento.status'));
        $this->assertFalse($env->json('data.zap_enviado'));
        $this->assertSame('sem_whatsapp_cadastro', $env->json('data.zap_motivo'));
        $this->assertStringContainsString('/p/', $env->json('data.url'));

        Http::assertNothingSent();
    }

    public function test_flag_orcamento_whatsapp_auto_desliga_envio(): void
    {
        Http::fake();
        config([
            'erp.viazap.base_url' => 'https://viazap.test',
            'erp.viazap.token' => 'zpv_test_token',
            'erp.orcamento_whatsapp_auto' => false,
        ]);

        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env->assertOk();
        $this->assertFalse($env->json('data.zap_enviado'));
        $this->assertSame('desligado', $env->json('data.zap_motivo'));
        Http::assertNothingSent();
    }

    public function test_falha_viazap_nao_quebra_envio_do_link(): void
    {
        Mail::fake();
        Http::fake([
            '*/v1/messages' => Http::response(['error' => 'unavailable'], 503),
        ]);
        config([
            'erp.viazap.base_url' => 'https://viazap.test',
            'erp.viazap.token' => 'zpv_test_token',
            'erp.orcamento_whatsapp_auto' => true,
        ]);

        $id = $this->criarOrcamento();
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $env = $this->withHeaders($h)->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao");
        $env->assertOk();
        $this->assertSame('ENVIADO', $env->json('data.orcamento.status'));
        $this->assertFalse($env->json('data.zap_enviado'));
        $this->assertSame('falha_envio', $env->json('data.zap_motivo'));
        $this->assertStringContainsString('/p/', $env->json('data.url'));
        $this->assertStringContainsString('wa.me/', (string) $env->json('data.canal_url'));
    }
}
