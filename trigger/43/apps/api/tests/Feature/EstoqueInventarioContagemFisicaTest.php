<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueInventario;
use App\Models\EstoqueInventarioItem;
use App\Models\EstoqueInventarioLeitura;
use App\Models\EstoqueLote;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Models\User;
use App\Services\Estoque\EstoqueEnderecoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * Contagem física INV — QR volume + local → rollup SKU (emenda ADR-039-EST-003).
 */
class EstoqueInventarioContagemFisicaTest extends TestCase
{
    use RefreshDatabase;

    private Empresa $empresa;

    private Empresa $outraEmp;

    private User $contador1;

    private User $contador2;

    private Produto $produtoMp;

    private Produto $produtoEmb;

    private EstoqueEndereco $end1;

    private EstoqueEndereco $end2;

    private EstoqueLote $loteA;

    private EstoqueLote $loteB;

    /** @var list<string> */
    private const PERMS = [
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
            'codigo' => 'EMP-INVF1',
            'razao_social' => 'Empresa INV Fisica',
            'nome_fantasia' => 'INV Fis',
            'cnpj' => '33444555000103',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $this->outraEmp = Empresa::query()->create([
            'codigo' => 'EMP-INVF2',
            'razao_social' => 'Outra INV Fis',
            'nome_fantasia' => 'Outra',
            'cnpj' => '44555666000114',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        app(EstoqueEnderecoService::class)->seedGabarito($this->empresa);
        $this->end1 = EstoqueEndereco::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('codigo', 'P01-C01-L01')
            ->firstOrFail();
        $this->end2 = EstoqueEndereco::query()
            ->where('empresa_id', $this->empresa->id)
            ->where('codigo', 'P01-C01-L02')
            ->firstOrFail();

        $this->produtoMp = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'MP-INV-QR-001',
            'familia' => 'MP',
            'grupo' => 'MP-SUB',
            'descricao_fiscal' => 'Substrato inventário QR',
            'unidade_comercial' => 'M2',
            'unidade_interna' => 'M2',
            'fator_conversao' => '1',
            'estoque_minimo' => '0',
            'custo_medio' => '2.000000',
            'situacao' => 'ATIVO',
        ]);

        $this->produtoEmb = Produto::query()->create([
            'empresa_id' => $this->empresa->id,
            'codigo' => 'EMB-INV-QR-001',
            'familia' => 'EMB',
            'grupo' => 'EMB-TUB',
            'descricao_fiscal' => 'Tubete sem volume',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'estoque_minimo' => '0',
            'custo_medio' => '1.000000',
            'situacao' => 'ATIVO',
        ]);

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produtoMp->id,
            'qtde' => '150.0000',
            'unidade' => 'M2',
            'custo_medio' => '2.000000',
        ]);

        EstoqueSaldo::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produtoEmb->id,
            'qtde' => '40.0000',
            'unidade' => 'UN',
            'custo_medio' => '1.000000',
        ]);

        $this->loteA = EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produtoMp->id,
            'codigo' => 'VOL-INV-A',
            'data_entrada' => now()->toDateString(),
            'qtde' => '100.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
            'endereco_id' => $this->end1->id,
            'qr_token' => bin2hex(random_bytes(8)),
        ]);

        $this->loteB = EstoqueLote::query()->create([
            'empresa_id' => $this->empresa->id,
            'produto_id' => $this->produtoMp->id,
            'codigo' => 'VOL-INV-B',
            'data_entrada' => now()->toDateString(),
            'qtde' => '50.0000',
            'unidade' => 'M2',
            'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
            'endereco_id' => $this->end1->id,
            'qr_token' => bin2hex(random_bytes(8)),
        ]);

        $this->contador1 = $this->makeUser('USR-IF1', 'if1@test.local');
        $this->contador2 = $this->makeUser('USR-IF2', 'if2@test.local');
    }

    private function makeUser(string $codigo, string $email): User
    {
        $user = User::query()->create([
            'codigo' => $codigo,
            'name' => $codigo,
            'email' => $email,
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $this->empresa->id,
        ]);
        $user->givePermissionTo(self::PERMS);
        $user->empresas()->attach([$this->empresa->id, $this->outraEmp->id]);

        return $user;
    }

    private function headers(): array
    {
        return ['X-Empresa-Id' => (string) $this->empresa->id];
    }

    public function test_contagem_qr_completa_ok_e_emb_continua_decimal(): void
    {
        Sanctum::actingAs($this->contador1);
        $h = $this->headers();

        $inv = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/inventarios', [
                'tipo' => EstoqueInventario::TIPO_ROTATIVO,
                'produto_ids' => [$this->produtoMp->id, $this->produtoEmb->id],
            ])
            ->assertCreated();

        $invId = $inv->json('data.id');
        $itens = collect($inv->json('data.itens'));
        $itemMp = $itens->firstWhere('produto_id', $this->produtoMp->id);
        $itemEmb = $itens->firstWhere('produto_id', $this->produtoEmb->id);

        $this->assertSame('VOLUME', $itemMp['modo_contagem']);
        $this->assertSame('SKU', $itemEmb['modo_contagem']);
        $this->assertSame(2, $itemMp['volumes_ativos']);

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/leituras", [
                'volume_qr' => $this->loteA->qrPayload(),
                'endereco_qr' => $this->end1->qrPayload(),
                'rodada' => 1,
            ])
            ->assertCreated()
            ->assertJsonPath('data.resultado', EstoqueInventarioLeitura::RESULTADO_ENCONTRADO);

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/leituras", [
                'volume_qr' => $this->loteB->qrPayload(),
                'endereco_qr' => $this->end1->qrPayload(),
                'rodada' => 1,
            ])
            ->assertCreated();

        $fechou = $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/fechar-rodada-fisica", [
                'rodada' => 1,
            ])
            ->assertOk();

        $this->assertSame(0, $fechou->json('data.faltantes'));
        $mpAfter = collect($fechou->json('data.inventario.itens'))
            ->firstWhere('produto_id', $this->produtoMp->id);
        $this->assertSame(EstoqueInventarioItem::STATUS_OK, $mpAfter['status']);
        $this->assertSame('150.0000', $mpAfter['qtde_1']);

        // EMB sem volume: decimal manual ainda funciona.
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/itens/{$itemEmb['id']}/contar-1", [
                'qtde' => '40.0000',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', EstoqueInventarioItem::STATUS_OK);
    }

    public function test_faltante_e_local_errado(): void
    {
        Sanctum::actingAs($this->contador1);
        $h = $this->headers();

        $invId = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/inventarios', [
                'tipo' => EstoqueInventario::TIPO_ROTATIVO,
                'produto_ids' => [$this->produtoMp->id],
            ])
            ->assertCreated()
            ->json('data.id');

        // Só lê A no local errado; B fica faltante.
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/leituras", [
                'volume_qr' => $this->loteA->qrPayload(),
                'endereco_qr' => $this->end2->qrPayload(),
                'rodada' => 1,
            ])
            ->assertCreated()
            ->assertJsonPath('data.resultado', EstoqueInventarioLeitura::RESULTADO_LOCAL_ERRADO);

        $fechou = $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/fechar-rodada-fisica", [
                'rodada' => 1,
            ])
            ->assertOk();

        $this->assertSame(1, $fechou->json('data.faltantes'));
        $this->assertSame(1, $fechou->json('data.locais_errados'));

        $item = collect($fechou->json('data.inventario.itens'))->first();
        $this->assertSame(EstoqueInventarioItem::STATUS_DIVERGENTE, $item['status']);
        $this->assertSame('100.0000', $item['qtde_1']); // só volume A
    }

    public function test_isolamento_multi_empresa_na_leitura(): void
    {
        Sanctum::actingAs($this->contador1);
        $h = $this->headers();

        $invId = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/inventarios', [
                'tipo' => EstoqueInventario::TIPO_ROTATIVO,
                'produto_ids' => [$this->produtoMp->id],
            ])
            ->assertCreated()
            ->json('data.id');

        $this->withHeaders(['X-Empresa-Id' => (string) $this->outraEmp->id])
            ->postJson("/api/v1/estoque/inventarios/{$invId}/leituras", [
                'volume_qr' => $this->loteA->qrPayload(),
                'endereco_qr' => $this->end1->qrPayload(),
                'rodada' => 1,
            ])
            ->assertNotFound();
    }

    public function test_recontagem_fisica_exige_outra_pessoa(): void
    {
        Sanctum::actingAs($this->contador1);
        $h = $this->headers();

        $invId = $this->withHeaders($h)
            ->postJson('/api/v1/estoque/inventarios', [
                'tipo' => EstoqueInventario::TIPO_ROTATIVO,
                'produto_ids' => [$this->produtoMp->id],
            ])
            ->assertCreated()
            ->json('data.id');

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/leituras", [
                'volume_qr' => $this->loteA->qrPayload(),
                'endereco_qr' => $this->end1->qrPayload(),
                'rodada' => 1,
            ])
            ->assertCreated();

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/fechar-rodada-fisica", ['rodada' => 1])
            ->assertOk()
            ->assertJsonPath('data.inventario.itens.0.status', EstoqueInventarioItem::STATUS_DIVERGENTE);

        // Mesma pessoa tenta fechar 2ª com leitura do restante.
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/leituras", [
                'volume_qr' => $this->loteA->qrPayload(),
                'endereco_qr' => $this->end1->qrPayload(),
                'rodada' => 2,
            ])
            ->assertCreated();
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/leituras", [
                'volume_qr' => $this->loteB->qrPayload(),
                'endereco_qr' => $this->end1->qrPayload(),
                'rodada' => 2,
            ])
            ->assertCreated();

        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/fechar-rodada-fisica", ['rodada' => 2])
            ->assertStatus(422);

        Sanctum::actingAs($this->contador2);
        $this->withHeaders($h)
            ->postJson("/api/v1/estoque/inventarios/{$invId}/fechar-rodada-fisica", ['rodada' => 2])
            ->assertOk()
            ->assertJsonPath('data.inventario.itens.0.status', EstoqueInventarioItem::STATUS_OK);
    }
}
