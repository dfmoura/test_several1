<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * AJU multi-volume via lote_payload (entrada A03/demais + baixa explícita).
 */
class EstoqueAjusteViradaVolumesTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private User $operador;

    private User $aprovador;

    private Produto $exact;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['estoque.ler', 'estoque.escrever', 'estoque.aprovar', 'estoque.aprovar_gestor'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->empresa = Empresa::query()->create([
            'codigo' => 'EMP-VIR-VOL',
            'razao_social' => 'Empresa Virada Volumes',
            'nome_fantasia' => 'Virada',
            'cnpj' => '33444555000103',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->operador = User::query()->create([
            'name' => 'Op Virada',
            'email' => 'op.virvol@test.local',
            'password' => 'secret',
            'codigo' => 'USR-VIRVOL1',
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->operador->givePermissionTo(['estoque.ler', 'estoque.escrever']);
        $this->operador->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->aprovador = User::query()->create([
            'name' => 'Apr Virada',
            'email' => 'apr.virvol@test.local',
            'password' => 'secret',
            'codigo' => 'USR-VIRVOL2',
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $this->aprovador->givePermissionTo(['estoque.ler', 'estoque.escrever', 'estoque.aprovar', 'estoque.aprovar_gestor']);
        $this->aprovador->empresas()->attach($this->empresa->id, ['padrao' => true]);

        $this->exact = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-PAP-013',
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'Exact 1000',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'estoque_minimo' => '0',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
            'controla_lote' => true,
            'controla_validade' => false,
        ]);
    }

    public function test_a03_abre_n_volumes_com_lx_c_e_saldo(): void
    {
        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        // 210×1000 = 210 M2; 330×1000 = 330 M2 → total 540
        $aju = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->exact->id,
                'motivo_codigo' => 'A03',
                'qtde_contada' => '540.0000',
                'checklist_confirmado' => true,
                'origem' => EstoqueAjuste::ORIGEM_CONTAGEM_AVULSA,
                'lote_payload' => [
                    [
                        'codigo' => 'BOB-A',
                        'largura_mm' => '210',
                        'comprimento_m' => '1000',
                    ],
                    [
                        'codigo' => 'BOB-B',
                        'largura_mm' => '330',
                        'comprimento_m' => '1000',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.motivo_codigo', 'A03')
            ->assertJsonPath('data.qtde_contada', '540.0000')
            ->assertJsonPath('data.qtde_diferenca', '540.0000')
            ->assertJsonCount(2, 'data.lote_payload');

        $ajuId = (int) $aju->json('data.id');
        $this->assertSame('210.0000', $aju->json('data.lote_payload.0.qtde'));
        $this->assertSame('330.0000', $aju->json('data.lote_payload.1.qtde'));

        Sanctum::actingAs($this->aprovador);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar", [
                'causa_raiz' => 'Saldo inicial implantação — contagem física.',
            ])
            ->assertOk()
            ->assertJsonPath('data.ajuste.status', EstoqueAjuste::STATUS_APROVADO)
            ->assertJsonPath('data.movimento.tipo', EstoqueMovimento::TIPO_AJUSTE);

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->exact->id)
            ->firstOrFail();
        $this->assertSame('540.0000', (string) $saldo->qtde);

        $lotes = EstoqueLote::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->exact->id)
            ->orderBy('codigo')
            ->get();
        $this->assertCount(2, $lotes);
        $this->assertSame('BOB-A', $lotes[0]->codigo);
        $this->assertSame('210.0000', (string) $lotes[0]->qtde);
        $this->assertSame('210.00', (string) $lotes[0]->largura_mm);
        $this->assertSame('1000.00', (string) $lotes[0]->comprimento_m);
        $this->assertSame(EstoqueLote::ORIGEM_VIRADA, $lotes[0]->origem_tipo);
        $this->assertSame('BOB-B', $lotes[1]->codigo);
        $this->assertSame('330.0000', (string) $lotes[1]->qtde);

        $movId = (int) EstoqueAjuste::query()->findOrFail($ajuId)->movimento_id;
        $etq = $this->withHeaders($h)
            ->getJson('/api/v1/estoque/lotes/etiquetas?movimento_id='.$movId)
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $etq['volumes_count']);
        $this->assertSame($movId, $etq['filtro']['movimento_id']);
        $this->assertSame(EstoqueMovimento::TIPO_AJUSTE, $etq['filtro']['movimento_tipo']);
        foreach ($etq['volumes'] as $vol) {
            $this->assertStringStartsWith('VOL:'.$this->empresa->id.':', $vol['qr_payload']);
        }
    }

    public function test_a08_abre_volumes_com_lx_c_alem_de_a03(): void
    {
        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $aju = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->exact->id,
                'motivo_codigo' => 'A08',
                'qtde_contada' => '210.0000',
                'checklist_confirmado' => true,
                'origem' => EstoqueAjuste::ORIGEM_CONTAGEM_AVULSA,
                'lote_payload' => [
                    [
                        'codigo' => 'SOBRA-1',
                        'largura_mm' => '210',
                        'comprimento_m' => '1000',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.motivo_codigo', 'A08')
            ->assertJsonPath('data.qtde_diferenca', '210.0000')
            ->assertJsonCount(1, 'data.lote_payload');

        $ajuId = (int) $aju->json('data.id');

        Sanctum::actingAs($this->aprovador);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar", [
                'causa_raiz' => 'Sobra de produção não apontada — bobina física.',
            ])
            ->assertOk();

        $lote = EstoqueLote::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->exact->id)
            ->where('codigo', 'SOBRA-1')
            ->firstOrFail();
        $this->assertSame('210.0000', (string) $lote->qtde);
        $this->assertSame(EstoqueLote::ORIGEM_AJUSTE, $lote->origem_tipo);
    }

    public function test_baixa_exige_lote_id_e_debita_volume_explicito(): void
    {
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->exact->id,
            'qtde' => '400.0000',
            'unidade' => 'M2',
            'custo_medio' => '1.0000',
        ]);

        $loteA = EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->exact->id,
            'codigo' => 'BOB-BAIXA-A',
            'data_entrada' => now()->toDateString(),
            'qtde' => '250.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_ENTRADA_COMPRA,
            'qr_token' => bin2hex(random_bytes(16)),
        ]);
        $loteB = EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->exact->id,
            'codigo' => 'BOB-BAIXA-B',
            'data_entrada' => now()->toDateString(),
            'qtde' => '150.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_ENTRADA_COMPRA,
            'qr_token' => bin2hex(random_bytes(16)),
        ]);

        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        // Contada 300 → Δ −100; baixa só no volume B
        $aju = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->exact->id,
                'motivo_codigo' => 'A04',
                'motivo_complemento' => 'Bobina B danificada na prateleira',
                'qtde_contada' => '300.0000',
                'checklist_confirmado' => true,
                'lote_payload' => [
                    ['lote_id' => $loteB->id, 'qtde' => '100.0000'],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.qtde_diferenca', '-100.0000')
            ->assertJsonPath('data.lote_payload.0.lote_id', $loteB->id);

        $ajuId = (int) $aju->json('data.id');

        Sanctum::actingAs($this->aprovador);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/ajustes/{$ajuId}/aprovar", [
                'causa_raiz' => 'Avaria física na bobina B — baixa alocada no volume.',
            ])
            ->assertOk();

        $loteA->refresh();
        $loteB->refresh();
        $this->assertSame('250.0000', (string) $loteA->qtde);
        $this->assertSame('50.0000', (string) $loteB->qtde);

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('produto_id', $this->exact->id)
            ->firstOrFail();
        $this->assertSame('300.0000', (string) $saldo->qtde);
    }

    public function test_baixa_sem_lote_id_recusada(): void
    {
        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->exact->id,
            'qtde' => '210.0000',
            'unidade' => 'M2',
            'custo_medio' => '1.0000',
        ]);

        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->exact->id,
                'motivo_codigo' => 'A04',
                'motivo_complemento' => 'Avaria sem volume',
                'qtde_contada' => '100.0000',
                'checklist_confirmado' => true,
                'lote_payload' => [
                    ['codigo' => 'X', 'qtde' => '110.0000'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['lote_payload.0.lote_id']);
    }

    public function test_soma_volumes_deve_igualar_diferenca(): void
    {
        Sanctum::actingAs($this->operador);
        $h = ['X-Empresa-Id' => (string) $this->empresa->id];

        $this->withHeaders($h)
            ->postJson('/api/v1/estoque/ajustes', [
                'produto_id' => $this->exact->id,
                'motivo_codigo' => 'A03',
                'qtde_contada' => '500.0000',
                'checklist_confirmado' => true,
                'lote_payload' => [
                    ['codigo' => 'A', 'qtde' => '210.0000'],
                    ['codigo' => 'B', 'qtde' => '200.0000'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['lote_payload']);
    }
}
