<?php

namespace Tests\Feature;

use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\NaturezaGerencial;
use App\Models\NfseTomada;
use App\Models\Parceiro;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Compras\NfseTomadaFinanceiroService;
use App\Support\ImplantacaoCatalogo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class NfseCaixaTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalogo_tem_caixa_nfse(): void
    {
        $this->assertTrue(ImplantacaoCatalogo::existe('F5_NFSE_CX'));
        $item = ImplantacaoCatalogo::porCodigo()['F5_NFSE_CX'];
        $this->assertSame('/compras/nfse-tomadas', $item['rota']);
        $this->assertSame(5, $item['onda']);
    }

    public function test_driver_off_nao_inventa_nota(): void
    {
        Permission::findOrCreate('compras.escrever', 'web');
        Permission::findOrCreate('compras.ler', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-NFSE0',
            'razao_social' => 'Empresa local',
            'nome_fantasia' => 'Local',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $user = User::query()->create([
            'codigo' => 'USR-NFSE0',
            'name' => 'Compras local',
            'email' => 'nfse.local@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['compras.ler', 'compras.escrever']);
        $user->empresas()->attach($empresa->id);
        Sanctum::actingAs($user);

        config(['erp.nfse.caixa_driver' => 'off', 'erp.stage' => 'local']);
        $h = ['X-Empresa-Id' => (string) $empresa->id];
        $sync = $this->withHeaders($h)->postJson('/api/v1/nfse-sync');
        $sync->assertOk();
        $this->assertStringContainsString('desligado', (string) $sync->json('data.sync_mensagem'));
        $lista = $this->withHeaders($h)->getJson('/api/v1/nfse-tomadas?situacao=NA_CAIXA');
        $lista->assertOk();
        $this->assertCount(0, $lista->json('data'));
    }

    public function test_sync_fake_lanca_pagar_sem_estoque_e_isola_empresa(): void
    {
        foreach (['compras.ler', 'compras.escrever', 'financeiro.escrever'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-NFSE1',
            'razao_social' => 'Empresa NFS-e',
            'nome_fantasia' => 'NFSE',
            'cnpj' => '11222333000181',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $outra = Empresa::query()->create([
            'codigo' => 'EMP-NFSE2',
            'razao_social' => 'Outra NFS-e',
            'nome_fantasia' => 'Outra',
            'cnpj' => '44555666000199',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);
        $user = User::query()->create([
            'codigo' => 'USR-NFSE1',
            'name' => 'Financeiro NFS-e',
            'email' => 'nfse@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['compras.ler', 'compras.escrever', 'financeiro.escrever']);
        $user->empresas()->attach([$empresa->id, $outra->id]);
        Sanctum::actingAs($user);

        $nat = NaturezaGerencial::query()->create([
            'codigo' => '3.04.01',
            'codigo_exibicao' => 'NAT-3.04.01',
            'grupo' => 3,
            'nivel' => 3,
            'parent_id' => null,
            'nome' => 'Serviços de terceiros',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 30401,
        ]);
        $estoque = NaturezaGerencial::query()->create([
            'codigo' => '5.06',
            'codigo_exibicao' => 'NAT-5.06',
            'grupo' => 5,
            'nivel' => 2,
            'parent_id' => null,
            'nome' => 'Compra de estoque',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 506,
        ]);
        $prestador = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-PREST',
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '00000000000191',
            'razao_social' => 'Prestador de ensaio',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
            'cadastro_fiscal_completo' => true,
        ]);

        config(['erp.nfse.caixa_driver' => 'fake']);
        $h = ['X-Empresa-Id' => (string) $empresa->id];

        $this->withHeaders($h)->postJson('/api/v1/nfse-sync')->assertOk();
        $lista = $this->withHeaders($h)->getJson('/api/v1/nfse-tomadas?situacao=NA_CAIXA');
        $lista->assertOk();
        $this->assertCount(1, $lista->json('data'));
        $id = (int) $lista->json('data.0.id');

        $this->withHeaders(['X-Empresa-Id' => (string) $outra->id])
            ->getJson('/api/v1/nfse-tomadas/'.$id)
            ->assertNotFound();

        $this->withHeaders($h)->postJson('/api/v1/nfse-tomadas/'.$id.'/lancar', [
            'natureza_id' => $estoque->id,
            'parceiro_id' => $prestador->id,
            'vencimento' => now()->addDays(10)->toDateString(),
        ])->assertStatus(422);

        $ok = $this->withHeaders($h)->postJson('/api/v1/nfse-tomadas/'.$id.'/lancar', [
            'natureza_id' => $nat->id,
            'parceiro_id' => $prestador->id,
            'vencimento' => now()->addDays(10)->toDateString(),
        ]);
        $ok->assertOk();
        $this->assertSame('VINCULADA', $ok->json('data.nota.situacao'));
        $this->assertSame(1, Titulo::query()->where('origem', NfseTomadaFinanceiroService::ORIGEM)->count());
        $this->assertSame(0, EstoqueMovimento::query()->count());
        $titulo = Titulo::query()->first();
        $this->assertNotNull($titulo);
        $this->assertSame('PAGAR', $titulo->tipo);
        $this->assertSame('150.00', (string) $titulo->valor);

        $this->withHeaders($h)->postJson('/api/v1/nfse-tomadas/'.$id.'/lancar', [
            'natureza_id' => $nat->id,
            'parceiro_id' => $prestador->id,
            'vencimento' => now()->addDays(10)->toDateString(),
        ])->assertOk();
        $this->assertSame(1, Titulo::query()->count());

        $this->withHeaders($h)->postJson('/api/v1/nfse-tomadas/'.$id.'/desfazer')->assertOk();
        $this->assertSame(NfseTomada::SITUACAO_CAIXA, NfseTomada::query()->find($id)?->situacao);
        $this->assertSame(Titulo::STATUS_CANCELADO, Titulo::query()->first()?->status);
    }
}
