<?php

namespace Tests\Feature;

use App\Models\ApiCache;
use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ConsultaCepGeoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['parceiro.ler', 'parceiro.escrever'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-GEO1',
            'razao_social' => 'Empresa Geo',
            'nome_fantasia' => 'Geo',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-GEO1',
            'name' => 'Operador Geo',
            'email' => 'geo@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['parceiro.ler', 'parceiro.escrever']);
        $this->user->empresas()->attach($this->empresa->id);

        Sanctum::actingAs($this->user);
    }

    public function test_consulta_cep_sem_geo_nao_chama_brasilapi_nem_expõe_lat_lng(): void
    {
        $this->fakeApis(viaCep: $this->viaCepUberlandia(), brasilApi: $this->brasilApiUberlandia());

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328')
            ->assertOk()
            ->assertJsonPath('data.logradouro', 'Avenida João Naves de Ávila')
            ->assertJsonPath('data.ibge', '3170206')
            ->assertJsonMissingPath('data.latitude')
            ->assertJsonMissingPath('data.longitude');

        $this->assertSame(0, $this->countBrasilApiCepV2());
        $this->assertSame(1, $this->countViaCep());
    }

    public function test_consulta_cep_geo_enriquece_lat_lng_sem_trocar_viacep(): void
    {
        $this->fakeApis(viaCep: $this->viaCepUberlandia(), brasilApi: $this->brasilApiUberlandia());

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400-328?geo=1')
            ->assertOk()
            ->assertJsonPath('data.logradouro', 'Avenida João Naves de Ávila')
            ->assertJsonPath('data.ibge', '3170206')
            ->assertJsonPath('data.latitude', '-18.9186000')
            ->assertJsonPath('data.longitude', '-48.2772000')
            ->assertJsonPath('data.geo_fonte', 'brasilapi_cep_v2')
            ->assertJsonPath('data.geo_cache', false);

        $this->assertSame(1, $this->countBrasilApiCepV2());
    }

    public function test_segunda_consulta_geo_no_ttl_e_hit_de_cache(): void
    {
        $this->fakeApis(viaCep: $this->viaCepUberlandia(), brasilApi: $this->brasilApiUberlandia());

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1')
            ->assertOk()
            ->assertJsonPath('data.geo_cache', false);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1')
            ->assertOk()
            ->assertJsonPath('data.latitude', '-18.9186000')
            ->assertJsonPath('data.geo_cache', true);

        $this->assertSame(1, $this->countBrasilApiCepV2());
        $this->assertNotNull(ApiCache::query()->where('chave', 'cep_geo:38400328')->first());
    }

    public function test_cep_sem_ponto_devolve_lat_lng_vazios_e_nao_trava_save(): void
    {
        $this->fakeApis(viaCep: $this->viaCepUberlandia(), brasilApi: [
            'cep' => '38400328',
            'state' => 'MG',
            'city' => 'Uberlândia',
            'location' => [
                'type' => 'Point',
                'coordinates' => [],
            ],
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1')
            ->assertOk()
            ->assertJsonPath('data.latitude', null)
            ->assertJsonPath('data.longitude', null)
            ->assertJsonPath('data.geo_sem_ponto', true)
            ->assertJsonPath('data.logradouro', 'Avenida João Naves de Ávila');

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Cliente Sem Ponto',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'cep' => '38400328',
                'logradouro' => 'Avenida João Naves de Ávila',
                'municipio' => 'Uberlândia',
                'uf' => 'MG',
            ])
            ->assertCreated()
            ->assertJsonPath('data.latitude', null)
            ->assertJsonPath('data.longitude', null);
    }

    public function test_falha_brasilapi_nao_derruba_viacep_nem_bloqueia_save(): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response($this->viaCepUberlandia(), 200),
            'brasilapi.com.br/*' => Http::response(['message' => 'timeout'], 503),
            '*' => Http::response('unexpected', 599),
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1')
            ->assertOk()
            ->assertJsonPath('data.logradouro', 'Avenida João Naves de Ávila')
            ->assertJsonPath('data.latitude', null)
            ->assertJsonPath('data.longitude', null)
            ->assertJsonPath('data.geo_erro', 'indisponivel');

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Cliente API Fora',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'cep' => '38400328',
                'municipio' => 'Uberlândia',
                'uf' => 'MG',
            ])
            ->assertCreated();
    }

    public function test_grava_lat_lng_no_parceiro_e_na_entrega(): void
    {
        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Cliente Com Posição',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'cep' => '38400328',
                'ibge' => '3170206',
                'municipio' => 'Uberlândia',
                'uf' => 'MG',
                'latitude' => '-18.9186',
                'longitude' => '-48.2772',
                'enderecos_entrega' => [
                    [
                        'apelido' => 'CD',
                        'logradouro' => 'Av Paulista',
                        'numero' => '1000',
                        'bairro' => 'Bela Vista',
                        'municipio' => 'São Paulo',
                        'uf' => 'SP',
                        'cep' => '01310100',
                        'latitude' => '-23.5700000',
                        'longitude' => '-46.6450000',
                        'responsavel_nome' => 'Maria',
                        'principal' => true,
                    ],
                ],
            ])
            ->assertCreated();

        $this->assertSame('-18.9186000', $res->json('data.latitude'));
        $this->assertSame('-48.2772000', $res->json('data.longitude'));
        $this->assertSame('-23.5700000', $res->json('data.enderecos_entrega.0.latitude'));
        $this->assertSame('-46.6450000', $res->json('data.enderecos_entrega.0.longitude'));
    }

    public function test_emp_b_nao_ve_lat_lng_do_parceiro_da_emp_a(): void
    {
        Permission::findOrCreate('parceiro.ler', 'web');
        Permission::findOrCreate('parceiro.escrever', 'web');

        $empB = Empresa::query()->create([
            'codigo' => 'EMP-GEO2',
            'razao_social' => 'Empresa Geo B',
            'nome_fantasia' => 'Geo B',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $parA = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Só EMP A',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'latitude' => '-18.9186',
                'longitude' => '-48.2772',
            ])
            ->assertCreated()
            ->json('data');

        $soB = User::query()->create([
            'codigo' => 'USR-GEO2',
            'name' => 'Só EMP B',
            'email' => 'geo.b@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empB->id,
        ]);
        $soB->givePermissionTo(['parceiro.ler', 'parceiro.escrever']);
        $soB->empresas()->attach($empB->id);

        Sanctum::actingAs($soB);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/parceiros/'.$parA['id'])
            ->assertForbidden();

        $this->withHeader('X-Empresa-Id', (string) $empB->id)
            ->getJson('/api/v1/parceiros/'.$parA['id'])
            ->assertNotFound();

        $lista = $this->withHeader('X-Empresa-Id', (string) $empB->id)
            ->getJson('/api/v1/parceiros')
            ->assertOk()
            ->json('data');

        $this->assertSame([], $lista);
        $this->assertSame(1, Parceiro::query()->where('empresa_id', $this->empresa->id)->count());
        $this->assertSame(0, Parceiro::query()->where('empresa_id', $empB->id)->count());
    }

    /**
     * @param  array<string, mixed>  $viaCep
     * @param  array<string, mixed>  $brasilApi
     */
    private function fakeApis(array $viaCep, array $brasilApi): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response($viaCep, 200),
            'brasilapi.com.br/api/cep/v2/*' => Http::response($brasilApi, 200),
            '*' => Http::response('unexpected', 599),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function viaCepUberlandia(): array
    {
        return [
            'cep' => '38400-328',
            'logradouro' => 'Avenida João Naves de Ávila',
            'complemento' => '',
            'bairro' => 'Santa Mônica',
            'localidade' => 'Uberlândia',
            'uf' => 'MG',
            'ibge' => '3170206',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function brasilApiUberlandia(): array
    {
        return [
            'cep' => '38400328',
            'state' => 'MG',
            'city' => 'Uberlândia',
            'neighborhood' => 'Santa Mônica',
            'street' => 'Avenida João Naves de Ávila',
            'service' => 'openstreetmap',
            'location' => [
                'type' => 'Point',
                'coordinates' => [
                    'longitude' => '-48.2772',
                    'latitude' => '-18.9186',
                ],
            ],
        ];
    }

    private function countBrasilApiCepV2(): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), 'cep/v2'))
            ->count();
    }

    private function countViaCep(): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), 'viacep.com.br'))
            ->count();
    }
}
