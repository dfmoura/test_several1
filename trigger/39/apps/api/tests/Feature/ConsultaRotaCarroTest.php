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

class ConsultaRotaCarroTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['parceiro.ler', 'parceiro.escrever', 'empresas.gerir'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-ROT1',
            'razao_social' => 'Empresa Rota',
            'nome_fantasia' => 'Rota',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
            'origem_latitude' => '-18.9219000',
            'origem_longitude' => '-48.2943000',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-ROT1',
            'name' => 'Operador Rota',
            'email' => 'rota@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['parceiro.ler', 'parceiro.escrever', 'empresas.gerir']);
        $this->user->empresas()->attach($this->empresa->id);

        Sanctum::actingAs($this->user);
    }

    public function test_geo_sem_rota_nao_chama_ors(): void
    {
        $this->fakeApis();

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1')
            ->assertOk()
            ->assertJsonPath('data.latitude', '-18.9186000')
            ->assertJsonMissingPath('data.distancia_km');

        $this->assertSame(0, $this->countOrs());
        $this->assertSame(1, $this->countBrasilApiCepV2());
    }

    public function test_sem_origem_a_preenche_b_e_nao_chama_ors(): void
    {
        $this->empresa->update([
            'origem_latitude' => null,
            'origem_longitude' => null,
        ]);
        $this->fakeApis();

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1&rota=1')
            ->assertOk()
            ->assertJsonPath('data.latitude', '-18.9186000')
            ->assertJsonPath('data.longitude', '-48.2772000')
            ->assertJsonPath('data.distancia_km', null)
            ->assertJsonPath('data.distancia_erro', 'sem_origem')
            ->assertJsonPath('data.distancia_atribuicao', 'OpenStreetMap');

        $this->assertSame(0, $this->countOrs());
    }

    public function test_sem_ponto_b_nao_chama_ors(): void
    {
        $this->fakeApis(brasilApi: [
            'cep' => '38400328',
            'state' => 'MG',
            'city' => 'Uberlândia',
            'location' => ['type' => 'Point', 'coordinates' => []],
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1&rota=1')
            ->assertOk()
            ->assertJsonPath('data.latitude', null)
            ->assertJsonPath('data.geo_sem_ponto', true)
            ->assertJsonPath('data.distancia_km', null)
            ->assertJsonPath('data.distancia_erro', 'sem_ponto');

        $this->assertSame(0, $this->countOrs());
    }

    public function test_rota_ok_grava_km_com_emp_e_atribuicao_osm(): void
    {
        $this->fakeApis();

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1&rota=1')
            ->assertOk()
            ->assertJsonPath('data.latitude', '-18.9186000')
            ->assertJsonPath('data.distancia_km', '2.400')
            ->assertJsonPath('data.distancia_fonte', 'openrouteservice')
            ->assertJsonPath('data.distancia_cache', false)
            ->assertJsonPath('data.distancia_atribuicao', 'OpenStreetMap');

        $this->assertSame(1, $this->countOrs());
        $this->assertTrue(
            collect(Http::recorded())->contains(
                fn (array $pair) => str_contains($pair[0]->url(), 'api.openrouteservice.org')
                    && ! str_contains($pair[0]->url(), 'project-osrm.org')
            )
        );

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Cliente Com Km',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'cep' => '38400328',
                'municipio' => 'Uberlândia',
                'uf' => 'MG',
                'latitude' => '-18.9186',
                'longitude' => '-48.2772',
                'distancia_km' => '2.400',
                'distancia_fonte' => 'openrouteservice',
                'distancia_empresa_id' => 999999,
            ])
            ->assertCreated();

        $this->assertSame('2.400', $res->json('data.distancia_km'));
        $this->assertSame('openrouteservice', $res->json('data.distancia_fonte'));
        $this->assertSame($this->empresa->id, $res->json('data.distancia_empresa_id'));
        $this->assertNotNull($res->json('data.distancia_calculada_em'));
    }

    public function test_segunda_rota_no_ttl_e_hit_de_cache(): void
    {
        $this->fakeApis();

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1&rota=1')
            ->assertOk()
            ->assertJsonPath('data.distancia_cache', false);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1&rota=1')
            ->assertOk()
            ->assertJsonPath('data.distancia_km', '2.400')
            ->assertJsonPath('data.distancia_cache', true);

        $this->assertSame(1, $this->countOrs());
        $this->assertNotNull(
            ApiCache::query()->where('chave', 'like', 'ors_drive:%')->first()
        );
    }

    public function test_http_429_mantem_lat_lng_e_km_vazio_sem_retry(): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response($this->viaCepUberlandia(), 200),
            'brasilapi.com.br/api/cep/v2/*' => Http::response($this->brasilApiUberlandia(), 200),
            'api.openrouteservice.org/*' => Http::response(['error' => 'Rate limit exceeded'], 429),
            '*' => Http::response('unexpected', 599),
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1&rota=1')
            ->assertOk()
            ->assertJsonPath('data.latitude', '-18.9186000')
            ->assertJsonPath('data.longitude', '-48.2772000')
            ->assertJsonPath('data.distancia_km', null)
            ->assertJsonPath('data.distancia_erro', 'cota');

        $this->assertSame(1, $this->countOrs());
    }

    public function test_chave_ausente_nao_chama_ors(): void
    {
        config(['erp.ors.key' => '']);
        $this->fakeApis();

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328?geo=1&rota=1')
            ->assertOk()
            ->assertJsonPath('data.latitude', '-18.9186000')
            ->assertJsonPath('data.distancia_km', null)
            ->assertJsonPath('data.distancia_erro', 'chave_ausente');

        $this->assertSame(0, $this->countOrs());
    }

    public function test_emp_b_nao_herda_km_da_emp_a(): void
    {
        $empB = Empresa::query()->create([
            'codigo' => 'EMP-ROT2',
            'razao_social' => 'Empresa Rota B',
            'nome_fantasia' => 'Rota B',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
            'origem_latitude' => '-18.9100000',
            'origem_longitude' => '-48.2600000',
        ]);

        $parA = $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros', [
                'razao_social' => 'Só EMP A',
                'tipo_pessoa' => 'PJ',
                'papel_cliente' => true,
                'latitude' => '-18.9186',
                'longitude' => '-48.2772',
                'distancia_km' => '2.400',
                'distancia_fonte' => 'openrouteservice',
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame($this->empresa->id, $parA['distancia_empresa_id']);

        $soB = User::query()->create([
            'codigo' => 'USR-ROT2',
            'name' => 'Só EMP B',
            'email' => 'rota.b@test.local',
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
        $this->assertSame(
            0,
            Parceiro::query()->where('distancia_empresa_id', $empB->id)->count()
        );
    }

    public function test_grava_origem_operacional_na_emp(): void
    {
        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->putJson('/api/v1/empresas/'.$this->empresa->id, [
                'origem_latitude' => '-18.9219',
                'origem_longitude' => '-48.2943',
            ])
            ->assertOk()
            ->assertJsonPath('data.origem_latitude', '-18.9219000')
            ->assertJsonPath('data.origem_longitude', '-48.2943000');
    }

    public function test_origem_incompleta_e_rejeitada(): void
    {
        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->putJson('/api/v1/empresas/'.$this->empresa->id, [
                'origem_latitude' => '-18.9219',
                'origem_longitude' => null,
            ])
            ->assertStatus(422);
    }

    /**
     * @param  array<string, mixed>|null  $brasilApi
     */
    private function fakeApis(?array $brasilApi = null): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response($this->viaCepUberlandia(), 200),
            'brasilapi.com.br/api/cep/v2/*' => Http::response($brasilApi ?? $this->brasilApiUberlandia(), 200),
            'api.openrouteservice.org/*' => Http::response($this->orsDrivingCar(), 200),
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

    /**
     * @return array<string, mixed>
     */
    private function orsDrivingCar(): array
    {
        return [
            'type' => 'FeatureCollection',
            'features' => [
                [
                    'type' => 'Feature',
                    'properties' => [
                        'summary' => [
                            'distance' => 2400,
                            'duration' => 400,
                        ],
                    ],
                    'geometry' => [
                        'type' => 'LineString',
                        'coordinates' => [],
                    ],
                ],
            ],
        ];
    }

    private function countOrs(): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), 'openrouteservice.org'))
            ->count();
    }

    private function countBrasilApiCepV2(): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), 'cep/v2'))
            ->count();
    }
}
