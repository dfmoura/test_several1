<?php

namespace Tests\Feature;

use App\Models\ApiCache;
use App\Models\Empresa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ConsultaCepFallbackTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('parceiro.ler', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-CEP1',
            'razao_social' => 'Empresa CEP',
            'nome_fantasia' => 'CEP',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-CEP1',
            'name' => 'Operador CEP',
            'email' => 'cep@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['parceiro.ler']);
        $this->user->empresas()->attach($this->empresa->id);

        Sanctum::actingAs($this->user);
    }

    public function test_viacep_completo_nao_chama_fallback(): void
    {
        $this->fakeProviders(viaCep: $this->viaCepCompleto());

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328')
            ->assertOk()
            ->assertJsonPath('data.logradouro', 'Avenida João Naves de Ávila')
            ->assertJsonPath('data.bairro', 'Santa Mônica')
            ->assertJsonPath('data.ibge', '3170206')
            ->assertJsonPath('data.fonte', 'viacep')
            ->assertJsonMissingPath('data.latitude');

        $this->assertSame(1, $this->countViaCep());
        $this->assertSame(0, $this->countBrasilApiCepV1());
        $this->assertSame(0, $this->countOpenCep());
        $this->assertSame(0, $this->countBrasilApiCepV2());
        $this->assertTrue(
            collect(Http::recorded())->contains(
                fn (array $pair) => str_contains($pair[0]->url(), 'viacep.com.br/ws/38400328/json')
            )
        );
    }

    public function test_viacep_sem_rua_e_ibge_completa_com_fallbacks(): void
    {
        $this->fakeProviders(
            viaCep: $this->viaCepIncompleto(),
            brasilApi: $this->brasilApiCepV1(),
            openCep: $this->openCepCompleto(),
        );

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328')
            ->assertOk()
            ->assertJsonPath('data.logradouro', 'Avenida João Naves de Ávila')
            ->assertJsonPath('data.bairro', 'Santa Mônica')
            ->assertJsonPath('data.localidade', 'Uberlândia')
            ->assertJsonPath('data.uf', 'MG')
            ->assertJsonPath('data.ibge', '3170206')
            ->assertJsonPath('data.fonte', 'viacep+brasilapi_cep+opencep');

        $this->assertSame(1, $this->countViaCep());
        $this->assertSame(1, $this->countBrasilApiCepV1());
        $this->assertSame(1, $this->countOpenCep());
        $this->assertSame(0, $this->countBrasilApiCepV2());
    }

    public function test_viacep_fora_opencep_responde_no_contrato_nfe(): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response(['message' => 'timeout'], 503),
            'brasilapi.com.br/api/cep/v1/*' => Http::response(['message' => 'down'], 503),
            'opencep.com/*' => Http::response($this->openCepCompleto(), 200),
            '*' => Http::response('unexpected', 599),
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400-328')
            ->assertOk()
            ->assertJsonPath('data.logradouro', 'Avenida João Naves de Ávila')
            ->assertJsonPath('data.ibge', '3170206')
            ->assertJsonPath('data.fonte', 'opencep');

        $this->assertSame(2, $this->countViaCep());
    }

    public function test_todos_fora_devolve_indisponivel_sem_travar_contrato(): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response(['message' => 'timeout'], 503),
            'brasilapi.com.br/api/cep/v1/*' => Http::response(['message' => 'timeout'], 503),
            'opencep.com/*' => Http::response(['message' => 'timeout'], 503),
            '*' => Http::response('unexpected', 599),
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328')
            ->assertStatus(502)
            ->assertJsonPath('message', 'Consulta CEP indisponível.');
    }

    public function test_cep_inexistente_em_todos_devolve_422(): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response(['erro' => true], 200),
            'brasilapi.com.br/api/cep/v1/*' => Http::response(['message' => 'CEP não encontrado'], 404),
            'opencep.com/*' => Http::response(['message' => 'CEP não encontrado'], 404),
            '*' => Http::response('unexpected', 599),
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/00000000')
            ->assertStatus(422)
            ->assertJsonPath('message', 'CEP não encontrado.');
    }

    public function test_cache_completo_nao_reconsulta(): void
    {
        $this->fakeProviders(viaCep: $this->viaCepCompleto());

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328')
            ->assertOk();

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328')
            ->assertOk()
            ->assertJsonPath('data.ibge', '3170206');

        $this->assertSame(1, $this->countViaCep());
        $this->assertSame(0, $this->countOpenCep());
        $this->assertNotNull(ApiCache::query()->where('chave', 'cep:38400328')->first());
    }

    public function test_cache_legado_incompleto_reconsulta_uma_vez(): void
    {
        ApiCache::query()->create([
            'chave' => 'cep:38400328',
            'fonte' => 'viacep',
            'payload' => $this->viaCepIncompleto(),
            'expires_at' => now()->addDays(90),
        ]);

        $this->fakeProviders(
            viaCep: $this->viaCepIncompleto(),
            brasilApi: $this->brasilApiCepV1(),
            openCep: $this->openCepCompleto(),
        );

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328')
            ->assertOk()
            ->assertJsonPath('data.logradouro', 'Avenida João Naves de Ávila')
            ->assertJsonPath('data.ibge', '3170206');

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400328')
            ->assertOk()
            ->assertJsonPath('data.logradouro', 'Avenida João Naves de Ávila');

        $this->assertSame(0, $this->countViaCep());
        $this->assertSame(1, $this->countBrasilApiCepV1());
        $this->assertSame(1, $this->countOpenCep());
    }

    public function test_brasilapi_ibge_objeto_nao_quebra_e_preenche_codigo(): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response(['erro' => true], 200),
            'brasilapi.com.br/api/cep/v1/*' => Http::response([
                'cep' => '38500000',
                'state' => 'MG',
                'city' => 'Monte Carmelo',
                'neighborhood' => '',
                'street' => '',
                'service' => 'open-cep',
                'ibge' => [
                    'city' => '3143104',
                    'state' => '31',
                ],
            ], 200),
            'opencep.com/*' => Http::response(['message' => 'timeout'], 503),
            '*' => Http::response('unexpected', 599),
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38500000')
            ->assertOk()
            ->assertJsonPath('data.localidade', 'Monte Carmelo')
            ->assertJsonPath('data.uf', 'MG')
            ->assertJsonPath('data.ibge', '3143104')
            ->assertJsonPath('data.logradouro', '');
    }

    public function test_cnpj_sem_ibge_completa_com_viacep(): void
    {
        Http::fake([
            'brasilapi.com.br/api/cnpj/v1/*' => Http::response([
                'cnpj' => '33445566000199',
                'razao_social' => 'ACME LTDA',
                'logradouro' => 'Rua das Flores',
                'bairro' => 'Centro',
                'municipio' => 'Monte Carmelo',
                'uf' => 'MG',
                'cep' => '38500000',
                'codigo_municipio_ibge' => null,
            ], 200),
            'viacep.com.br/*' => Http::response([
                'cep' => '38500-000',
                'logradouro' => '',
                'bairro' => '',
                'localidade' => 'Monte Carmelo',
                'uf' => 'MG',
                'ibge' => '3143104',
            ], 200),
            'brasilapi.com.br/api/cep/v1/*' => Http::response([
                'cep' => '38500000',
                'state' => 'MG',
                'city' => 'Monte Carmelo',
                'street' => '',
                'neighborhood' => '',
                'ibge' => ['city' => '3143104', 'state' => '31'],
            ], 200),
            'opencep.com/*' => Http::response([
                'cep' => '38500-000',
                'localidade' => 'Monte Carmelo',
                'uf' => 'MG',
                'ibge' => '3143104',
            ], 200),
            '*' => Http::response('unexpected', 599),
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cnpj/33445566000199')
            ->assertOk()
            ->assertJsonPath('data.razao_social', 'ACME LTDA')
            ->assertJsonPath('data.logradouro', 'Rua das Flores')
            ->assertJsonPath('data.ibge', '3143104')
            ->assertJsonPath('data.codigo_municipio_ibge', '3143104');

        $this->assertGreaterThanOrEqual(1, $this->countViaCep());
        $this->assertTrue(
            collect(Http::recorded())->contains(
                fn (array $pair) => str_contains($pair[0]->url(), 'viacep.com.br/ws/38500000/json')
            )
        );
    }

    public function test_cnpj_completo_nao_consulta_cep(): void
    {
        Http::fake([
            'brasilapi.com.br/api/cnpj/v1/*' => Http::response([
                'cnpj' => '33445566000199',
                'razao_social' => 'ACME LTDA',
                'logradouro' => 'Rua A',
                'bairro' => 'Centro',
                'municipio' => 'Uberlândia',
                'uf' => 'MG',
                'cep' => '38400328',
                'codigo_municipio_ibge' => 3170206,
            ], 200),
            '*' => Http::response('unexpected', 599),
        ]);

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cnpj/33445566000199')
            ->assertOk()
            ->assertJsonPath('data.ibge', '3170206')
            ->assertJsonPath('data.logradouro', 'Rua A');

        $this->assertSame(0, $this->countViaCep());
    }

    public function test_cep_generico_nao_derruba_cadastro(): void
    {
        $this->fakeProviders(
            viaCep: [
                'cep' => '38400-000',
                'logradouro' => '',
                'bairro' => '',
                'localidade' => 'Uberlândia',
                'uf' => 'MG',
                'ibge' => '3170206',
            ],
            brasilApi: [
                'cep' => '38400000',
                'state' => 'MG',
                'city' => 'Uberlândia',
                'neighborhood' => '',
                'street' => '',
            ],
            openCep: [
                'cep' => '38400-000',
                'logradouro' => '',
                'bairro' => '',
                'localidade' => 'Uberlândia',
                'uf' => 'MG',
                'ibge' => '3170206',
            ],
        );

        $this->withHeader('X-Empresa-Id', (string) $this->empresa->id)
            ->getJson('/api/v1/consulta/cep/38400000')
            ->assertOk()
            ->assertJsonPath('data.localidade', 'Uberlândia')
            ->assertJsonPath('data.uf', 'MG')
            ->assertJsonPath('data.ibge', '3170206')
            ->assertJsonPath('data.logradouro', '');
    }

    /**
     * @param  array<string, mixed>  $viaCep
     * @param  array<string, mixed>|null  $brasilApi
     * @param  array<string, mixed>|null  $openCep
     */
    private function fakeProviders(array $viaCep, ?array $brasilApi = null, ?array $openCep = null): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response($viaCep, 200),
            'brasilapi.com.br/api/cep/v1/*' => Http::response($brasilApi ?? $this->brasilApiCepV1(), 200),
            'brasilapi.com.br/api/cep/v2/*' => Http::response('geo-nao-devia', 599),
            'opencep.com/*' => Http::response($openCep ?? $this->openCepCompleto(), 200),
            '*' => Http::response('unexpected', 599),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function viaCepCompleto(): array
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
    private function viaCepIncompleto(): array
    {
        return [
            'cep' => '38400-328',
            'logradouro' => '',
            'complemento' => '',
            'bairro' => '',
            'localidade' => 'Uberlândia',
            'uf' => 'MG',
            'ibge' => '',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function brasilApiCepV1(): array
    {
        return [
            'cep' => '38400328',
            'state' => 'MG',
            'city' => 'Uberlândia',
            'neighborhood' => 'Santa Mônica',
            'street' => 'Avenida João Naves de Ávila',
            'service' => 'correios',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function openCepCompleto(): array
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

    private function countViaCep(): int
    {
        return $this->countUrl('viacep.com.br');
    }

    private function countOpenCep(): int
    {
        return $this->countUrl('opencep.com');
    }

    private function countBrasilApiCepV1(): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), 'cep/v1'))
            ->count();
    }

    private function countBrasilApiCepV2(): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), 'cep/v2'))
            ->count();
    }

    private function countUrl(string $needle): int
    {
        return collect(Http::recorded())
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), $needle))
            ->count();
    }
}
