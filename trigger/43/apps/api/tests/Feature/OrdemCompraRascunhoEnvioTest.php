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
}
