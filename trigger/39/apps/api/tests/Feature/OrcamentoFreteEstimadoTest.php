<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\OrcCatalogoFaixaFrete;
use App\Models\OrcCatalogoParametro;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\ParceiroEnderecoEntrega;
use App\Models\User;
use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OrcamentoFreteEstimadoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmpresa;

    private User $comercial;

    private Parceiro $parceiro;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('orcamento.ler', 'web');
        Permission::findOrCreate('orcamento.escrever', 'web');
        Permission::findOrCreate('orcamento.catalogo.gerir', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-FRT1',
            'razao_social' => 'Empresa Frete',
            'nome_fantasia' => 'Frete',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
        ]);
        $this->outraEmpresa = Empresa::query()->create([
            'codigo' => 'EMP-FRT2',
            'razao_social' => 'Outra EMP Frete',
            'nome_fantasia' => 'Frete2',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-00001',
            'razao_social' => 'BRAHVA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-FRT1',
            'name' => 'Comercial Frete',
            'email' => 'comercial.frete@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever']);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);
        $this->comercial->empresas()->attach($this->outraEmpresa->id, ['padrao' => false]);
    }

    private function asComercial(?Empresa $empresa = null)
    {
        Sanctum::actingAs($this->comercial);

        return $this->withHeader('X-Empresa-Id', (string) ($empresa ?? $this->empresa)->id);
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        return array_merge([
            'parceiro_id' => $this->parceiro->id,
            'medida' => $fx['medida'],
            'largura_cm' => $fx['largura_cm'],
            'puxada_cm' => $fx['puxada_cm'],
            'cores' => $fx['cores'],
            'papel' => $fx['papel'],
            'acabamento' => $fx['acabamento'],
            'modelos' => $fx['modelos'],
            'colunas' => $fx['colunas'],
            'etiq_por_rolo' => $fx['etiq_por_rolo'],
            'tubete' => $fx['tubete'],
            'z' => $fx['z'],
            'maquina' => $fx['maquina'],
            'maquina_roda_servico' => $fx['maquina_roda_servico'],
            'imposto_pct' => $fx['imposto_pct'],
            'matriz' => $fx['matriz'],
            'coluna_rebobinacao' => $fx['coluna_rebobinacao'],
            'tipo_troca_produto' => $fx['tipo_troca_produto'],
            'rpm' => $fx['rpm'],
            'overrides' => $fx['overrides'],
            'faixas' => array_map(static fn (array $f) => [
                'quantidade' => $f['quantidade'],
                'comissao_pct' => $f['comissao_pct'],
            ], $fx['faixas']),
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
            'modo_entrega' => 'RETIRAR',
        ], $overrides);
    }

    private function ativarCatalogoFrete(string $precoPorKm = '2.00', string $minimo = '25.00', string $pesoCaixa = '10'): void
    {
        app(OrcamentoCatalogoAdminService::class)->seedFromJson();
        OrcCatalogoParametro::query()
            ->where('chave', OrcCatalogoParametro::CHAVE_PESO_CAIXA_KG)
            ->update(['valor' => $pesoCaixa, 'ativo' => true]);
        OrcCatalogoFaixaFrete::query()->update([
            'preco_por_km' => $precoPorKm,
            'minimo_rs' => $minimo,
            'ativo' => true,
        ]);
    }

    public function test_retirar_nao_altera_motor_e_frete_zero(): void
    {
        $this->ativarCatalogoFrete();
        $this->parceiro->update([
            'distancia_km' => '10.000',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload());
        $res->assertOk();
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertSame('RETIRAR', $res->json('data.frete.modo'));
        $this->assertSame('0.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertFalse($res->json('data.faixas.0.frete_somavel'));
    }

    public function test_entregar_sem_km_nao_inventa(): void
    {
        $this->ativarCatalogoFrete();

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $res->assertOk();
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertSame('sem_km', $res->json('data.frete.motivo'));
        $this->assertNull($res->json('data.faixas.0.valor_frete'));
        $this->assertFalse($res->json('data.faixas.0.frete_somavel'));
    }

    public function test_entregar_aplica_maximo_minimo_e_teto_para_cima(): void
    {
        $this->ativarCatalogoFrete('1.50', '25.00', '8');
        $this->parceiro->update([
            'distancia_km' => '10.000',
            'distancia_fonte' => 'ors',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $res->assertOk();
        $this->assertSame('ENTREGAR', $res->json('data.frete.modo'));
        $this->assertSame('fiscal', $res->json('data.frete.destino'));
        $this->assertSame('10.000', $res->json('data.frete.km'));
        $this->assertTrue($res->json('data.faixas.0.frete_somavel'));
        // 1.50 × 10 = 15 < mínimo 25 → 25.00
        $this->assertSame('25.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
    }

    public function test_km_de_outra_emp_nao_entra_no_calculo(): void
    {
        $this->ativarCatalogoFrete();
        $this->parceiro->update([
            'distancia_km' => '40.000',
            'distancia_empresa_id' => $this->outraEmpresa->id,
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $res->assertOk();
        $this->assertSame('sem_km', $res->json('data.frete.motivo'));
        $this->assertNull($res->json('data.faixas.0.valor_frete'));
    }

    public function test_destino_entrega_principal_prefere_ao_fiscal(): void
    {
        $this->ativarCatalogoFrete('2.00', '0', '10');
        $this->parceiro->update([
            'distancia_km' => '99.000',
            'distancia_empresa_id' => $this->empresa->id,
        ]);
        ParceiroEnderecoEntrega::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'apelido' => 'CD',
            'logradouro' => 'Rua A',
            'numero' => '1',
            'bairro' => 'Centro',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'cep' => '38400000',
            'responsavel_nome' => 'Recebedor',
            'principal' => true,
            'ordem' => 0,
            'distancia_km' => '4.000',
            'distancia_fonte' => 'ors',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $res->assertOk();
        $this->assertSame('entrega', $res->json('data.frete.destino'));
        $this->assertSame('4.000', $res->json('data.frete.km'));
        $this->assertSame('8.00', $res->json('data.faixas.0.valor_frete'));
    }

    public function test_snapshot_nao_muda_quando_catalogo_muda(): void
    {
        $this->ativarCatalogoFrete('2.00', '0', '10');
        $this->parceiro->update([
            'distancia_km' => '4.000',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $create = $this->asComercial()->postJson('/api/v1/orcamentos', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $create->assertCreated();
        $this->assertSame('ENTREGAR', $create->json('data.input_snapshot.modo_entrega'));
        $this->assertSame('8.00', $create->json('data.result_snapshot.faixas.0.valor_frete'));

        OrcCatalogoFaixaFrete::query()->update(['preco_por_km' => '9.99']);

        $show = $this->asComercial()->getJson('/api/v1/orcamentos/'.$create->json('data.id'));
        $show->assertOk();
        $this->assertSame('8.00', $show->json('data.result_snapshot.faixas.0.valor_frete'));
        $this->assertSame(1, Orcamento::query()->count());
    }

    public function test_faixa_sem_tarifa_fica_sob_consulta(): void
    {
        $this->ativarCatalogoFrete();
        OrcCatalogoFaixaFrete::query()->update(['preco_por_km' => null, 'ativo' => true]);
        $this->parceiro->update([
            'distancia_km' => '4.000',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $res->assertOk();
        $this->assertSame('sob_consulta', $res->json('data.frete.motivo'));
        $this->assertNull($res->json('data.faixas.0.valor_frete'));
        $this->assertFalse($res->json('data.faixas.0.frete_somavel'));
    }
}
