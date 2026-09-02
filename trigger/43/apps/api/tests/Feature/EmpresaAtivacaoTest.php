<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EmpresaAtivacao;
use App\Models\EmpresaCertificadoA1;
use App\Models\OrcCatalogoPapel;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\Concerns\FakesConsultaExterna;
use Tests\TestCase;

class EmpresaAtivacaoTest extends TestCase
{
    use FakesConsultaExterna;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeConsultaExternaIndisponivel();
        config(['erp.flexorc.public_conta_registration' => true]);

        foreach ([
            'empresas.gerir',
            'parametros.gerir',
            'usuarios.gerir',
            'parceiro.ler',
            'parceiro.escrever',
            'produto.ler',
            'produto.escrever',
            'orcamento.ler',
            'orcamento.escrever',
            'orcamento.catalogo.gerir',
            'financeiro.ler',
            'financeiro.escrever',
            'patrimonio.ler',
            'patrimonio.escrever',
            'departamento.ler',
            'departamento.escrever',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $admin = Role::findOrCreate('ADMIN', 'web');
        $admin->syncPermissions(Permission::all());
    }

    /**
     * @return array{token: string, empresa_id: int, headers: array<string, string>}
     */
    private function cadastrarEmpresa(): array
    {
        $res = $this->postJson('/api/v1/auth/registrar-empresa', [
            'cnpj' => '34661762000150',
            'razao_social' => 'GRAFICA NOVA LTDA',
            'nome_fantasia' => 'Grafica Nova',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400000',
            'admin_name' => 'Ana Admin',
            'admin_email' => 'ana@grafica-nova.com.br',
            'admin_password' => 'SenhaForte1',
        ])->assertCreated();

        $empresaId = (int) $res->json('empresa.id');

        return [
            'token' => (string) $res->json('token'),
            'empresa_id' => $empresaId,
            'headers' => [
                'Authorization' => 'Bearer '.$res->json('token'),
                'X-Empresa-Id' => (string) $empresaId,
            ],
        ];
    }

    public function test_empresa_nova_comeca_do_zero_com_ativacao_pendente(): void
    {
        $out = $this->cadastrarEmpresa();
        $empresaId = $out['empresa_id'];

        $this->assertDatabaseHas('empresa_ativacoes', [
            'empresa_id' => $empresaId,
            'billing_status' => EmpresaAtivacao::BILLING_PENDENTE,
        ]);
        $this->assertGreaterThan(0, OrcCatalogoPapel::query()->where('empresa_id', $empresaId)->count());
        $this->assertSame(0, Parceiro::query()
            ->where('empresa_id', $empresaId)
            ->where(function ($q) {
                $q->where('papel_cliente', true)->orWhere('is_prospect', true);
            })
            ->count());
        $this->assertSame(0, Orcamento::query()->where('empresa_id', $empresaId)->count());

        $at = $this->withHeaders($out['headers'])->getJson('/api/v1/ativacao')->assertOk();
        $this->assertSame('self_service', $at->json('data.origem'));
        $this->assertFalse($at->json('data.pronta'));
        $this->assertTrue($at->json('data.pagamento_pendente'));
        $this->assertTrue($at->json('data.certificado_a1_pendente'));
        $this->assertFalse($at->json('data.pode_enviar_orcamento'));
        $this->assertSame('pagamento', $at->json('data.proximo'));
        $this->assertSame('FLEXOERP', $at->json('data.conta.produto'));
        $this->assertSame('TRIGGER', $at->json('data.conta.fornecedor'));
        $this->assertSame('Ana Admin', $at->json('data.conta.pagador.razao_social'));
        $this->assertFalse($at->json('data.conta.paga'));
        $this->assertNotEmpty($at->json('data.conta.valor_formatado'));
        $this->assertSame('Aguardando pagamento', $at->json('data.conta.status_label'));
        $this->assertNull($at->json('data.conta.proxima_cobranca_em'));
        $this->assertNull($at->json('data.conta.dias_ate_proxima'));
        $this->assertContains('Cartão de crédito', $at->json('data.conta.meios'));
        $this->assertSame(['Cartão de crédito'], $at->json('data.conta.meios'));
        $pagamentoPasso = collect($at->json('data.passos'))->firstWhere('id', 'pagamento');
        $this->assertSame('/conta/mensalidade', $pagamentoPasso['to'] ?? null);

        $painel = $this->withHeaders($out['headers'])->getJson('/api/v1/painel')->assertOk();
        $this->assertSame('self_service', $painel->json('data.ativacao.origem'));
        $this->assertSame(0, $this->cardValor($painel->json('data.cadeia'), 'parceiros'));
    }

    public function test_demo_autentica_pagamento_pix_e_catalogo(): void
    {
        $out = $this->cadastrarEmpresa();
        $h = $out['headers'];

        $this->withHeaders($h)
            ->postJson('/api/v1/ativacao/pagamento/confirmar-demo')
            ->assertOk()
            ->assertJsonPath('data.pode_enviar_orcamento', false)
            ->assertJsonPath('data.certificado_a1_pendente', true)
            ->assertJsonPath('data.billing_status', EmpresaAtivacao::BILLING_ATIVA)
            ->assertJsonPath('data.proximo', 'certificado_a1');

        $apos = $this->withHeaders($h)->getJson('/api/v1/ativacao')->assertOk();
        $this->assertTrue($apos->json('data.conta.paga'));
        $this->assertSame('Licença ativa', $apos->json('data.conta.status_label'));
        $this->assertNotNull($apos->json('data.conta.proxima_cobranca_em'));
        $this->assertIsInt($apos->json('data.conta.dias_ate_proxima'));
        $this->assertGreaterThanOrEqual(0, $apos->json('data.conta.dias_ate_proxima'));
        $this->assertNotEmpty($apos->json('data.conta.renovacao_label'));

        $this->withHeaders($h)
            ->postJson('/api/v1/ativacao/recebimento', ['pix_chave' => 'ana@grafica-nova.com.br'])
            ->assertOk();

        $this->assertDatabaseHas('empresa_contas_financeiras', [
            'empresa_id' => $out['empresa_id'],
            'pix_chave' => 'ana@grafica-nova.com.br',
        ]);

        $this->withHeaders($h)
            ->postJson('/api/v1/ativacao/catalogo/conferir')
            ->assertOk();

        $this->assertNotNull(
            EmpresaAtivacao::query()->where('empresa_id', $out['empresa_id'])->value('catalogo_conferido_em')
        );

        $this->gravarA1Apto(Empresa::query()->findOrFail($out['empresa_id']));
        $liberada = $this->withHeaders($h)->getJson('/api/v1/ativacao')->assertOk();
        $this->assertTrue($liberada->json('data.pode_enviar_orcamento'));
        $this->assertTrue($liberada->json('data.pronta'));
        $this->assertFalse($liberada->json('data.certificado_a1_pendente'));
        $this->assertFalse($liberada->json('data.certificado_a1_alerta'));
        $this->assertSame('VIGENTE', $liberada->json('data.certificado_a1_status'));
    }

    public function test_ativacao_alerta_automatico_quando_a1_a_vencer(): void
    {
        config(['erp.certificado_a1.alerta_dias' => 30]);
        $out = $this->cadastrarEmpresa();
        $h = $out['headers'];
        $empresa = Empresa::query()->findOrFail($out['empresa_id']);

        $this->withHeaders($h)->postJson('/api/v1/ativacao/pagamento/confirmar-demo')->assertOk();

        EmpresaCertificadoA1::query()->create([
            'empresa_id' => $empresa->id,
            'pfx_cipher' => 'cipher-teste',
            'senha_cipher' => 'cipher-teste',
            'arquivo_nome' => 'a-vencer.pfx',
            'tamanho_bytes' => 12,
            'cnpj_certificado' => preg_replace('/\D/', '', (string) $empresa->cnpj),
            'valido_de' => now()->subMonth(),
            'valido_ate' => now()->addDays(5),
            'fingerprint_sha256' => hash('sha256', 'a1-ativacao-a-vencer'),
            'uploaded_at' => now()->subMonth(),
        ]);

        $at = $this->withHeaders($h)->getJson('/api/v1/ativacao')->assertOk();
        $this->assertFalse($at->json('data.certificado_a1_pendente'));
        $this->assertTrue($at->json('data.pode_enviar_orcamento'));
        $this->assertTrue($at->json('data.certificado_a1_alerta'));
        $this->assertSame('A_VENCER', $at->json('data.certificado_a1_status'));
        $this->assertSame('urgent', $at->json('data.certificado_a1_alerta_nivel'));
        $this->assertSame(5, $at->json('data.certificado_a1_dias_para_vencer'));
        $this->assertNotEmpty($at->json('data.certificado_a1_mensagem'));
    }

    public function test_envio_do_orcamento_exige_pagamento_na_emp_self_service(): void
    {
        $out = $this->cadastrarEmpresa();
        $empresa = Empresa::query()->findOrFail($out['empresa_id']);
        $user = User::query()->where('email', 'ana@grafica-nova.com.br')->firstOrFail();
        Sanctum::actingAs($user);

        $par = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-00099',
            'razao_social' => 'Cliente Primeiro',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => true,
        ]);
        ParceiroContato::query()->create([
            'parceiro_id' => $par->id,
            'nome' => 'Compras',
            'email' => 'compras@cliente.test',
            'principal' => true,
            'autorizado_aprovar' => true,
        ]);

        $orc = Orcamento::query()->create([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-2026-00001',
            'versao' => 1,
            'parceiro_id' => $par->id,
            'cliente_nome' => $par->razao_social,
            'status' => Orcamento::STATUS_CALCULADO,
            'input_snapshot' => [],
            'result_snapshot' => ['faixas' => [['quantidade' => 1000, 'total' => 10]]],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        $h = ['X-Empresa-Id' => (string) $empresa->id];
        $this->withHeaders($h)
            ->postJson("/api/v1/orcamentos/{$orc->id}/enviar-aprovacao")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['pagamento']);

        $this->withHeaders($h)->postJson('/api/v1/ativacao/pagamento/confirmar-demo')->assertOk();

        $this->withHeaders($h)
            ->postJson("/api/v1/orcamentos/{$orc->id}/enviar-aprovacao")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['certificado_a1']);

        EmpresaCertificadoA1::query()->create([
            'empresa_id' => $empresa->id,
            'pfx_cipher' => 'cipher-teste',
            'senha_cipher' => 'cipher-teste',
            'arquivo_nome' => 'outro.pfx',
            'tamanho_bytes' => 12,
            'cnpj_certificado' => '00000000000191',
            'valido_de' => now()->subDay(),
            'valido_ate' => now()->addYear(),
            'fingerprint_sha256' => hash('sha256', 'a1-divergente-'.$empresa->id),
            'uploaded_at' => now(),
        ]);

        $this->withHeaders($h)
            ->postJson("/api/v1/orcamentos/{$orc->id}/enviar-aprovacao")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['certificado_a1']);

        EmpresaCertificadoA1::query()->where('empresa_id', $empresa->id)->delete();
        $this->gravarA1Apto($empresa);

        $this->withHeaders($h)
            ->postJson("/api/v1/orcamentos/{$orc->id}/enviar-aprovacao")
            ->assertOk();
    }

    public function test_webhook_asaas_confirma_billing_sem_confundir_com_sinal(): void
    {
        $out = $this->cadastrarEmpresa();
        $empresaId = $out['empresa_id'];

        $this->postJson('/api/v1/webhooks/bancarios/asaas', [
            'event' => 'PAYMENT_RECEIVED',
            'payment' => [
                'id' => 'pay_billing_1',
                'status' => 'RECEIVED',
                'externalReference' => 'FLEXORC-BILLING-'.$empresaId,
                'value' => 1,
            ],
        ])->assertOk()->assertJsonPath('data.camada', 'billing');

        $this->assertDatabaseHas('empresa_ativacoes', [
            'empresa_id' => $empresaId,
            'billing_status' => EmpresaAtivacao::BILLING_ATIVA,
            'billing_provider' => 'asaas',
        ]);
    }

    public function test_legado_sem_ativacao_nao_aparece_como_setup(): void
    {
        Permission::findOrCreate('orcamento.ler', 'web');
        $emp = Empresa::query()->create([
            'codigo' => 'EMP-LEGADO',
            'razao_social' => 'Empresa Legado',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);
        $user = User::query()->create([
            'codigo' => 'USR-LEG',
            'name' => 'Legado',
            'email' => 'legado@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $emp->id,
        ]);
        $user->givePermissionTo(['orcamento.ler']);
        $user->empresas()->attach($emp->id, ['padrao' => true]);
        Sanctum::actingAs($user);

        $res = $this->withHeader('X-Empresa-Id', (string) $emp->id)
            ->getJson('/api/v1/ativacao')
            ->assertOk();

        $this->assertSame('legado', $res->json('data.origem'));
        $this->assertTrue($res->json('data.pronta'));
        $this->assertTrue($res->json('data.pode_enviar_orcamento'));
        $this->assertFalse($res->json('data.certificado_a1_pendente'));
        $this->assertNull($res->json('data.conta'));
    }

    public function test_repor_demo_remove_todas_emps_e_contas_flexorc(): void
    {
        Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'Demo RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);
        Empresa::query()->create([
            'codigo' => 'EMP-00002',
            'razao_social' => 'Demo UDI',
            'cnpj' => '58820046000137',
            'situacao' => 'ATIVA',
        ]);
        $emp2 = Empresa::query()->where('codigo', 'EMP-00002')->firstOrFail();
        Parceiro::query()->create([
            'empresa_id' => $emp2->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'joao',
            'papel_cliente' => true,
            'is_prospect' => true,
            'situacao' => 'ATIVO',
        ]);
        Empresa::query()->create([
            'codigo' => 'EMP-00003',
            'razao_social' => 'Ensaio Self Service',
            'cnpj' => '34661762000150',
            'situacao' => 'ATIVA',
        ]);
        User::query()->create([
            'codigo' => 'USR-0099',
            'name' => 'Ensaio',
            'email' => 'ensaio@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
        ]);

        $this->artisan('plataforma:repor-demo', ['--force' => true])->assertSuccessful();

        $this->assertDatabaseMissing('empresas', ['codigo' => 'EMP-00001']);
        $this->assertDatabaseMissing('empresas', ['codigo' => 'EMP-00002']);
        $this->assertDatabaseMissing('empresas', ['codigo' => 'EMP-00003']);
        $this->assertDatabaseMissing('users', ['email' => 'ensaio@test.local']);
        $this->assertDatabaseMissing('parceiros', ['razao_social' => 'joao']);
    }

    /**
     * @param  list<array<string, mixed>>  $cadeia
     */
    private function cardValor(array $cadeia, string $id): mixed
    {
        foreach ($cadeia as $card) {
            if (($card['id'] ?? null) === $id) {
                return $card['valor'] ?? null;
            }
        }

        return null;
    }

    private function gravarA1Apto(Empresa $empresa): void
    {
        EmpresaCertificadoA1::query()->create([
            'empresa_id' => $empresa->id,
            'pfx_cipher' => 'cipher-teste',
            'senha_cipher' => 'cipher-teste',
            'arquivo_nome' => 'empresa.pfx',
            'tamanho_bytes' => 12,
            'cnpj_certificado' => preg_replace('/\D/', '', (string) $empresa->cnpj),
            'valido_de' => now()->subDay(),
            'valido_ate' => now()->addYear(),
            'fingerprint_sha256' => hash('sha256', 'teste-a1-'.$empresa->id),
            'uploaded_at' => now(),
        ]);
    }
}
