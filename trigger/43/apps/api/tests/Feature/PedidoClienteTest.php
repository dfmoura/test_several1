<?php

namespace Tests\Feature;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\User;
use App\Services\Financeiro\AdiantamentoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Pedido / OC do cliente (referência externa do comprador) no PED de venda.
 */
class PedidoClienteTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $comercial;

    private User $producao;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'producao.ler',
            'producao.escrever',
            'orcamento.ler',
            'orcamento.escrever',
            'faturamento.escrever',
        ] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-PC01',
            'razao_social' => 'RLP Pedido Cliente',
            'nome_fantasia' => 'RLP PC',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
        ]);

        $this->comercial = User::query()->create([
            'codigo' => 'USR-PC-COM',
            'name' => 'Comercial PC',
            'email' => 'comercial.pc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->comercial->givePermissionTo(['orcamento.ler', 'orcamento.escrever', 'producao.ler']);
        $this->comercial->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->producao = User::query()->create([
            'codigo' => 'USR-PC-PROD',
            'name' => 'Producao PC',
            'email' => 'producao.pc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->producao->givePermissionTo(['producao.ler', 'producao.escrever']);
        $this->producao->empresas()->attach($this->empresa->id, ['padrao' => true]);
    }

    public function test_comercial_grava_e_lista_busca_pelo_pedido_cliente(): void
    {
        $pedido = $this->pedido('PED-2026-PC001', 'ORC-2026-PC001');

        Sanctum::actingAs($this->comercial);
        $h = $this->h();

        $ok = $this->withHeaders($h)
            ->patchJson("/api/v1/pedidos/{$pedido->id}/pedido-cliente", [
                'pedido_cliente' => '  OC 4500-912  ',
            ]);
        $ok->assertOk();
        $this->assertSame('OC 4500-912', $ok->json('data.pedido_cliente'));
        $this->assertTrue($ok->json('data.pode_editar_pedido_cliente'));

        $lista = $this->withHeaders($h)->getJson('/api/v1/pedidos?q=4500-912');
        $lista->assertOk();
        $this->assertSame(['PED-2026-PC001'], array_column($lista->json('data'), 'codigo'));
        $this->assertSame('OC 4500-912', $lista->json('data.0.pedido_cliente'));
    }

    public function test_producao_nao_grava_pedido_cliente(): void
    {
        $pedido = $this->pedido('PED-2026-PC002', 'ORC-2026-PC002');

        Sanctum::actingAs($this->producao);
        $this->withHeaders($this->h())
            ->patchJson("/api/v1/pedidos/{$pedido->id}/pedido-cliente", [
                'pedido_cliente' => 'PO-1',
            ])
            ->assertForbidden();
    }

    public function test_bloqueia_edicao_apos_nf_autorizada(): void
    {
        $pedido = $this->pedido('PED-2026-PC003', 'ORC-2026-PC003');
        $pedido->status = Pedido::STATUS_FATURADO;
        $pedido->save();

        $fat = Faturamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'FAT-2026-PC003',
            'pedido_id' => $pedido->id,
            'orcamento_id' => $pedido->orcamento_id,
            'parceiro_id' => $pedido->parceiro_id,
            'status' => Faturamento::STATUS_CONFIRMADO,
            'nf_status' => Faturamento::NF_AUTORIZADA,
            'valor_bruto' => '100.00',
            'valor_adiantamento' => '0.00',
            'valor_a_cobrar' => '100.00',
            'condicao_pagamento' => 'À vista',
            'forma_pagamento' => 'PIX',
            'faturado_em' => now(),
        ]);

        DocumentoFiscalSaida::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'DFS-PC003',
            'faturamento_id' => $fat->id,
            'pedido_id' => $pedido->id,
            'parceiro_id' => $pedido->parceiro_id,
            'tipo' => DocumentoFiscalSaida::TIPO_NFE,
            'status' => DocumentoFiscalSaida::STATUS_AUTORIZADO,
            'autorizacao_origem' => DocumentoFiscalSaida::ORIGEM_STUB,
            'ref' => 'fat-pc003-nfe',
            'valor' => '100.00',
        ]);

        Sanctum::actingAs($this->comercial);
        $this->withHeaders($this->h())
            ->patchJson("/api/v1/pedidos/{$pedido->id}/pedido-cliente", [
                'pedido_cliente' => 'TARDE-DEMAIS',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['pedido_cliente']);
    }

    /**
     * @return array<string, string>
     */
    private function h(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    private function pedido(string $codigoPed, string $codigoOrc): Pedido
    {
        $cliente = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-'.substr($codigoPed, -4),
            'razao_social' => 'Cliente '.$codigoPed,
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
            'is_prospect' => false,
        ]);

        $orc = Orcamento::query()->create([
            'empresa_id' => $this->empresa->id,
            'ano' => 2026,
            'numero' => (int) substr($codigoPed, -3),
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

        PedidoItem::query()->create([
            'empresa_id' => $this->empresa->id,
            'pedido_id' => $pedido->id,
            'ordem' => 1,
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => 'PA-ETQ',
            'descricao' => 'Etiqueta',
            'qtde_pedida' => '1000.0000',
            'unidade' => 'MIL',
            'status' => PedidoItem::STATUS_PENDENTE,
        ]);

        return $pedido;
    }
}
