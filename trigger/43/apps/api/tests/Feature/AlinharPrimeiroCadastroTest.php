<?php

namespace Tests\Feature;

use App\Models\CodigoSequence;
use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Conta FLEXORC = USR-00001; demo RLP sai; operador TRIGGER permanece.
 */
class AlinharPrimeiroCadastroTest extends TestCase
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

        $this->artisan('plataforma:alinhar-primeiro-cadastro', [
            'email' => 'varandasdorio1@gmail.com',
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'email' => 'varandasdorio1@gmail.com',
            'codigo' => 'USR-00014',
        ]);
        $this->assertDatabaseHas('users', ['email' => 'admin@rlp.com.br', 'codigo' => 'USR-00001']);
        $this->assertDatabaseHas('empresas', ['codigo' => 'EMP-00001']);
    }

    public function test_promove_usr1_e_remove_demo_rlp(): void
    {
        $cenario = $this->seedCenario();

        $this->artisan('plataforma:alinhar-primeiro-cadastro', [
            'email' => 'varandasdorio1@gmail.com',
            '--force' => true,
        ])->assertSuccessful();

        $this->assertDatabaseHas('users', [
            'email' => 'varandasdorio1@gmail.com',
            'codigo' => 'USR-00001',
            'empresa_default_id' => null,
            'parceiro_id' => null,
        ]);
        $this->assertDatabaseHas('conta_ativacoes', [
            'user_id' => $cenario['canon']->id,
            'billing_status' => ContaAtivacao::BILLING_ATIVA,
        ]);
        $this->assertDatabaseHas('users', ['email' => 'ops@triggerti.com']);
        $this->assertDatabaseMissing('users', ['email' => 'admin@rlp.com.br']);
        $this->assertDatabaseMissing('users', ['email' => 'comercial@rlp.com.br']);
        $this->assertDatabaseMissing('empresas', ['codigo' => 'EMP-00001']);
        $this->assertDatabaseMissing('empresas', ['codigo' => 'EMP-00002']);
        $this->assertSame(0, (int) DB::table('empresa_user')->where('user_id', $cenario['canon']->id)->count());
        $this->assertTrue($cenario['ops']->fresh()->hasRole(PlatformRbac::ROLE));
        $this->assertSame(
            9,
            (int) CodigoSequence::query()->whereNull('empresa_id')->where('prefixo', 'USR')->value('proximo')
        );
        $this->assertSame(
            1,
            (int) CodigoSequence::query()->whereNull('empresa_id')->where('prefixo', 'EMP')->value('proximo')
        );
    }

    public function test_recusa_operador_plataforma(): void
    {
        $this->seedCenario();

        $this->artisan('plataforma:alinhar-primeiro-cadastro', [
            'email' => 'ops@triggerti.com',
            '--force' => true,
        ])->assertFailed();
    }

    /**
     * @return array{canon: User, ops: User}
     */
    private function seedCenario(): array
    {
        $demo1 = Empresa::query()->create([
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

        $admin = User::query()->create([
            'codigo' => 'USR-00001',
            'name' => 'Administrador RLP',
            'email' => 'admin@rlp.com.br',
            'password' => 'secret',
            'ativo' => true,
            'empresa_default_id' => $demo1->id,
        ]);
        $admin->empresas()->attach($demo1->id, ['padrao' => true]);

        User::query()->create([
            'codigo' => 'USR-00002',
            'name' => 'Comercial RLP',
            'email' => 'comercial@rlp.com.br',
            'password' => 'secret',
            'ativo' => true,
            'empresa_default_id' => $demo1->id,
        ]);

        $ops = User::query()->create([
            'codigo' => 'USR-00008',
            'name' => 'Operação TRIGGER',
            'email' => 'ops@triggerti.com',
            'password' => 'secret',
            'ativo' => true,
        ]);
        $ops->syncRoles([PlatformRbac::ROLE]);

        $canon = User::query()->create([
            'codigo' => 'USR-00014',
            'name' => 'Varandas',
            'email' => 'varandasdorio1@gmail.com',
            'password' => 'secret',
            'ativo' => true,
        ]);
        $canon->syncRoles(['ADMIN']);

        ContaAtivacao::query()->create([
            'user_id' => $canon->id,
            'billing_status' => ContaAtivacao::BILLING_ATIVA,
            'billing_provider' => 'asaas',
            'billing_metodo_em' => now(),
        ]);

        CodigoSequence::query()->create([
            'empresa_id' => null,
            'prefixo' => 'USR',
            'proximo' => 15,
        ]);
        CodigoSequence::query()->create([
            'empresa_id' => null,
            'prefixo' => 'EMP',
            'proximo' => 3,
        ]);

        return compact('canon', 'ops');
    }
}
