<?php

namespace Tests\Feature;

use App\Models\CodigoSequence;
use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Uma conta FLEXORC canônica + operador TRIGGER.
 * Demais self-service e legado RLP saem; o livro da conta (PAR/ORC) permanece.
 */
class PromoverContaCanonicaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('ADMIN', 'web');
        PlatformRbac::ensure();
    }

    public function test_dry_run_nao_altera_nada(): void
    {
        $this->seedCenario();

        $this->artisan('plataforma:promover-conta', [
            'email' => 'varandasdorio1@gmail.com',
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', ['email' => 'ensaio@test.local']);
        $this->assertDatabaseHas('empresas', ['codigo' => 'EMP-00005']);
    }

    public function test_preserva_conta_canonica_e_operador_e_remove_ensaio_e_rlp(): void
    {
        $cenario = $this->seedCenario();

        $this->artisan('plataforma:promover-conta', [
            'email' => 'varandasdorio1@gmail.com',
            '--force' => true,
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'email' => 'varandasdorio1@gmail.com',
            'name' => 'Varandas',
        ]);
        $this->assertDatabaseMissing('users', ['email' => 'admin@rlp.com.br']);
        $this->assertDatabaseHas('users', ['email' => 'ops@triggerti.com']);
        $this->assertDatabaseMissing('users', ['email' => 'ensaio@test.local']);

        $this->assertDatabaseHas('empresas', [
            'codigo' => 'EMP-00003',
            'nome_fantasia' => 'CONDOMINIO VARANDAS DO RIO I',
        ]);
        $this->assertDatabaseMissing('empresas', ['codigo' => 'EMP-00001']);
        $this->assertDatabaseMissing('empresas', ['codigo' => 'EMP-00002']);
        $this->assertDatabaseMissing('empresas', ['codigo' => 'EMP-00005']);

        $this->assertDatabaseHas('parceiros', [
            'id' => $cenario['parCanon']->id,
            'razao_social' => 'Varandas',
            'email' => 'varandasdorio1@gmail.com',
            'cargo' => 'Administrador',
        ]);
        $this->assertDatabaseHas('orcamentos', [
            'id' => $cenario['orc']->id,
            'codigo' => 'ORC-2026-00001',
        ]);
        $this->assertDatabaseMissing('parceiros', ['razao_social' => 'Cliente Ensaio']);
        $this->assertDatabaseHas('conta_ativacoes', [
            'user_id' => $cenario['canon']->id,
            'billing_status' => ContaAtivacao::BILLING_ATIVA,
        ]);
        $this->assertDatabaseMissing('conta_ativacoes', ['user_id' => $cenario['ensaio']->id]);

        $this->assertTrue($cenario['ops']->fresh()->hasRole(PlatformRbac::ROLE));
        $this->assertSame(
            15,
            (int) CodigoSequence::query()->whereNull('empresa_id')->where('prefixo', 'USR')->value('proximo')
        );
        $this->assertSame(
            4,
            (int) CodigoSequence::query()->whereNull('empresa_id')->where('prefixo', 'EMP')->value('proximo')
        );
    }

    public function test_recusa_operador_plataforma(): void
    {
        $this->seedCenario();

        $this->artisan('plataforma:promover-conta', [
            'email' => 'ops@triggerti.com',
            '--force' => true,
        ])->assertFailed();

        $this->assertDatabaseHas('users', ['email' => 'ensaio@test.local']);
    }

    public function test_recusa_email_ausente(): void
    {
        $this->artisan('plataforma:promover-conta', [
            'email' => 'naoexiste@test.local',
            '--force' => true,
        ])->assertFailed();
    }

    /**
     * @return array{canon: User, ensaio: User, ops: User, parCanon: Parceiro, orc: Orcamento}
     */
    private function seedCenario(): array
    {
        $demo1 = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP ETIQUETAS AUTO ADESIVOS LTDA',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);
        Empresa::query()->create([
            'codigo' => 'EMP-00002',
            'razao_social' => 'ADESIVOS UDI LTDA',
            'cnpj' => '58820046000137',
            'situacao' => 'ATIVA',
        ]);

        $admin = User::query()->create([
            'codigo' => 'USR-00001',
            'name' => 'Administrador RLP',
            'email' => 'admin@rlp.com.br',
            'password' => 'secret',
            'ativo' => true,
            'empresa_default_id' => $demo1->id,
        ]);
        $admin->empresas()->attach($demo1->id, ['padrao' => true]);

        $ops = User::query()->create([
            'codigo' => 'USR-00008',
            'name' => 'Operação TRIGGER',
            'email' => 'ops@triggerti.com',
            'password' => 'secret',
            'ativo' => true,
        ]);
        $ops->syncRoles([PlatformRbac::ROLE]);

        $empCanon = Empresa::query()->create([
            'codigo' => 'EMP-00003',
            'razao_social' => 'CONDOMINIO VARANDAS DO RIO I',
            'nome_fantasia' => null,
            'cnpj' => '21325579000132',
            'situacao' => 'ATIVA',
        ]);

        $parCanon = Parceiro::query()->create([
            'empresa_id' => $empCanon->id,
            'codigo' => 'PAR-00001',
            'tipo_pessoa' => 'PF',
            'razao_social' => 'varandas',
            'papel_colaborador' => true,
            'situacao' => 'ATIVO',
        ]);

        $parCliente = Parceiro::query()->create([
            'empresa_id' => $empCanon->id,
            'codigo' => 'PAR-00003',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'RADIO TELEVISAO DE UBERLANDIA LTDA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $canon = User::query()->create([
            'codigo' => 'USR-00014',
            'name' => 'varandas',
            'email' => 'varandasdorio1@gmail.com',
            'password' => 'secret',
            'ativo' => true,
            'parceiro_id' => $parCanon->id,
            'empresa_default_id' => $empCanon->id,
        ]);
        $canon->syncRoles(['ADMIN']);
        $canon->empresas()->attach($empCanon->id, ['padrao' => true]);

        ContaAtivacao::query()->create([
            'user_id' => $canon->id,
            'billing_status' => ContaAtivacao::BILLING_ATIVA,
            'billing_provider' => 'asaas',
            'billing_metodo_em' => now(),
        ]);

        $orc = Orcamento::query()->create([
            'empresa_id' => $empCanon->id,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-2026-00001',
            'versao' => 1,
            'parceiro_id' => $parCliente->id,
            'cliente_nome' => $parCliente->razao_social,
            'status' => Orcamento::STATUS_APROVADO,
            'input_snapshot' => [],
            'result_snapshot' => [],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        $empEnsaio = Empresa::query()->create([
            'codigo' => 'EMP-00005',
            'razao_social' => 'Ensaio Self Service',
            'cnpj' => '34661762000150',
            'situacao' => 'ATIVA',
        ]);
        $parEnsaio = Parceiro::query()->create([
            'empresa_id' => $empEnsaio->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'Cliente Ensaio',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);
        $ensaio = User::query()->create([
            'codigo' => 'USR-00012',
            'name' => 'Ensaio',
            'email' => 'ensaio@test.local',
            'password' => 'secret',
            'ativo' => true,
            'empresa_default_id' => $empEnsaio->id,
        ]);
        $ensaio->empresas()->attach($empEnsaio->id, ['padrao' => true]);
        ContaAtivacao::query()->create([
            'user_id' => $ensaio->id,
            'billing_status' => ContaAtivacao::BILLING_PENDENTE,
            'billing_provider' => 'mock',
        ]);

        CodigoSequence::query()->create([
            'empresa_id' => null,
            'prefixo' => 'USR',
            'proximo' => 15,
        ]);
        CodigoSequence::query()->create([
            'empresa_id' => null,
            'prefixo' => 'EMP',
            'proximo' => 6,
        ]);

        return compact('canon', 'ensaio', 'ops', 'parCanon', 'orc', 'parEnsaio');
    }
}
