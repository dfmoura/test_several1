<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Lista de ORC: contato do cliente (mesmo resolvedor da ficha) e busca pelo nome.
 * Faca, modelos, matriz e faixa continuam no payload — a coluna some só na grade.
 * O link (URL/token) permanece no detalhe.
 */
class OrcamentoListaContatoTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::findOrCreate('orcamento.ler', 'web');

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-OLST',
            'razao_social' => 'RLP Lista ORC',
            'nome_fantasia' => 'RLP ORC',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
        ]);

        $this->user = User::query()->create([
            'codigo' => 'USR-OLST',
            'name' => 'Comercial Lista',
            'email' => 'lista.orc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(['orcamento.ler']);
        $this->user->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    public function test_lista_mostra_contato_travado_no_envio_e_busca_pelo_nome(): void
    {
        $cliente = $this->parceiro('PAR-OLST1', 'CLIENTE LISTA');
        $maria = ParceiroContato::query()->create([
            'parceiro_id' => $cliente->id,
            'nome' => 'Maria Compradora',
            'funcao' => 'Compras',
            'whatsapp' => '31977776666',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);
        $orc = $this->orcamento($cliente, 'ORC-2026-00001', 1);
        OrcamentoLinkAprovacao::query()->create([
            'orcamento_id' => $orc->id,
            'parceiro_contato_id' => $maria->id,
            'token' => str_repeat('a', 64),
            'ativo' => false,
            'expira_em' => now()->subDay(),
            'destino_nome' => 'Ana Diretora',
            'destino_funcao' => 'Diretora',
            'usado_em' => now(),
        ]);
        $maria->update(['nome' => 'Maria Alterada', 'funcao' => 'Outra']);

        $semLink = $this->parceiro('PAR-OLST2', 'CLIENTE SEM LINK');
        ParceiroContato::query()->create([
            'parceiro_id' => $semLink->id,
            'nome' => 'João Compras',
            'funcao' => 'Almoxarifado',
            'email' => 'joao@cliente.test',
            'principal' => true,
            'autorizado_aprovar' => true,
            'ordem' => 0,
        ]);
        $this->orcamento($semLink, 'ORC-2026-00002', 2);

        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $lista = $this->withHeaders($h)->getJson('/api/v1/orcamentos');
        $lista->assertOk();

        $porCodigo = collect($lista->json('data'))->keyBy('codigo');
        $travado = $porCodigo['ORC-2026-00001'];
        $this->assertSame('Ana Diretora', $travado['contato_cliente']['nome']);
        $this->assertSame('Diretora', $travado['contato_cliente']['funcao']);
        $this->assertArrayNotHasKey('email', $travado['contato_cliente']);
        $this->assertArrayNotHasKey('whatsapp', $travado['contato_cliente']);
        $this->assertNull($travado['link_aprovacao']);
        $this->assertArrayNotHasKey('itens', $travado);
        $this->assertArrayHasKey('modelos_cliente', $travado);
        $this->assertArrayHasKey('valor_matriz', $travado);
        $this->assertArrayHasKey('input_snapshot', $travado);

        $cadastro = $porCodigo['ORC-2026-00002'];
        $this->assertSame('João Compras', $cadastro['contato_cliente']['nome']);
        $this->assertSame('Almoxarifado', $cadastro['contato_cliente']['funcao']);

        $porAna = $this->withHeaders($h)->getJson('/api/v1/orcamentos?q=Ana');
        $porAna->assertOk();
        $this->assertSame(['ORC-2026-00001'], array_column($porAna->json('data'), 'codigo'));

        $porJoao = $this->withHeaders($h)->getJson('/api/v1/orcamentos?q=João');
        $porJoao->assertOk();
        $this->assertSame(['ORC-2026-00002'], array_column($porJoao->json('data'), 'codigo'));

        $show = $this->withHeaders($h)->getJson('/api/v1/orcamentos/'.$orc->id);
        $show->assertOk();
        $this->assertSame('Ana Diretora', $show->json('data.contato_cliente.nome'));
        $this->assertNotNull($show->json('data.link_aprovacao'));
        $this->assertArrayNotHasKey('token', $show->json('data.link_aprovacao'));
    }

    public function test_lista_sem_pessoa_no_cadastro_nao_repete_a_empresa(): void
    {
        $cliente = $this->parceiro('PAR-OLST3', 'CLIENTE MUDO');
        $this->orcamento($cliente, 'ORC-2026-00003', 3);

        Sanctum::actingAs($this->user);
        $lista = $this->withHeaders(['X-Empresa-Id' => (string) $this->empresa->id])
            ->getJson('/api/v1/orcamentos');
        $lista->assertOk();
        $this->assertNull($lista->json('data.0.contato_cliente'));
        $this->assertSame('CLIENTE MUDO', $lista->json('data.0.cliente_nome'));
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

    private function orcamento(Parceiro $cliente, string $codigo, int $numero): Orcamento
    {
        return Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => $numero,
            'codigo' => $codigo,
            'versao' => 1,
            'parceiro_id' => $cliente->id,
            'cliente_nome' => $cliente->razao_social,
            'status' => Orcamento::STATUS_CALCULADO,
            'input_snapshot' => [],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);
    }
}
