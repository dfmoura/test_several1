<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\User;
use App\Services\Financeiro\AdiantamentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Lista de PED: contato do cliente (retrato do ORC) e busca pelo nome.
 * Itens continuam no payload — a coluna some só na grade.
 */
class PedidoListaContatoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('producao.ler', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-LST1',
            'razao_social' => 'RLP Lista',
            'nome_fantasia' => 'RLP LST',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-LST1',
            'name' => 'Producao Lista',
            'email' => 'lista.ped@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['producao.ler']);
        $this->user->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    public function test_lista_mostra_contato_travado_no_envio_e_busca_pelo_nome(): void
    {
        $cliente = $this->parceiro('PAR-LST01', 'CLIENTE LISTA');
        $maria = ParceiroContato::query()->create([
            'parceiro_id' => $cliente->id,
            'nome' => 'Maria Compradora',
            'funcao' => 'Compras',
            'whatsapp' => '31977776666',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);
        $pedido = $this->pedido($cliente, 'PED-2026-00001', 'ORC-2026-00001', 1, ['Frente', 'Verso']);
        OrcamentoLinkAprovacao::query()->create([
            'orcamento_id' => $pedido->orcamento_id,
            'parceiro_contato_id' => $maria->id,
            'token' => str_repeat('a', 64),
            'ativo' => false,
            'expira_em' => now()->subDay(),
            'destino_nome' => 'Ana Diretora',
            'destino_funcao' => 'Diretora',
            'usado_em' => now(),
        ]);
        $maria->update(['nome' => 'Maria Alterada', 'funcao' => 'Outra']);

        $semLink = $this->parceiro('PAR-LST02', 'CLIENTE SEM LINK');
        ParceiroContato::query()->create([
            'parceiro_id' => $semLink->id,
            'nome' => 'João Compras',
            'funcao' => 'Almoxarifado',
            'email' => 'joao@cliente.test',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);
        $this->pedido($semLink, 'PED-2026-00002', 'ORC-2026-00002', 2, ['Único']);

        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $lista = $this->withHeaders($h)->getJson('/api/v1/pedidos');
        $lista->assertOk();

        $porCodigo = collect($lista->json('data'))->keyBy('codigo');
        $travado = $porCodigo['PED-2026-00001'];
        $this->assertSame('Ana Diretora', $travado['contato_cliente']['nome']);
        $this->assertSame('Diretora', $travado['contato_cliente']['funcao']);
        $this->assertArrayNotHasKey('email', $travado['contato_cliente']);
        $this->assertArrayNotHasKey('whatsapp', $travado['contato_cliente']);
        $this->assertCount(2, $travado['itens']);
        $this->assertSame(['Frente', 'Verso'], array_column($travado['itens'], 'descricao'));

        $cadastro = $porCodigo['PED-2026-00002'];
        $this->assertSame('João Compras', $cadastro['contato_cliente']['nome']);
        $this->assertSame('Almoxarifado', $cadastro['contato_cliente']['funcao']);

        $porAna = $this->withHeaders($h)->getJson('/api/v1/pedidos?q=Ana');
        $porAna->assertOk();
        $this->assertSame(['PED-2026-00001'], array_column($porAna->json('data'), 'codigo'));

        $porJoao = $this->withHeaders($h)->getJson('/api/v1/pedidos?q=João');
        $porJoao->assertOk();
        $this->assertSame(['PED-2026-00002'], array_column($porJoao->json('data'), 'codigo'));
    }

    public function test_lista_sem_pessoa_no_cadastro_nao_repete_a_empresa(): void
    {
        $cliente = $this->parceiro('PAR-LST03', 'CLIENTE MUDO');
        $this->pedido($cliente, 'PED-2026-00003', 'ORC-2026-00003', 3, ['Item']);

        Sanctum::actingAs($this->user);
        $lista = $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->getJson('/api/v1/pedidos');
        $lista->assertOk();
        $this->assertNull($lista->json('data.0.contato_cliente'));
        $this->assertSame('CLIENTE MUDO', $lista->json('data.0.parceiro.razao_social'));
    }

    private function parceiro(string $codigo, string $razao): Parceiro
    {
        return Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => $codigo,
            'razao_social' => $razao,
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);
    }

    /**
     * @param  list<string>  $descricoes
     */
    private function pedido(Parceiro $cliente, string $codigoPed, string $codigoOrc, int $numero, array $descricoes): Pedido
    {
        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => $numero,
            'codigo' => $codigoOrc,
            'versao' => 1,
            'parceiro_id' => $cliente->id,
            'cliente_nome' => $cliente->razao_social,
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'input_snapshot' => [],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);

        $pedido = Pedido::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => $codigoPed,
            'orcamento_id' => $orc->id,
            'parceiro_id' => $cliente->id,
            'status' => Pedido::STATUS_LIBERADO,
            'faixa_index' => 0,
            'tolerancia_qtd_pct' => '20',
            'prazo_entrega_dias' => 10,
        ]);

        foreach ($descricoes as $i => $descricao) {
            PedidoItem::query()->create([
                'empresa_id' => $this->empresa->id,
                'pedido_id' => $pedido->id,
                'ordem' => $i + 1,
                'necessidade' => PedidoItem::NEC_PRODUCAO,
                'familia_fiscal' => 'PA-ETQ',
                'descricao' => $descricao,
                'qtde_pedida' => '1000.0000',
                'unidade' => 'MIL',
                'status' => PedidoItem::STATUS_PENDENTE,
            ]);
        }

        return $pedido;
    }
}
