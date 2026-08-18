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
use App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService;
use App\Support\PadraoDecimal;
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

    public function test_entregar_km_zero_nao_inventa(): void
    {
        $this->ativarCatalogoFrete();
        $this->parceiro->update([
            'distancia_km' => '0.000',
            'distancia_fonte' => 'mesmo_ponto',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

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

    public function test_entregar_cai_no_km_fiscal_se_entrega_nao_tem_km(): void
    {
        $this->ativarCatalogoFrete('2.00', '0', '10');
        $this->parceiro->update([
            'distancia_km' => '4.000',
            'distancia_fonte' => 'osm_routing',
            'distancia_empresa_id' => $this->empresa->id,
        ]);
        ParceiroEnderecoEntrega::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'apelido' => 'CD sem km',
            'logradouro' => 'Rua B',
            'numero' => '2',
            'bairro' => 'Centro',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'cep' => '38400000',
            'responsavel_nome' => 'Recebedor',
            'principal' => true,
            'ordem' => 0,
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $res->assertOk();
        $this->assertSame('fiscal', $res->json('data.frete.destino'));
        $this->assertSame('4.000', $res->json('data.frete.km'));
        $this->assertSame('8.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
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

    public function test_formula_km_vezes_preco_da_faixa_respeita_minimo_e_teto(): void
    {
        $this->ativarCatalogoFrete('3.80', '80.00', '0.100');
        $faixa = OrcCatalogoFaixaFrete::query()
            ->whereNotNull('kg_ate')
            ->orderBy('kg_ate')
            ->firstOrFail();
        $svc = app(OrcamentoFreteEstimadoService::class);

        // 2 km × 3,80 = 7,60 < mínimo 80 → 80,00
        $this->assertSame('80.00', $svc->calcularValor($faixa, '2.000')['valor']);
        // 30 km × 3,80 = 114,00 ≥ mínimo → 114,00
        $this->assertSame('114.00', $svc->calcularValor($faixa, '30.000')['valor']);
        // 21,053 km × 3,80 = 80,0014 → teto comercial 80,01
        $this->assertSame('80.01', $svc->calcularValor($faixa, '21.053')['valor']);
        $this->assertSame(
            PadraoDecimal::roundCeil(bcmul('3.80', '21.053', 8), PadraoDecimal::SCALE_MONEY),
            $svc->calcularValor($faixa, '21.053')['valor'],
        );
    }

    public function test_entregar_escolhe_faixa_do_catalogo_pelo_peso_estimado(): void
    {
        $this->ativarCatalogoFrete('3.80', '0', '15');
        $ordenadas = OrcCatalogoFaixaFrete::query()
            ->orderByRaw('kg_ate is null')
            ->orderBy('kg_ate')
            ->get();
        $ordenadas[0]->update(['preco_por_km' => '3.80', 'minimo_rs' => '0', 'ativo' => true]);
        $ordenadas[1]->update(['preco_por_km' => '4.20', 'minimo_rs' => '0', 'ativo' => true]);

        $this->parceiro->update([
            'distancia_km' => '10.000',
            'distancia_fonte' => 'ors',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $res->assertOk();
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);

        // BRAHVA: 7 e 10 rolos → 1 caixa (tubete 3" / 12); 14 rolos → 2 caixas.
        $this->assertSame(1, (int) $res->json('data.faixas.0.qtde_caixas'));
        $this->assertSame(2, (int) $res->json('data.faixas.2.qtde_caixas'));
        $this->assertSame('15.000', $res->json('data.faixas.0.kg_est'));
        $this->assertSame('30.000', $res->json('data.faixas.2.kg_est'));
        $this->assertSame('20.000', $res->json('data.faixas.0.faixa_frete_kg_ate'));
        $this->assertSame('50.000', $res->json('data.faixas.2.faixa_frete_kg_ate'));
        // 3,80 × 10 km = 38,00 · 4,20 × 10 km = 42,00 (mínimo 0, produto vence)
        $this->assertSame('38.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertSame('42.00', $res->json('data.faixas.2.valor_frete'));
        $this->assertSame('10.000', $res->json('data.frete.km'));
    }

    public function test_frete_somavel_compoe_total_proposta_sem_alterar_motor(): void
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
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $motor = (float) $res->json('data.faixas.0.valor_total');
        $this->assertEqualsWithDelta(3626.0, $motor, 0.01);
        $this->assertSame('25.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertTrue($res->json('data.faixas.0.frete_somavel'));
        $this->assertSame('3651.00', $res->json('data.faixas.0.valor_total_proposta'));

        $create = $this->asComercial()->postJson('/api/v1/orcamentos', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $create->assertCreated();
        $id = $create->json('data.id');
        $pub = $this->asComercial()->getJson("/api/v1/orcamentos/{$id}/proposta-comercial");
        $pub->assertOk();
        $this->assertEqualsWithDelta(3651.0, (float) $pub->json('data.faixas.0.valor_total'), 0.01);
        $this->assertEqualsWithDelta(25.0, (float) $pub->json('data.faixas.0.valor_frete'), 0.01);
        $this->assertTrue($pub->json('data.faixas.0.frete_somavel'));
        $this->assertTrue($pub->json('data.frete.somavel'));
        $this->assertEqualsWithDelta(3090.0, (float) $pub->json('data.faixas.0.valor_etiqueta'), 0.01);
    }

    public function test_prospect_com_km_frete_compoe_igual_ao_cliente(): void
    {
        $this->ativarCatalogoFrete('1.50', '25.00', '8');
        $prospect = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-PRSP1',
            'razao_social' => 'Prospect Frete',
            'is_prospect' => true,
            'situacao' => 'ATIVO',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'whatsapp' => '34999990000',
            'distancia_km' => '10.000',
            'distancia_fonte' => 'ors',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'parceiro_id' => $prospect->id,
            'modo_entrega' => 'ENTREGAR',
        ]));
        $res->assertOk();
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertEqualsWithDelta(3626.0, (float) $res->json('data.faixas.0.valor_total'), 0.01);
        $this->assertSame('25.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertTrue($res->json('data.faixas.0.frete_somavel'));
        $this->assertSame('3651.00', $res->json('data.faixas.0.valor_total_proposta'));

        $create = $this->asComercial()->postJson('/api/v1/orcamentos', $this->payload([
            'parceiro_id' => $prospect->id,
            'modo_entrega' => 'ENTREGAR',
        ]));
        $create->assertCreated();
        $this->assertTrue($create->json('data.parceiro.is_prospect'));
        $this->assertSame('3651.00', $create->json('data.result_snapshot.faixas.0.valor_total_proposta'));
        $this->assertEqualsWithDelta(3626.0, (float) $create->json('data.result_snapshot.faixas.0.valor_total'), 0.01);
    }

    public function test_retirar_e_sem_km_nao_infla_total_proposta(): void
    {
        $this->ativarCatalogoFrete();
        $this->parceiro->update([
            'distancia_km' => '10.000',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $retirar = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload());
        $retirar->assertOk();
        $this->assertFalse($retirar->json('data.faixas.0.frete_somavel'));
        $this->assertSame('3626.00', $retirar->json('data.faixas.0.valor_total_proposta'));

        $this->parceiro->update(['distancia_km' => null, 'distancia_empresa_id' => null]);
        $semKm = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
        ]));
        $semKm->assertOk();
        $this->assertFalse($semKm->json('data.faixas.0.frete_somavel'));
        $this->assertSame('3626.00', $semKm->json('data.faixas.0.valor_total_proposta'));
    }

    public function test_entregar_sem_origem_continua_calculada(): void
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
        $this->assertSame('CALCULADA', $res->json('data.frete.origem'));
        $this->assertSame('25.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
    }

    public function test_entregar_manual_soma_mesmo_sem_km(): void
    {
        $this->ativarCatalogoFrete();

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
            'origem_frete' => 'MANUAL',
            'valor_frete_manual' => '80.00',
        ]));
        $res->assertOk();
        $this->assertSame('ENTREGAR', $res->json('data.frete.modo'));
        $this->assertSame('MANUAL', $res->json('data.frete.origem'));
        $this->assertSame('manual', $res->json('data.frete.motivo'));
        $this->assertSame('80.00', $res->json('data.frete.valor_informado'));
        $this->assertSame('80.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertSame('80.00', $res->json('data.faixas.2.valor_frete'));
        $this->assertTrue($res->json('data.faixas.0.frete_somavel'));
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $motor = (float) $res->json('data.faixas.0.valor_total');
        $this->assertEqualsWithDelta(3626.0, $motor, 0.01);
        $this->assertSame('3706.00', $res->json('data.faixas.0.valor_total_proposta'));
    }

    public function test_entregar_manual_zero_nao_infla(): void
    {
        $this->ativarCatalogoFrete();

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
            'origem_frete' => 'MANUAL',
            'valor_frete_manual' => 0,
        ]));
        $res->assertOk();
        $this->assertSame('0.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertFalse($res->json('data.faixas.0.frete_somavel'));
        $this->assertSame('3626.00', $res->json('data.faixas.0.valor_total_proposta'));
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
    }

    public function test_entregar_manual_exige_valor(): void
    {
        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'ENTREGAR',
            'origem_frete' => 'MANUAL',
        ]));
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['valor_frete_manual']);
    }

    public function test_retirar_ignora_valor_manual(): void
    {
        $this->ativarCatalogoFrete();
        $this->parceiro->update([
            'distancia_km' => '10.000',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'modo_entrega' => 'RETIRAR',
            'origem_frete' => 'MANUAL',
            'valor_frete_manual' => '99.00',
        ]));
        $res->assertOk();
        $this->assertSame('RETIRAR', $res->json('data.frete.modo'));
        $this->assertNull($res->json('data.frete.origem'));
        $this->assertSame('0.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertFalse($res->json('data.faixas.0.frete_somavel'));
        $this->assertSame('3626.00', $res->json('data.faixas.0.valor_total_proposta'));
    }

    public function test_manual_teto_para_cima_e_snapshot_nao_muda_com_catalogo(): void
    {
        $this->ativarCatalogoFrete('9.99', '0', '10');
        $this->parceiro->update([
            'distancia_km' => '4.000',
            'distancia_empresa_id' => $this->empresa->id,
        ]);

        $create = $this->asComercial()->postJson('/api/v1/orcamentos', $this->payload([
            'modo_entrega' => 'ENTREGAR',
            'origem_frete' => 'MANUAL',
            'valor_frete_manual' => '80.001',
        ]));
        $create->assertCreated();
        $this->assertSame('MANUAL', $create->json('data.input_snapshot.origem_frete'));
        $this->assertSame('80.01', $create->json('data.input_snapshot.valor_frete_manual'));
        $this->assertSame('80.01', $create->json('data.result_snapshot.faixas.0.valor_frete'));
        $this->assertSame('80.01', $create->json('data.result_snapshot.faixas.2.valor_frete'));
        $this->assertEqualsWithDelta(3090.0, (float) $create->json('data.result_snapshot.faixas.0.valor_etiqueta'), 0.01);

        OrcCatalogoFaixaFrete::query()->update(['preco_por_km' => '1.00']);

        $show = $this->asComercial()->getJson('/api/v1/orcamentos/'.$create->json('data.id'));
        $show->assertOk();
        $this->assertSame('80.01', $show->json('data.result_snapshot.faixas.0.valor_frete'));
        $this->assertSame('MANUAL', $show->json('data.result_snapshot.frete.origem'));
    }

    public function test_prospect_manual_compoe_igual_ao_cliente(): void
    {
        $prospect = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-PRSPM',
            'razao_social' => 'Prospect Frete Manual',
            'is_prospect' => true,
            'situacao' => 'ATIVO',
            'municipio' => 'Uberlândia',
            'uf' => 'MG',
            'whatsapp' => '34999990001',
        ]);

        $res = $this->asComercial()->postJson('/api/v1/orcamentos/calcular', $this->payload([
            'parceiro_id' => $prospect->id,
            'modo_entrega' => 'ENTREGAR',
            'origem_frete' => 'MANUAL',
            'valor_frete_manual' => '40.00',
        ]));
        $res->assertOk();
        $this->assertSame('40.00', $res->json('data.faixas.0.valor_frete'));
        $this->assertTrue($res->json('data.faixas.0.frete_somavel'));
        $this->assertSame('3666.00', $res->json('data.faixas.0.valor_total_proposta'));
        $this->assertEqualsWithDelta(3090.0, (float) $res->json('data.faixas.0.valor_etiqueta'), 0.01);
        $this->assertEqualsWithDelta(3626.0, (float) $res->json('data.faixas.0.valor_total'), 0.01);
    }

    public function test_proposta_publica_manual_nao_vaza_origem(): void
    {
        $create = $this->asComercial()->postJson('/api/v1/orcamentos', $this->payload([
            'modo_entrega' => 'ENTREGAR',
            'origem_frete' => 'MANUAL',
            'valor_frete_manual' => '25.00',
        ]));
        $create->assertCreated();
        $id = $create->json('data.id');
        $pub = $this->asComercial()->getJson("/api/v1/orcamentos/{$id}/proposta-comercial");
        $pub->assertOk();
        $this->assertEqualsWithDelta(25.0, (float) $pub->json('data.faixas.0.valor_frete'), 0.01);
        $this->assertTrue($pub->json('data.faixas.0.frete_somavel'));
        $this->assertTrue($pub->json('data.frete.somavel'));
        $this->assertSame('Entrega — frete estimado', $pub->json('data.frete.texto'));
        $this->assertArrayNotHasKey('origem', $pub->json('data.frete'));
        $this->assertEqualsWithDelta(3090.0, (float) $pub->json('data.faixas.0.valor_etiqueta'), 0.01);
    }
}
