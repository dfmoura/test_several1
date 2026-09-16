<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Models\User;
use App\Services\Estoque\EstoqueEnderecoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Contagem avulsa por QR (volume + local) — evidência de auditoria; Writer inalterado.
 */
class EstoqueAjusteContagemQrTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $operador;

    private User $aprovador;

    private Produto $produto;

    private EstoqueEndereco $endereco;

    /** @var list<EstoqueLote> */
    private array $lotes = [];

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['estoque.ler', 'estoque.escrever', 'estoque.aprovar', 'estoque.aprovar_gestor'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-AJU-QR',
            'razao_social' => 'Empresa Ajuste QR',
            'nome_fantasia' => 'AJU QR',
            'cnpj' => '44555666000177',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->operador = User::query()->create([
            'name' => 'Op AJU QR',
            'email' => 'op.ajuqr@test.local',
            'password' => 'secret',
            'codigo' => 'USR-AJUQR1',
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->operador->givePermissionTo(['estoque.ler', 'estoque.escrever']);
        $this->operador->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->aprovador = User::query()->create([
            'name' => 'Apr AJU QR',
            'email' => 'apr.ajuqr@test.local',
            'password' => 'secret',
            'codigo' => 'USR-AJUQR2',
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->aprovador->givePermissionTo(['estoque.ler', 'estoque.escrever', 'estoque.aprovar', 'estoque.aprovar_gestor']);
        $this->aprovador->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->produto = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-PAP-QR',
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'Exact QR',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'estoque_minimo' => '0',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
            'controla_lote' => true,
            'controla_validade' => false,
        ]);

        app(EstoqueEnderecoService::class)->seedGabarito($this->empresa);
        $this->endereco = EstoqueEndereco::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('codigo', 'P01-C01-L01')
            ->firstOrFail();

        foreach ([['VOL-A', '40.0000'], ['VOL-B', '35.0000'], ['VOL-C', '25.0000']] as [$codigo, $qtde]) {
            $this->lotes[] = EstoqueLote::query()->create([
                'empresa_id' => $this->empresa->id,
                'produto_id' => $this->produto->id,
                'codigo' => $codigo,
                'data_entrada' => now()->toDateString(),
                'qtde' => $qtde,
                'unidade' => 'M2',
                'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
                'endereco_id' => $this->endereco->id,
                'qr_token' => bin2hex(random_bytes(8)),
            ]);
        }

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produto->id,
            'qtde' => '100.0000',
            'unidade' => 'M2',
            'custo_medio' => '1.000000',
        ]);
    }

    public function test_contagem_qr_gera_aju_com_evidencia_e_aprova_via_writer(): void
    {
        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $evidencia = [
            'modo' => 'QR_VOLUME_LOCAL',
            'endereco' => [
                'id' => $this->endereco->id,
                'codigo' => $this->endereco->codigo,
            ],
            'qtde_soma' => '75.0000',
            'volumes' => [
                [
                    'lote_id' => $this->lotes[0]->id,
                    'codigo' => 'VOL-A',
                    'qtde' => '40.0000',
                    'unidade' => 'M2',
                    'status' => 'ENCONTRADO',
                    'endereco_atual' => 'P01-C01-L01',
                ],
                [
                    'lote_id' => $this->lotes[1]->id,
                    'codigo' => 'VOL-B',
                    'qtde' => '35.0000',
                    'unidade' => 'M2',
                    'status' => 'ENCONTRADO',
                    'endereco_atual' => 'P01-C01-L01',
                ],
            ],
        ];

        $aju = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->produto->id,
                'motivo_codigo' => 'A01',
                'qtde_contada' => '75.0000',
                'checklist_confirmado' => true,
                'origem' => EstoqueAjuste::ORIGEM_CONTAGEM_AVULSA,
                'contagem_evidencia' => $evidencia,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', EstoqueAjuste::STATUS_PENDENTE)
            ->assertJsonPath('data.qtde_diferenca', '-25.0000')
            ->assertJsonPath('data.contagem_evidencia.modo', 'QR_VOLUME_LOCAL')
            ->assertJsonPath('data.contagem_evidencia.endereco.codigo', 'P01-C01-L01')
            ->assertJsonPath('data.contagem_evidencia.volumes.0.codigo', 'VOL-A');

        $ajuId = $aju->json('data.id');
        $this->assertNull($aju->json('data.lote_payload'));

        Sanctum::actingAs($this->aprovador);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar", [
                'causa_raiz' => 'Contagem QR — volumes faltantes no vão.',
            ])
            ->assertOk()
            ->assertJsonPath('data.ajuste.status', EstoqueAjuste::STATUS_APROVADO)
            ->assertJsonPath('data.movimento.tipo', EstoqueMovimento::TIPO_AJUSTE);

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->produto->id)
            ->firstOrFail();
        $this->assertSame('75.0000', (string) $saldo->qtde);
    }

    public function test_contagem_qr_exige_soma_igual_qtde_contada(): void
    {
        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->produto->id,
                'motivo_codigo' => 'A01',
                'qtde_contada' => '80.0000',
                'checklist_confirmado' => true,
                'contagem_evidencia' => [
                    'modo' => 'QR_VOLUME_LOCAL',
                    'endereco' => [
                        'id' => $this->endereco->id,
                        'codigo' => $this->endereco->codigo,
                    ],
                    'qtde_soma' => '75.0000',
                    'volumes' => [
                        [
                            'lote_id' => $this->lotes[0]->id,
                            'codigo' => 'VOL-A',
                            'qtde' => '40.0000',
                            'status' => 'ENCONTRADO',
                        ],
                        [
                            'lote_id' => $this->lotes[1]->id,
                            'codigo' => 'VOL-B',
                            'qtde' => '35.0000',
                            'status' => 'ENCONTRADO',
                        ],
                    ],
                ],
            ])
            ->assertStatus(422);
    }

    public function test_contagem_qr_recusada_em_a03(): void
    {
        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->produto->id,
                'motivo_codigo' => 'A03',
                'qtde_contada' => '75.0000',
                'checklist_confirmado' => true,
                'contagem_evidencia' => [
                    'modo' => 'QR_VOLUME_LOCAL',
                    'endereco' => [
                        'id' => $this->endereco->id,
                        'codigo' => $this->endereco->codigo,
                    ],
                    'qtde_soma' => '75.0000',
                    'volumes' => [
                        [
                            'lote_id' => $this->lotes[0]->id,
                            'codigo' => 'VOL-A',
                            'qtde' => '40.0000',
                            'status' => 'ENCONTRADO',
                        ],
                        [
                            'lote_id' => $this->lotes[1]->id,
                            'codigo' => 'VOL-B',
                            'qtde' => '35.0000',
                            'status' => 'ENCONTRADO',
                        ],
                    ],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['contagem_evidencia']);
    }
}
