<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\OrcCatalogoPapel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\Concerns\FakesConsultaExterna;
use Tests\TestCase;

class EmpresaOnboardingTest extends TestCase
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

    public function test_alta_publica_de_conta_recusada_quando_flag_desligada(): void
    {
        config(['erp.flexorc.public_conta_registration' => false]);

        $this->postJson('/api/v1/auth/registrar-conta', [
            'admin_name' => 'Ana Admin',
            'admin_email' => 'ana@bloqueada.test',
            'admin_password' => 'SenhaForte1',
        ])->assertForbidden();

        $this->postJson('/api/v1/auth/registrar-empresa', [
            'cnpj' => '34661762000150',
            'razao_social' => 'GRAFICA BLOQUEADA LTDA',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'admin_name' => 'Ana Admin',
            'admin_email' => 'ana@bloqueada.test',
            'admin_password' => 'SenhaForte1',
        ])->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'ana@bloqueada.test']);
    }

    public function test_empresa_se_cadastra_isolada_com_catalogo_proprio(): void
    {
        $res = $this->postJson('/api/v1/auth/registrar-empresa', [
            'cnpj' => '34661762000150',
            'razao_social' => 'GRAFICA EXEMPLO LTDA',
            'nome_fantasia' => 'Grafica Exemplo',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400000',
            'admin_name' => 'Ana Admin',
            'admin_email' => 'ana@grafica-exemplo.com.br',
            'admin_password' => 'SenhaForte1',
        ])->assertCreated();

        $token = $res->json('token');
        $this->assertNotEmpty($token);
        $empresaId = (int) $res->json('empresa.id');
        $this->assertDatabaseHas('empresas', [
            'id' => $empresaId,
            'cnpj' => '34661762000150',
        ]);
        $this->assertDatabaseHas('users', ['email' => 'ana@grafica-exemplo.com.br']);
        $this->assertGreaterThan(0, OrcCatalogoPapel::query()->where('empresa_id', $empresaId)->count());
        $this->assertGreaterThan(0, \App\Models\BemPatrimonial::query()->where('empresa_id', $empresaId)->count());
        $this->assertSame(
            count(\App\Models\Departamento::CANONICOS),
            \App\Models\Departamento::query()->where('empresa_id', $empresaId)->count(),
        );

        $this->postJson('/api/v1/auth/registrar-empresa', [
            'cnpj' => '34661762000150',
            'razao_social' => 'Outra',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'admin_name' => 'B',
            'admin_email' => 'b@x.com',
            'admin_password' => 'SenhaForte1',
        ])->assertStatus(422);

        $outra = $this->postJson('/api/v1/auth/registrar-empresa', [
            'cnpj' => '03514129000106',
            'razao_social' => 'SEGUNDA EMPRESA LTDA',
            'municipio' => 'Curitiba',
            'uf' => 'PR',
            'admin_name' => 'Bruno',
            'admin_email' => 'bruno@segunda.com.br',
            'admin_password' => 'SenhaForte1',
        ])->assertCreated();

        $empA = Empresa::query()->findOrFail($empresaId);
        $empB = Empresa::query()->findOrFail((int) $outra->json('empresa.id'));
        $this->assertNotSame($empA->id, $empB->id);

        $userA = User::query()->where('email', 'ana@grafica-exemplo.com.br')->firstOrFail();
        $this->assertTrue($userA->hasEmpresaAccess($empA->id));
        $this->assertFalse($userA->hasEmpresaAccess($empB->id));

        $this->assertDatabaseHas('empresa_ativacoes', [
            'empresa_id' => $empresaId,
            'billing_status' => 'PENDENTE',
        ]);
        $this->assertSame(0, \App\Models\Parceiro::query()
            ->where('empresa_id', $empresaId)
            ->where(function ($q) {
                $q->where('papel_cliente', true)->orWhere('is_prospect', true);
            })
            ->count());
    }

    public function test_alta_separa_conta_empresa_e_pagamento_pulavel(): void
    {
        $conta = $this->postJson('/api/v1/auth/registrar-conta', [
            'admin_name' => 'Carla Conta',
            'admin_email' => 'carla@grafica-ramificada.com.br',
            'admin_password' => 'SenhaForte1',
        ])->assertCreated();

        $token = (string) $conta->json('token');
        $codigo = (string) $conta->json('user.codigo');
        $this->assertNotEmpty($token);
        $this->assertMatchesRegularExpression('/^USR-/', $codigo);
        $this->assertDatabaseHas('users', ['email' => 'carla@grafica-ramificada.com.br']);
        $this->assertSame(0, (int) \Illuminate\Support\Facades\DB::table('empresa_user')
            ->where('user_id', $conta->json('user.id'))
            ->count());
        $this->assertDatabaseHas('conta_ativacoes', [
            'user_id' => $conta->json('user.id'),
            'billing_status' => 'PENDENTE',
        ]);

        $meSemEmp = $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();
        $this->assertSame([], $meSemEmp->json('empresas'));
        $this->assertNull($meSemEmp->json('empresa_contexto'));
        $this->assertContains('ADMIN', $meSemEmp->json('roles'));
        $this->assertSame(3, (int) $meSemEmp->json('conta_flexorc.max_empresas'));

        $atConta = $this->withToken($token)->getJson('/api/v1/ativacao')->assertOk();
        $this->assertTrue($atConta->json('data.pagamento_pendente'));
        $this->assertSame('PENDENTE', $atConta->json('data.billing_status'));
        $this->assertSame($codigo, $atConta->json('data.conta.pagador.codigo'));

        $this->withToken($token)->postJson('/api/v1/ativacao/pagamento/confirmar-demo')->assertOk()
            ->assertJsonPath('data.conta.paga', true);

        $emp = $this->withToken($token)->postJson('/api/v1/auth/abrir-empresa', [
            'cnpj' => '03514129000106',
            'razao_social' => 'GRAFICA RAMIFICADA LTDA',
            'municipio' => 'Curitiba',
            'uf' => 'PR',
        ])->assertCreated();

        $empresaId = (int) $emp->json('empresa.id');
        $this->assertDatabaseHas('empresas', ['id' => $empresaId, 'cnpj' => '03514129000106']);

        $headers = [
            'Authorization' => 'Bearer '.$token,
            'X-Empresa-Id' => (string) $empresaId,
        ];
        $at = $this->withHeaders($headers)->getJson('/api/v1/ativacao')->assertOk();
        $this->assertFalse($at->json('data.pronta'));
        $this->assertFalse($at->json('data.pagamento_pendente'));
        $this->assertTrue($at->json('data.certificado_a1_pendente'));
        $this->assertFalse($at->json('data.pode_enviar_orcamento'));
        $this->assertSame('certificado_a1', $at->json('data.proximo'));
        $this->assertSame($codigo, $at->json('data.conta.pagador.codigo'));
        $this->assertSame('Carla Conta', $at->json('data.conta.pagador.razao_social'));
        $this->assertSame('Em dia', $at->json('data.conta.status_label'));

        $this->flushHeaders();

        $loginOcupado = $this->postJson('/api/v1/auth/login', [
            'email' => 'carla@grafica-ramificada.com.br',
            'conta' => $codigo,
            'password' => 'SenhaForte1',
        ])->assertStatus(409);
        $this->assertSame('SESSAO_OCUPADA', $loginOcupado->json('code'));

        $login = $this->postJson('/api/v1/auth/login', [
            'conta' => $codigo,
            'password' => 'SenhaForte1',
            'encerrar_sessao_anterior' => true,
        ])->assertOk();
        $this->assertSame($codigo, $login->json('user.codigo'));
        $this->assertNotEmpty($login->json('empresas.0.codigo'));
        $this->assertSame($empresaId, (int) $login->json('empresas.0.id'));

        $this->postJson('/api/v1/auth/login', [
            'email' => 'carla@grafica-ramificada.com.br',
            'conta' => 'USR-NAOEXISTE',
            'password' => 'SenhaForte1',
        ])->assertStatus(422);
    }

    public function test_master_abre_ate_tres_empresas_nesta_conta(): void
    {
        $conta = $this->postJson('/api/v1/auth/registrar-conta', [
            'admin_name' => 'Master Tres',
            'admin_email' => 'master.tres@grafica.test',
            'admin_password' => 'SenhaForte1',
        ])->assertCreated();
        $token = (string) $conta->json('token');

        $cnpjs = ['03514129000106', '34661762000150', '00000000000191'];
        foreach ($cnpjs as $i => $cnpj) {
            $this->withToken($token)->postJson('/api/v1/auth/abrir-empresa', [
                'cnpj' => $cnpj,
                'razao_social' => 'EMPRESA '.($i + 1),
                'municipio' => 'Uberlandia',
                'uf' => 'MG',
            ])->assertCreated();
        }

        $this->withToken($token)->postJson('/api/v1/auth/abrir-empresa', [
            'cnpj' => '11111111111111',
            'razao_social' => 'EMPRESA 4',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
        ])->assertStatus(422)->assertJsonValidationErrors(['empresa']);
    }

    public function test_cnpj_do_demo_nao_pode_ser_reusado_e_explica(): void
    {
        Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'cnpj' => '01423183000110',
            'razao_social' => 'RLP ETIQUETAS AUTO ADESIVOS LTDA',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'situacao' => 'ATIVA',
        ]);

        $conta = $this->postJson('/api/v1/auth/registrar-conta', [
            'admin_name' => 'Nova',
            'admin_email' => 'nova@teste.com.br',
            'admin_password' => 'SenhaForte1',
        ])->assertCreated();

        $this->withToken((string) $conta->json('token'))
            ->postJson('/api/v1/auth/abrir-empresa', [
                'cnpj' => '01423183000110',
                'razao_social' => 'Tentativa',
                'municipio' => 'Uberlandia',
                'uf' => 'MG',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['cnpj'])
            ->assertJsonFragment(['cnpj' => ['Este CNPJ já é o demo EMP-00001 (RLP ETIQUETAS AUTO ADESIVOS LTDA). Use outro CNPJ para abrir uma empresa nova.']]);
    }

    public function test_alta_geocodifica_planta_pela_rua_nao_pelo_cep(): void
    {
        $this->fakeConsultaExterna([
            'nominatim.openstreetmap.org/*' => Http::response([
                [
                    'lat' => '-18.9100000',
                    'lon' => '-48.2600000',
                    'display_name' => 'Avenida João Naves de Ávila, Uberlândia, MG',
                ],
            ], 200),
            'brasilapi.com.br/api/cep/v2/*' => Http::response('nao-devia', 599),
            'brasilapi.com.br/api/cnpj/v1/*' => Http::response('nao-devia', 599),
            'viacep.com.br/*' => Http::response(['erro' => true], 200),
            'opencep.com/*' => Http::response(['message' => 'indisponivel'], 503),
        ]);

        $conta = $this->postJson('/api/v1/auth/registrar-conta', [
            'admin_name' => 'Geo Rua',
            'admin_email' => 'geo.rua@grafica.test',
            'admin_password' => 'SenhaForte1',
        ])->assertCreated();

        $emp = $this->withToken((string) $conta->json('token'))->postJson('/api/v1/auth/abrir-empresa', [
            'cnpj' => '03514129000106',
            'razao_social' => 'GRAFICA GEO LTDA',
            'logradouro' => 'Avenida Joao Naves de Avila',
            'numero' => '100',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400370',
        ])->assertCreated();

        $empresa = Empresa::query()->findOrFail((int) $emp->json('empresa.id'));
        $this->assertSame('-18.9100000', (string) $empresa->origem_latitude);
        $this->assertSame('-48.2600000', (string) $empresa->origem_longitude);
        $this->assertSame(1, $this->countUrl('nominatim.openstreetmap.org'));
        $this->assertSame(0, $this->countUrl('brasilapi.com.br/api/cep/v2'));
        $this->assertSame(0, $this->countUrl('brasilapi.com.br/api/cnpj/v1'));
    }

    public function test_alta_sem_rua_usa_cep_v2_e_nao_bloqueia_se_geo_cair(): void
    {
        $this->fakeConsultaExterna([
            'nominatim.openstreetmap.org/*' => Http::response([], 200),
            'brasilapi.com.br/api/cep/v2/*' => Http::response([
                'cep' => '38400328',
                'service' => 'openstreetmap',
                'location' => [
                    'type' => 'Point',
                    'coordinates' => [
                        'longitude' => '-48.2772',
                        'latitude' => '-18.9186',
                    ],
                ],
            ], 200),
            'brasilapi.com.br/*' => Http::response(['message' => 'indisponivel'], 503),
            'viacep.com.br/*' => Http::response(['erro' => true], 200),
            'opencep.com/*' => Http::response(['message' => 'indisponivel'], 503),
        ]);

        $conta = $this->postJson('/api/v1/auth/registrar-conta', [
            'admin_name' => 'Geo Cep',
            'admin_email' => 'geo.cep@grafica.test',
            'admin_password' => 'SenhaForte1',
        ])->assertCreated();

        $comCep = $this->withToken((string) $conta->json('token'))->postJson('/api/v1/auth/abrir-empresa', [
            'cnpj' => '03514129000106',
            'razao_social' => 'GRAFICA CEP LTDA',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400328',
        ])->assertCreated();

        $empCep = Empresa::query()->findOrFail((int) $comCep->json('empresa.id'));
        $this->assertSame('-18.9186000', (string) $empCep->origem_latitude);
        $this->assertSame('-48.2772000', (string) $empCep->origem_longitude);

        $this->fakeConsultaExternaIndisponivel();

        $semGeo = $this->withToken((string) $conta->json('token'))->postJson('/api/v1/auth/abrir-empresa', [
            'cnpj' => '34661762000150',
            'razao_social' => 'GRAFICA SEM GEO LTDA',
            'municipio' => 'Uberlandia',
            'uf' => 'MG',
            'cep' => '38400000',
        ])->assertCreated();

        $empSem = Empresa::query()->findOrFail((int) $semGeo->json('empresa.id'));
        $this->assertNull($empSem->origem_latitude);
        $this->assertNull($empSem->origem_longitude);
    }

    private function countUrl(string $needle): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), $needle))
            ->count();
    }
}
