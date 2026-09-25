<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Espelho comercial ORC → PED: N linhas, faixa e modelos por posição.
 */
class PedidoItensEspelhoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    private Parceiro $parceiro;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['orcamento.ler', 'orcamento.escrever', 'producao.ler'] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-PED1',
            'razao_social' => 'RLP Pedido',
            'nome_fantasia' => 'RLP PED',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
        ]);

        $this->parceiro = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-PED01',
            'razao_social' => 'CLIENTE PEDIDO',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
            'limite_credito' => '80000.00',
            'whatsapp' => '31977776666',
            'contato_nome' => 'Maria Compradora',
        ]);
        $this->completarParceiroParaProposta($this->parceiro);
        $this->seedParceiroRecorrenteLimpo($this->empresa, $this->parceiro);

        ParceiroContato::query()->create([
            'parceiro_id' => $this->parceiro->id,
            'nome' => 'Maria Compradora',
            'whatsapp' => '31977776666',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);

        Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PA-ETQ-001',
            'familia' => 'PA',
            'descricao_fiscal' => 'ETIQUETAS BOPP',
            'unidade_comercial' => 'MIL',
            'unidade_interna' => 'MIL',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-PED1',
            'name' => 'Comercial PED',
            'email' => 'comercial.ped@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever', 'producao.ler']);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    public function test_n1_continua_uma_linha(): void
    {
        Sanctum::actingAs($this->comercial);
        $pedido = $this->aprovarEPedido([$this->job()]);

        $this->assertSame(1, $pedido->itens()->count());
        $item = $pedido->itens()->first();
        $this->assertSame(PedidoItem::NEC_PRODUCAO, $item->necessidade);
        $this->assertSame(0, (int) ($item->especificacao['faixa_index'] ?? -1));
        $this->assertIsArray($item->especificacao['faixa'] ?? null);
        $this->assertSame($pedido->faixa_index, (int) $item->especificacao['faixa_index']);
    }

    public function test_etiqueta_n_linhas_espelha_faixa_e_modelos_por_item(): void
    {
        Sanctum::actingAs($this->comercial);
        $pedido = $this->aprovarEPedido(
            [
                array_merge($this->job(), [
                    'rotulo' => 'Frente',
                    'medida' => '80X50',
                    'modelos' => 2,
                    'modelos_composicao' => [
                        ['ordem' => 1, 'nome' => 'Frente A', 'percentual' => 60, 'valor_arte' => 0],
                        ['ordem' => 2, 'nome' => 'Frente B', 'percentual' => 40, 'valor_arte' => 0],
                    ],
                ]),
                array_merge($this->job(), [
                    'rotulo' => 'Verso',
                    'medida' => '60X40',
                    'largura_cm' => 62,
                    'modelos' => 1,
                    'modelos_composicao' => [
                        ['ordem' => 1, 'nome' => 'Verso único', 'percentual' => 100, 'valor_arte' => 0],
                    ],
                ]),
            ],
            [
                ['ordem' => 1, 'faixa_index' => 1],
                ['ordem' => 2, 'faixa_index' => 0],
            ],
        );

        $this->assertSame(1, Pedido::query()->where('orcamento_id', $pedido->orcamento_id)->count());
        $this->assertSame(2, $pedido->itens()->count());

        $i1 = $pedido->itens->firstWhere('ordem', 1);
        $i2 = $pedido->itens->firstWhere('ordem', 2);
        $this->assertNotNull($i1);
        $this->assertNotNull($i2);
        $this->assertSame('80X50', $i1->especificacao['medida'] ?? null);
        $this->assertSame('60X40', $i2->especificacao['medida'] ?? null);
        $this->assertSame(1, (int) $i1->especificacao['faixa_index']);
        $this->assertSame(0, (int) $i2->especificacao['faixa_index']);
        $this->assertNotEquals(
            (string) $i1->qtde_pedida,
            (string) $i2->qtde_pedida,
        );
        $this->assertSame('Frente A', $i1->especificacao['modelos_composicao'][0]['nome'] ?? null);
        $this->assertSame('Verso único', $i2->especificacao['modelos_composicao'][0]['nome'] ?? null);
        $this->assertSame(2, count($i1->especificacao['modelos_composicao'] ?? []));
        $this->assertSame(1, count($i2->especificacao['modelos_composicao'] ?? []));
        $this->assertSame('80X50', $pedido->snapshot['input']['medida'] ?? null);
        $this->assertSame(1, $pedido->faixa_index);
    }

    /**
     * @param  list<array<string, mixed>>  $jobs
     * @param  list<array{ordem: int, faixa_index: int}>|null  $faixasItens
     */
    private function aprovarEPedido(array $jobs, ?array $faixasItens = null): Pedido
    {
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];
        $payload = [
            'parceiro_id' => $this->parceiro->id,
            'tipo_operacao' => 'INDUSTRIALIZACAO',
            'prazo_entrega_dias' => 12,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
            'itens' => $jobs,
        ];
        $id = (int) $this->withHeaders($h)
            ->postJson('/api/v1/orcamentos', $payload)
            ->assertCreated()
            ->json('data.id');

        $token = $this->withHeaders($h)
            ->postJson("/api/v1/orcamentos/{$id}/enviar-aprovacao")
            ->assertOk()
            ->json('data.token');

        $decidir = ['acao' => 'APROVAR', 'nome_cliente' => 'Maria Compradora'];
        if ($faixasItens !== null) {
            $decidir['faixas_itens'] = $faixasItens;
        } else {
            $decidir['faixa_index'] = 0;
        }

        $this->postJson("/api/v1/publico/orcamentos/{$token}/decidir", $decidir)->assertOk();

        $orc = Orcamento::query()->findOrFail($id);
        $this->assertSame('LIBERADO', $orc->financeiro_status);

        $pedido = Pedido::query()
            ->where('orcamento_id', $id)
            ->with('itens')
            ->first();
        $this->assertNotNull($pedido);

        return $pedido;
    }

    /** @return array<string, mixed> */
    private function job(): array
    {
        $fx = json_decode(
            (string) file_get_contents(dirname(__DIR__).'/fixtures/orcamento_brahva.json'),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        return [
            'necessidade' => 'PRODUCAO',
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
            'saida_etiqueta' => 'PE',
            'formato_faca' => 'DESENHADA',
            'facas' => [[
                'principal' => true,
                'formato' => 'DESENHADA',
                'medida' => $fx['medida'],
                'faca_nova' => false,
            ]],
        ];
    }
}
