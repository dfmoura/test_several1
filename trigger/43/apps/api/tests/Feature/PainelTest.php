<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Financeiro\AdiantamentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Cockpit do Painel: EMP do contexto, RBAC por bloco, sem misturar marca.
 */
class PainelTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empA;

    private Empresa $empB;

    private User $admin;

    private User $comercial;

    private Parceiro $parA;

    private Parceiro $parB;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'orcamento.ler',
            'producao.ler',
            'faturamento.ler',
            'expedicao.ler',
            'compras.ler',
            'estoque.ler',
            'financeiro.ler',
        ] as $p) {
            Permission::findOrCreate($p, 'web');
        }

        app(NaturezaGerencialService::class)->seedCatalog();

        $this->empA = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP Operacional A',
            'nome_fantasia' => 'RETA ETIQUETAS',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $this->empB = Empresa::query()->create([
            'codigo' => 'EMP-00002',
            'razao_social' => 'RLP Holding B',
            'nome_fantasia' => 'HOLDING',
            'cnpj' => '00000000000272',
            'situacao' => 'ATIVA',
            'venda_ativa' => false,
            'estoque_ativo' => false,
        ]);

        $this->parA = Parceiro::query()->create([
            'empresa_id' => $this->empA->id,
            'codigo' => 'PAR-00010',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Cliente A',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);
        $this->parB = Parceiro::query()->create([
            'empresa_id' => $this->empB->id,
            'codigo' => 'PAR-00020',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Cliente B',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $this->admin = $this->user('admin.painel@test.local', 'USR-PNL1', [
            'orcamento.ler',
            'producao.ler',
            'faturamento.ler',
            'expedicao.ler',
            'compras.ler',
            'estoque.ler',
            'financeiro.ler',
        ], [$this->empA->id, $this->empB->id], $this->empA->id);

        $this->comercial = $this->user('comercial.painel@test.local', 'USR-PNL2', [
            'orcamento.ler',
        ], [$this->empA->id], $this->empA->id);
    }

    public function test_isolado_por_emp_e_nao_vaza_para_a_outra(): void
    {
        $this->orcamento($this->empA, $this->parA, 1, Orcamento::STATUS_CALCULADO);
        $this->orcamento($this->empA, $this->parA, 2, Orcamento::STATUS_ENVIADO);
        $this->orcamento($this->empA, $this->parA, 3, Orcamento::STATUS_APROVADO);
        $this->orcamento($this->empB, $this->parB, 1, Orcamento::STATUS_RASCUNHO);

        Sanctum::actingAs($this->admin);

        $a = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/painel')
            ->assertOk();

        $this->assertSame('EMP-00001', $a->json('data.empresa.codigo'));
        $this->assertTrue($a->json('data.empresa.venda_ativa'));
        $this->assertSame(2, $this->cardValor($a->json('data.cadeia'), 'orcamentos'));
        $this->assertSame(1, $this->filaCount($a->json('data.filas'), 'orc_cliente'));

        $b = $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/painel')
            ->assertOk();

        $this->assertSame('EMP-00002', $b->json('data.empresa.codigo'));
        $this->assertFalse($b->json('data.empresa.venda_ativa'));
        $this->assertSame(1, $this->cardValor($b->json('data.cadeia'), 'orcamentos'));
        $this->assertNull($this->filaCount($b->json('data.filas'), 'orc_cliente'));
    }

    public function test_perfil_comercial_nao_ve_financeiro_nem_producao(): void
    {
        Sanctum::actingAs($this->comercial);

        $res = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/painel')
            ->assertOk();

        $ids = array_column($res->json('data.cadeia'), 'id');
        $this->assertContains('orcamentos', $ids);
        $this->assertContains('parceiros', $ids);
        if (\App\Support\FlexorcSuperficie::emiteSinalNoAceite()) {
            $this->assertContains('sinal', $ids);
        } else {
            $this->assertNotContains('sinal', $ids);
        }
        $this->assertNotContains('receber', $ids);
        $this->assertNotContains('pedidos', $ids);
        $this->assertNotContains('faturamentos', $ids);
        $this->assertNotContains('expedicao', $ids);
        $this->assertNotContains('pagar', $ids);
        $this->assertTrue($res->json('data.modulos.comercial'));
        $this->assertFalse($res->json('data.modulos.financeiro'));
        $this->assertFalse($res->json('data.modulos.producao'));
        $this->assertFalse($res->json('data.modulos.expedicao'));
        $this->assertFalse($res->json('data.modulos.compras'));
        $this->assertFalse($res->json('data.modulos.estoque'));
    }

    public function test_titulo_vencido_entra_na_fila(): void
    {
        if (! \App\Support\FlexorcSuperficie::expoeFinanceiro()) {
            $this->markTestSkipped('Fatia até envio do link — financeiro oculto.');
        }

        $this->orcamento($this->empA, $this->parA, 8, Orcamento::STATUS_APROVADO);

        $natId = (int) \App\Models\NaturezaGerencial::query()->where('codigo', '1.01.01')->value('id');
        Titulo::query()->create([
            'empresa_id' => $this->empA->id,
            'codigo' => 'TIT-2026-00001',
            'tipo' => Titulo::TIPO_RECEBER,
            'parceiro_id' => $this->parA->id,
            'natureza_id' => $natId,
            'documento' => 'TESTE',
            'emissao' => now()->subDays(10)->toDateString(),
            'vencimento' => now()->subDays(2)->toDateString(),
            'valor' => '150.00',
            'saldo' => '150.00',
            'status' => Titulo::STATUS_ABERTO,
        ]);

        Sanctum::actingAs($this->admin);
        $res = $this->withHeader('X-Empresa-Id', (string) $this->empA->id)
            ->getJson('/api/v1/painel')
            ->assertOk();

        $this->assertSame('150.00', $this->cardValor($res->json('data.cadeia'), 'receber'));
        $this->assertTrue($this->card($res->json('data.cadeia'), 'receber')['alerta']);
        $this->assertSame(1, $this->filaCount($res->json('data.filas'), 'tit_receber_vencido'));
        $this->assertNotNull($this->card($res->json('data.cadeia'), 'pedidos'));
        $this->assertNotNull($this->card($res->json('data.cadeia'), 'ordens_producao'));
        $this->assertNotNull($this->card($res->json('data.cadeia'), 'faturamentos'));
        $this->assertNotNull($this->card($res->json('data.cadeia'), 'expedicao'));
        $this->assertNotNull($this->card($res->json('data.cadeia'), 'pagar'));
        $this->assertTrue($res->json('data.modulos.expedicao'));
        $this->assertTrue($res->json('data.modulos.compras'));
        $this->assertTrue($res->json('data.modulos.estoque'));
    }

    public function test_sem_vinculo_na_emp_retorna_403(): void
    {
        Sanctum::actingAs($this->comercial);

        $this->withHeader('X-Empresa-Id', (string) $this->empB->id)
            ->getJson('/api/v1/painel')
            ->assertForbidden();
    }

    /**
     * @param  list<string>  $perms
     * @param  list<int>  $empIds
     */
    private function user(string $email, string $codigo, array $perms, array $empIds, int $padrao): User
    {
        $user = User::query()->create([
            'codigo' => $codigo,
            'name' => $codigo,
            'email' => $email,
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $padrao,
        ]);
        $user->givePermissionTo($perms);
        $sync = [];
        foreach ($empIds as $id) {
            $sync[$id] = ['padrao' => $id === $padrao];
        }
        $user->empresas()->attach($sync);

        return $user;
    }

    private function orcamento(Empresa $emp, Parceiro $par, int $n, string $status): Orcamento
    {
        return Orcamento::query()->create([
            'empresa_id' => $emp->id,
            'ano' => 2026,
            'numero' => $n,
            'codigo' => 'ORC-2026-'.str_pad((string) $n, 5, '0', STR_PAD_LEFT),
            'versao' => 1,
            'parceiro_id' => $par->id,
            'cliente_nome' => $par->razao_social,
            'status' => $status,
            'financeiro_status' => $status === Orcamento::STATUS_APROVADO
                ? AdiantamentoService::FIN_LIBERADO
                : null,
            'input_snapshot' => [],
            'result_snapshot' => [],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $cadeia
     * @return array<string, mixed>|null
     */
    private function card(array $cadeia, string $id): ?array
    {
        foreach ($cadeia as $card) {
            if (($card['id'] ?? null) === $id) {
                return $card;
            }
        }

        return null;
    }

    /**
     * @param  list<array<string, mixed>>  $cadeia
     */
    private function cardValor(array $cadeia, string $id): mixed
    {
        return $this->card($cadeia, $id)['valor'] ?? null;
    }

    /**
     * @param  list<array<string, mixed>>  $filas
     */
    private function filaCount(array $filas, string $id): ?int
    {
        foreach ($filas as $fila) {
            if (($fila['id'] ?? null) === $id) {
                return (int) $fila['count'];
            }
        }

        return null;
    }
}
