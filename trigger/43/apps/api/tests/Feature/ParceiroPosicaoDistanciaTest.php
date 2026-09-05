<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ParceiroPosicaoDistanciaTest extends TestCase
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
            'razao_social' => 'Empresa Geo Lista',
            'nome_fantasia' => 'Geo',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
            'origem_latitude' => '-18.9219000',
            'origem_longitude' => '-48.2943000',
            'cep' => '38400328',
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-GEO1',
            'name' => 'Operador Geo',
            'email' => 'geo-lista@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['parceiro.ler', 'parceiro.escrever']);
        $this->user->empresas()->attach($this->empresa->id);

        Sanctum::actingAs($this->user);
        config(['erp.ors.key' => 'test-ors-key']);
    }

    public function test_lista_grava_posicao_e_km_da_emp(): void
    {
        $this->fakeApis();

        $par = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-GEO1',
            'razao_social' => 'Cliente Sem Km',
            'tipo_pessoa' => 'PJ',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'logradouro' => 'Avenida João Naves de Ávila',
            'numero' => '100',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'cep' => '38400370',
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros/'.$par->id.'/posicao-distancia')
            ->assertOk()
            ->assertJsonPath('data.latitude', '-18.9100000')
            ->assertJsonPath('data.longitude', '-48.2600000')
            ->assertJsonPath('data.distancia_km', '2.400')
            ->assertJsonPath('data.distancia_fonte', 'openrouteservice')
            ->assertJsonPath('data.distancia_empresa_id', $this->empresa->id)
            ->assertJsonMissingPath('distancia_erro');

        $par->refresh();
        $this->assertSame('-18.9100000', (string) $par->latitude);
        $this->assertSame('2.400', (string) $par->distancia_km);
        $this->assertSame($this->empresa->id, $par->distancia_empresa_id);
        $this->assertSame(1, $this->countNominatim());
        $this->assertSame(1, $this->countOrs());
    }

    public function test_sem_endereco_retorna_422(): void
    {
        $this->fakeApis();

        $par = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-GEO2',
            'razao_social' => 'Prospect Sem Endereco',
            'tipo_pessoa' => 'PJ',
            'papel_cliente' => true,
            'is_prospect' => true,
            'situacao' => 'ATIVO',
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros/'.$par->id.'/posicao-distancia')
            ->assertStatus(422);

        $this->assertSame(0, $this->countNominatim());
        $this->assertSame(0, $this->countOrs());
    }

    public function test_sem_origem_grava_ponto_e_sinaliza_erro(): void
    {
        $this->empresa->update([
            'origem_latitude' => null,
            'origem_longitude' => null,
        ]);
        $this->fakeApis();

        $par = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-GEO3',
            'razao_social' => 'Cliente Sem Origem Emp',
            'tipo_pessoa' => 'PJ',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'logradouro' => 'Avenida João Naves de Ávila',
            'numero' => '100',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'cep' => '38400370',
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros/'.$par->id.'/posicao-distancia')
            ->assertOk()
            ->assertJsonPath('data.latitude', '-18.9100000')
            ->assertJsonPath('data.distancia_km', null)
            ->assertJsonPath('distancia_erro', 'sem_origem');

        $this->assertSame(0, $this->countOrs());
    }

    public function test_somente_leitura_nao_pode_atualizar(): void
    {
        $reader = User::query()->create([
            'codigo' => 'USR-GEO-R',
            'name' => 'Leitor',
            'email' => 'geo-read@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $reader->givePermissionTo(['parceiro.ler']);
        $reader->empresas()->attach($this->empresa->id);
        Sanctum::actingAs($reader);

        $par = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-GEO4',
            'razao_social' => 'Cliente',
            'tipo_pessoa' => 'PJ',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'cep' => '38400370',
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->postJson('/api/v1/parceiros/'.$par->id.'/posicao-distancia')
            ->assertForbidden();
    }

    private function fakeApis(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/*' => Http::response([
                [
                    'lat' => '-18.9100000',
                    'lon' => '-48.2600000',
                    'display_name' => 'Avenida João Naves de Ávila, Uberlândia, MG',
                ],
            ], 200),
            'brasilapi.com.br/api/cep/v2/*' => Http::response([
                'cep' => '38400370',
                'state' => 'MG',
                'city' => 'Uberlândia',
                'location' => [
                    'type' => 'Point',
                    'coordinates' => [
                        'longitude' => '-48.2772',
                        'latitude' => '-18.9186',
                    ],
                ],
            ], 200),
            'api.openrouteservice.org/*' => Http::response([
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
            ], 200),
            'routing.openstreetmap.de/*' => Http::response([
                'code' => 'Ok',
                'routes' => [['distance' => 2400, 'duration' => 400]],
            ], 200),
            '*' => Http::response('unexpected', 599),
        ]);
    }

    private function countOrs(): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), 'openrouteservice.org'))
            ->count();
    }

    private function countNominatim(): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), 'nominatim.openstreetmap.org'))
            ->count();
    }
}
