<?php

namespace Tests\Feature;

use App\Mail\OrdemCompraFornecedorMail;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OrdemCompraRascunhoEnvioTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $user;

    private Parceiro $fornecedor;

    private Produto $produto;

    /** @var list<string> */
    private const PERMS = [
        'compras.ler',
        'compras.escrever',
        'estoque.ler',
        'estoque.escrever',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        foreach (self::PERMS as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-OCR1',
            'razao_social' => 'Gráfica Teste OC',
            'nome_fantasia' => 'Gráfica OC',
            'cnpj' => '11222333000181',
            'email' => 'compras@grafica.test',
            'uf' => 'MG',
            'municipio' => 'Uberlândia',
            'ie' => '123456789',
            'crt' => 3,
            'regime' => 'NORMAL',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->fornecedor = Parceiro::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'PAR-FOR-OC',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Fornecedor Papéis LTDA',
            'nome_fantasia' => 'Papéis',
            'cnpj_cpf' => '12345678000199',
            'email' => 'vendas@papeis.test',
            'uf' => 'SP',
            'municipio' => 'São Paulo',
            'ie' => '987654321',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        $this->produto = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-BOB-01',
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'Bobina teste',
            'descricao_comercial' => 'Bobina comercial',
            'unidade_comercial' => 'KG',
            'unidade_interna' => 'KG',
            'fator_conversao' => '1',
            'custo_medio' => '0',
            'ncm' => '48114110',
            'origem' => 0,
            'situacao' => 'ATIVO',
            'estoque_minimo' => '10',
        ]);

        $this->user = User::query()->create([
            'name' => 'Compras OC',
            'email' => 'compras-oc@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->user->givePermissionTo(self::PERMS);
        $this->user->empresas()->attach([$this->empresa->id]);
    }

    public function test_criar_rascunho_editar_excluir_e_enviar_com_email(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'condicao_pagamento' => '28 DDL',
                'previsao_entrega' => '2026-09-20',
                'observacao' => 'Entregar no depósito A',
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '10.0000',
                        'valor_unitario' => '5.000000',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', OrdemCompra::STATUS_RASCUNHO)
            ->assertJsonPath('data.editavel', true)
            ->assertJsonPath('data.valor_total', '50.00');

        $ocId = (int) $oc->json('data.id');

        $this->withHeaders($h)
            ->putJson("/api/v1/ordens-compra/{$ocId}", [
                'fornecedor_id' => $this->fornecedor->id,
                'condicao_pagamento' => '14 DDL',
                'previsao_entrega' => '2026-09-22',
                'observacao' => 'Obs atualizada',
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '20.0000',
                        'valor_unitario' => '4.500000',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.valor_total', '90.00')
            ->assertJsonPath('data.condicao_pagamento', '14 DDL')
            ->assertJsonPath('data.status', OrdemCompra::STATUS_RASCUNHO);

        $envio = $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/enviar")
            ->assertOk()
            ->assertJsonPath('data.status', OrdemCompra::STATUS_ABERTA)
            ->assertJsonPath('data.editavel', false)
            ->assertJsonPath('data.email_enviado', true)
            ->assertJsonPath('data.email_destino', 'vendas@papeis.test');

        $this->assertNotNull($envio->json('data.enviado_em'));

        Mail::assertSent(OrdemCompraFornecedorMail::class, function (OrdemCompraFornecedorMail $mail) {
            return $mail->ordemCompra->id === OrdemCompra::query()->where('codigo', $mail->ordemCompra->codigo)->value('id')
                && $mail->hasTo('vendas@papeis.test');
        });

        $this->withHeaders($h)
            ->putJson("/api/v1/ordens-compra/{$ocId}", [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '1.0000',
                        'valor_unitario' => '1.000000',
                    ],
                ],
            ])
            ->assertStatus(422);

        $this->withHeaders($h)
            ->deleteJson("/api/v1/ordens-compra/{$ocId}")
            ->assertStatus(422);

        // Novo rascunho só para excluir
        $draft = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '1.0000',
                        'valor_unitario' => '1.000000',
                    ],
                ],
            ])
            ->assertCreated();

        $draftId = (int) $draft->json('data.id');
        $this->withHeaders($h)
            ->deleteJson("/api/v1/ordens-compra/{$draftId}")
            ->assertNoContent();

        $this->assertSoftDeleted('ordens_compra', ['id' => $draftId]);
    }

    public function test_enviar_sem_email_no_cadastro_ainda_formaliza(): void
    {
        Mail::fake();
        $this->fornecedor->update(['email' => null]);
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $ocId = (int) $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '2.0000',
                        'valor_unitario' => '3.000000',
                    ],
                ],
            ])
            ->assertCreated()
            ->json('data.id');

        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/enviar")
            ->assertOk()
            ->assertJsonPath('data.status', OrdemCompra::STATUS_ABERTA)
            ->assertJsonPath('data.email_enviado', false)
            ->assertJsonPath('data.email_motivo', 'sem_email_cadastro');

        Mail::assertNothingSent();
    }

    public function test_calcula_ipi_icms_e_frete_sem_alterar_mercadoria(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'valor_frete' => '25.50',
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '100.0000',
                        'valor_unitario' => '10.000000',
                        'aliq_ipi' => '10',
                        'aliq_icms' => '12',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.valor_total', '1000.00')
            ->assertJsonPath('data.valor_ipi', '100.00')
            ->assertJsonPath('data.valor_icms', '120.00')
            ->assertJsonPath('data.valor_frete', '25.50')
            ->assertJsonPath('data.valor_previsto', '1125.50')
            ->assertJsonPath('data.itens.0.aliq_ipi', '10.0000')
            ->assertJsonPath('data.itens.0.aliq_icms', '12.0000')
            ->assertJsonPath('data.itens.0.valor_ipi', '100.00')
            ->assertJsonPath('data.itens.0.valor_icms', '120.00');

        $this->assertDatabaseHas('ordens_compra', [
            'id' => $oc->json('data.id'),
            'valor_total' => '1000.00',
            'valor_ipi' => '100.00',
            'valor_icms' => '120.00',
            'valor_frete' => '25.50',
        ]);
    }

    public function test_estima_e_aplica_icms_automatico_por_uf(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra/estimar-impostos', [
                'fornecedor_id' => $this->fornecedor->id,
                'produto_ids' => [$this->produto->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.id_dest', '2')
            ->assertJsonPath('data.id_dest_label', 'Interestadual')
            ->assertJsonPath('data.itens.0.produto_id', $this->produto->id)
            ->assertJsonPath('data.itens.0.aliq_icms', '12.0000')
            ->assertJsonPath('data.itens.0.fonte_icms', 'tabela_uf');

        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '10.0000',
                        'valor_unitario' => '100.000000',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.valor_total', '1000.00')
            ->assertJsonPath('data.itens.0.aliq_icms', '12.0000')
            ->assertJsonPath('data.itens.0.valor_icms', '120.00')
            ->assertJsonPath('data.valor_icms', '120.00')
            ->assertJsonPath('data.operacao.id_dest_label', 'Interestadual')
            ->assertJsonPath('data.fornecedor.ie', '987654321')
            ->assertJsonPath('data.empresa.uf', 'MG');

        // Override manual prevalece sobre a tabela.
        $this->withHeaders($h)
            ->putJson('/api/v1/ordens-compra/'.$oc->json('data.id'), [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'qtde_pedida' => '10.0000',
                        'valor_unitario' => '100.000000',
                        'aliq_icms' => '18',
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.itens.0.aliq_icms', '18.0000')
            ->assertJsonPath('data.itens.0.valor_icms', '180.00');
    }

    public function test_composicao_deriva_qtde_pedida_e_persiste_faixas(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->produto->update([
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
        ]);

        // Espelha modelo_oc_exemplo: 30×1×1000 + 110×9×1000 + 110×6×1000 + 115×6×1000 = 2370 m²
        $oc = $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'valor_unitario' => '2.500000',
                        'composicao' => [
                            ['largura_mm' => '30', 'quantidade' => '1', 'comprimento_m' => '1000'],
                            ['largura_mm' => '110', 'quantidade' => '9', 'comprimento_m' => '1000'],
                            ['largura_mm' => '110', 'quantidade' => '6', 'comprimento_m' => '1000'],
                            ['largura_mm' => '115', 'quantidade' => '6', 'comprimento_m' => '1000'],
                        ],
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', OrdemCompra::STATUS_RASCUNHO)
            ->assertJsonPath('data.itens.0.qtde_pedida', '2370.0000')
            ->assertJsonPath('data.itens.0.unidade', 'M2')
            ->assertJsonPath('data.valor_total', '5925.00')
            ->assertJsonPath('data.itens.0.composicao.0.largura_mm', '30.00')
            ->assertJsonPath('data.itens.0.composicao.0.area_m2', '30.0000')
            ->assertJsonPath('data.itens.0.composicao.1.area_m2', '990.0000')
            ->assertJsonPath('data.itens.0.composicao.2.area_m2', '660.0000')
            ->assertJsonPath('data.itens.0.composicao.3.area_m2', '690.0000');

        $ocId = (int) $oc->json('data.id');
        $itemId = (int) $oc->json('data.itens.0.id');

        $this->assertDatabaseCount('ordem_compra_item_composicoes', 4);
        $this->assertDatabaseHas('ordem_compra_item_composicoes', [
            'ordem_compra_item_id' => $itemId,
            'largura_mm' => '30.00',
            'quantidade' => '1.0000',
            'comprimento_m' => '1000.00',
            'area_m2' => '30.0000',
        ]);

        $this->withHeaders($h)
            ->postJson("/api/v1/ordens-compra/{$ocId}/enviar")
            ->assertOk()
            ->assertJsonPath('data.email_enviado', true);

        Mail::assertSent(OrdemCompraFornecedorMail::class, function (OrdemCompraFornecedorMail $mail) {
            $payload = $mail->payload;
            $comp = $payload['itens'][0]['composicao'] ?? [];

            return count($comp) === 4
                && ($comp[0]['area_m2'] ?? null) === '30.0000'
                && ($comp[1]['largura_mm'] ?? null) === '110.00';
        });
    }

    public function test_composicao_converte_area_m2_para_unidade_comercial_kg(): void
    {
        Sanctum::actingAs($this->user);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->produto->update([
            'unidade_comercial' => 'KG',
            'unidade_interna' => 'M2',
            'fator_conversao' => '5.8800000000',
            'controla_lote' => true,
        ]);

        // 30×1×1000 = 30 m² → 30/5.88 ≈ 5.1020 KG
        $this->withHeaders($h)
            ->postJson('/api/v1/ordens-compra', [
                'fornecedor_id' => $this->fornecedor->id,
                'itens' => [
                    [
                        'produto_id' => $this->produto->id,
                        'valor_unitario' => '12.000000',
                        'composicao' => [
                            ['largura_mm' => '30', 'quantidade' => '1', 'comprimento_m' => '1000'],
                        ],
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.itens.0.qtde_pedida', '5.1020')
            ->assertJsonPath('data.itens.0.unidade', 'KG')
            ->assertJsonPath('data.itens.0.composicao.0.area_m2', '30.0000');
    }
}
