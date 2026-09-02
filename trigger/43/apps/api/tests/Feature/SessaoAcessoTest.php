<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SessaoAcessoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottleRequests::class);

        config([
            'erp.auth.idle_minutes' => 30,
            'erp.auth.max_usuarios_simultaneos' => 2,
        ]);

        PlatformRbac::ensure();
        Permission::findOrCreate('usuarios.gerir', 'web');
        Role::findOrCreate('ADMIN', 'web');
        Role::findOrCreate('CONSULTA', 'web');
    }

    public function test_politica_canonica_seis_assentos_e_trinta_minutos(): void
    {
        config([
            'erp.auth.idle_minutes' => 30,
            'erp.auth.max_usuarios_simultaneos' => 6,
        ]);

        $svc = app(\App\Services\Auth\SessaoAcessoService::class);
        $this->assertSame(30, $svc->idleMinutes());
        $this->assertSame(6, $svc->maxUsuariosSimultaneos());
    }

    public function test_segundo_login_do_mesmo_usuario_e_recusado_enquanto_houver_sessao(): void
    {
        $user = $this->criarUsuario('ana@test.local');

        $token = $this->loginOk($user->email)->json('token');

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'SenhaForte1',
        ])
            ->assertStatus(409)
            ->assertJsonPath('code', 'SESSAO_OCUPADA')
            ->assertJsonPath('pode_encerrar_anterior', true);

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_encerrar_sessao_anterior_invalida_a_orfa_e_entra(): void
    {
        $user = $this->criarUsuario('bruno@test.local');
        $tokenAntigo = $this->loginOk($user->email)->json('token');

        $segundo = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'SenhaForte1',
            'encerrar_sessao_anterior' => true,
        ])->assertOk();

        $this->assertNotSame($tokenAntigo, $segundo->json('token'));
        $this->withToken($tokenAntigo)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->withToken($segundo->json('token'))->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_teto_de_usuarios_simultaneos_diferentes(): void
    {
        $a = $this->criarUsuario('a@test.local');
        $b = $this->criarUsuario('b@test.local');
        $c = $this->criarUsuario('c@test.local');

        $tokenA = $this->loginOk($a->email)->json('token');
        $this->loginOk($b->email);

        $this->postJson('/api/v1/auth/login', [
            'email' => $c->email,
            'password' => 'SenhaForte1',
        ])
            ->assertStatus(409)
            ->assertJsonPath('code', 'SESSOES_LIMITE')
            ->assertJsonPath('pode_encerrar_anterior', false);

        $this->withToken($tokenA)->postJson('/api/v1/auth/logout')->assertOk();

        $this->loginOk($c->email)->assertJsonPath('user.email', $c->email);
    }

    public function test_operador_plataforma_nao_consome_assento(): void
    {
        $a = $this->criarUsuario('op-a@test.local');
        $b = $this->criarUsuario('op-b@test.local');
        $ops = $this->criarUsuario('ops@triggerti.com');
        $ops->assignRole(PlatformRbac::ROLE);

        $this->loginOk($a->email);
        $this->loginOk($b->email);

        $this->loginOk($ops->email)->assertJsonPath('user.email', $ops->email);
    }

    public function test_inatividade_encerra_a_sessao_e_libera_o_assento(): void
    {
        $a = $this->criarUsuario('idle-a@test.local');
        $b = $this->criarUsuario('idle-b@test.local');
        $c = $this->criarUsuario('idle-c@test.local');

        $tokenA = $this->loginOk($a->email)->json('token');
        $this->loginOk($b->email);

        $this->withToken($tokenA)->getJson('/api/v1/auth/me')->assertOk();

        $this->travel(31)->minutes();

        $this->assertTokenRecusado($tokenA, 'SESSAO_INATIVA');

        $this->loginOk($c->email);
    }

    public function test_ping_renova_last_used_e_presenca_adianta_idle(): void
    {
        $user = $this->criarUsuario('ping-presenca@test.local');
        $token = $this->loginOk($user->email)->json('token');

        $this->withToken($token)
            ->postJson('/api/v1/auth/ping')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('sessao.idle_minutes', 30)
            ->assertJsonPath('sessao.max_usuarios_simultaneos', 2);

        $this->travel(25)->minutes();
        $this->withToken($token)->postJson('/api/v1/auth/ping')->assertOk();

        $this->travel(25)->minutes();
        $this->withToken($token)->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('sessao.idle_minutes', 30);
    }

    public function test_admin_libera_sessao_orfa(): void
    {
        [$admin, $alvo] = $this->criarAdminEAlvo('admin-sessao@test.local', 'alvo@test.local');

        $tokenAlvo = $this->loginOk($alvo->email)->json('token');
        $adminToken = $this->loginOk($admin->email)->json('token');

        $this->withToken($adminToken)
            ->postJson('/api/v1/usuarios/'.$alvo->id.'/liberar-sessao')
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertTokenRecusado($tokenAlvo);

        $this->loginOk($alvo->email);
    }

    public function test_desativar_usuario_revoga_a_sessao(): void
    {
        [$admin, $alvo] = $this->criarAdminEAlvo('admin-revoga@test.local', 'revogado@test.local');

        $tokenAlvo = $this->loginOk($alvo->email)->json('token');
        $adminToken = $this->loginOk($admin->email)->json('token');

        $this->withToken($adminToken)
            ->patchJson('/api/v1/usuarios/'.$alvo->id.'/deactivate')
            ->assertOk();

        $this->assertSame(0, PersonalAccessToken::query()->where('tokenable_id', $alvo->id)->count());
        $this->assertTokenRecusado($tokenAlvo);
    }

    public function test_lista_de_usuarios_indica_sessao_ativa(): void
    {
        $admin = $this->criarUsuario('admin-lista@test.local');
        $admin->givePermissionTo('usuarios.gerir');
        $admin->assignRole('ADMIN');

        $token = $this->loginOk($admin->email)->json('token');

        $res = $this->withToken($token)->getJson('/api/v1/usuarios')->assertOk();
        $row = collect($res->json('data'))->firstWhere('email', $admin->email);
        $this->assertNotNull($row);
        $this->assertTrue((bool) $row['sessao_ativa']);
    }

    private function assertTokenRecusado(string $token, ?string $codigo = null): void
    {
        // RequestGuard do Sanctum cacheia o user no processo do teste.
        auth()->forgetGuards();

        $res = $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
        if ($codigo !== null) {
            $res->assertJsonPath('code', $codigo);
        }
    }

    /**
     * @return \Illuminate\Testing\TestResponse
     */
    private function loginOk(string $email)
    {
        return $this->postJson('/api/v1/auth/login', [
            'email' => $email,
            'password' => 'SenhaForte1',
        ])->assertOk();
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function criarAdminEAlvo(string $adminEmail, string $alvoEmail): array
    {
        $emp = Empresa::query()->create([
            'codigo' => 'EMP-'.substr(sha1($adminEmail), 0, 5),
            'cnpj' => str_pad((string) (abs(crc32($adminEmail)) % 90_000_000_000_000 + 10_000_000_000_000), 14, '0', STR_PAD_LEFT),
            'razao_social' => 'Empresa Sessao',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $admin = $this->criarUsuario($adminEmail);
        $admin->givePermissionTo('usuarios.gerir');
        $admin->assignRole('ADMIN');
        $admin->empresas()->attach($emp->id, ['padrao' => true]);
        $admin->empresa_default_id = $emp->id;
        $admin->save();

        $alvo = $this->criarUsuario($alvoEmail);
        $alvo->empresas()->attach($emp->id, ['padrao' => true]);
        $alvo->empresa_default_id = $emp->id;
        $alvo->save();

        return [$admin, $alvo];
    }

    private function criarUsuario(string $email): User
    {
        return User::query()->create([
            'codigo' => 'USR-'.substr(sha1($email), 0, 5),
            'name' => 'User '.$email,
            'email' => $email,
            'password' => 'SenhaForte1',
            'ativo' => true,
        ]);
    }
}
