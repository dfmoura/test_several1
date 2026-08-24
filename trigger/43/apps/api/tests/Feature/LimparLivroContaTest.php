<?php

namespace Tests\Feature;

use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Zera EMP + ORC de uma conta FLEXORC sem tocar demo, billing nem outras contas.
 */
class LimparLivroContaTest extends TestCase
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
        $cenario = $this->seedCenario();

        $this->artisan('plataforma:limpar-livro-conta', [
            'email' => 'varandasdorio1@gmail.com',
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertDatabaseHas('empresas', ['id' => $cenario['emp']->id]);
        $this->assertDatabaseHas('orcamentos', ['id' => $cenario['orc']->id]);
    }

    public function test_remove_emps_e_orcs_preserva_conta_e_demo(): void
    {
        $cenario = $this->seedCenario();

        $this->artisan('plataforma:limpar-livro-conta', [
            'email' => 'varandasdorio1@gmail.com',
            '--force' => true,
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'email' => 'varandasdorio1@gmail.com',
            'empresa_default_id' => null,
            'parceiro_id' => null,
        ]);
        $this->assertDatabaseHas('conta_ativacoes', [
            'user_id' => $cenario['user']->id,
            'billing_status' => ContaAtivacao::BILLING_ATIVA,
        ]);
        $this->assertDatabaseHas('empresas', ['codigo' => 'EMP-00001']);
        $this->assertDatabaseHas('empresas', ['codigo' => 'EMP-00002']);
        $this->assertDatabaseMissing('empresas', ['id' => $cenario['emp']->id]);
        $this->assertDatabaseMissing('orcamentos', ['id' => $cenario['orc']->id]);
        $this->assertDatabaseMissing('parceiros', ['id' => $cenario['parCliente']->id]);
        $this->assertSame(0, (int) DB::table('empresa_user')->where('user_id', $cenario['user']->id)->count());
        $this->assertDatabaseHas('empresas', ['id' => $cenario['outraEmp']->id]);
        $this->assertDatabaseHas('users', ['email' => 'ensaio@test.local']);
    }

    public function test_recusa_se_emp_compartilhada(): void
    {
        $cenario = $this->seedCenario();
        $outro = User::query()->create([
            'codigo' => 'USR-00099',
            'name' => 'Outro',
            'email' => 'outro@test.local',
            'password' => 'secret',
            'ativo' => true,
        ]);
        $outro->empresas()->attach($cenario['emp']->id, ['padrao' => false]);

        $this->artisan('plataforma:limpar-livro-conta', [
            'email' => 'varandasdorio1@gmail.com',
            '--force' => true,
        ])->assertFailed();

        $this->assertDatabaseHas('empresas', ['id' => $cenario['emp']->id]);
        $this->assertDatabaseHas('orcamentos', ['id' => $cenario['orc']->id]);
    }

    public function test_recusa_operador_plataforma(): void
    {
        $ops = User::query()->create([
            'codigo' => 'USR-00008',
            'name' => 'Ops',
            'email' => 'ops@triggerti.com',
            'password' => 'secret',
            'ativo' => true,
        ]);
        $ops->syncRoles([PlatformRbac::ROLE]);

        $this->artisan('plataforma:limpar-livro-conta', [
            'email' => 'ops@triggerti.com',
            '--force' => true,
        ])->assertFailed();
    }

    /**
     * @return array{
     *   user: User,
     *   emp: Empresa,
     *   orc: Orcamento,
     *   parCliente: Parceiro,
     *   outraEmp: Empresa
     * }
     */
    private function seedCenario(): array
    {
        Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP ETIQUETAS',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);
        Empresa::query()->create([
            'codigo' => 'EMP-00002',
            'razao_social' => 'UDI ETIQUETAS',
            'cnpj' => '58820046000137',
            'situacao' => 'ATIVA',
        ]);

        $emp = Empresa::query()->create([
            'codigo' => 'EMP-00003',
            'razao_social' => 'CONDOMINIO VARANDAS DO RIO I',
            'nome_fantasia' => 'CONDOMINIO VARANDAS DO RIO I',
            'cnpj' => '21325579000132',
            'situacao' => 'ATIVA',
        ]);

        $parMaster = Parceiro::query()->create([
            'empresa_id' => $emp->id,
            'codigo' => 'PAR-00001',
            'tipo_pessoa' => 'PF',
            'razao_social' => 'Varandas',
            'papel_colaborador' => true,
            'situacao' => 'ATIVO',
        ]);

        $parCliente = Parceiro::query()->create([
            'empresa_id' => $emp->id,
            'codigo' => 'PAR-00003',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'RADIO TELEVISAO DE UBERLANDIA LTDA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-00014',
            'name' => 'Varandas',
            'email' => 'varandasdorio1@gmail.com',
            'password' => 'secret',
            'ativo' => true,
            'parceiro_id' => $parMaster->id,
            'empresa_default_id' => $emp->id,
        ]);
        $user->syncRoles(['ADMIN']);
        $user->empresas()->attach($emp->id, ['padrao' => true]);

        ContaAtivacao::query()->create([
            'user_id' => $user->id,
            'billing_status' => ContaAtivacao::BILLING_ATIVA,
            'billing_provider' => 'asaas',
            'billing_metodo_em' => now(),
        ]);

        $orc = Orcamento::query()->create([
            'empresa_id' => $emp->id,
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

        $outraEmp = Empresa::query()->create([
            'codigo' => 'EMP-00005',
            'razao_social' => 'Ensaio Self Service',
            'cnpj' => '34661762000150',
            'situacao' => 'ATIVA',
        ]);
        $ensaio = User::query()->create([
            'codigo' => 'USR-00012',
            'name' => 'Ensaio',
            'email' => 'ensaio@test.local',
            'password' => 'secret',
            'ativo' => true,
            'empresa_default_id' => $outraEmp->id,
        ]);
        $ensaio->empresas()->attach($outraEmp->id, ['padrao' => true]);

        return compact('user', 'emp', 'orc', 'parCliente', 'outraEmp');
    }
}
