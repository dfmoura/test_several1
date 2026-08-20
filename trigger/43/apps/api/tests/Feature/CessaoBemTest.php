<?php

namespace Tests\Feature;

use App\Models\BemPatrimonial;
use App\Models\CessaoBem;
use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Parceiro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CessaoBemTest extends TestCase
{
    use RefreshDatabase;

    public function test_comodato_cede_bem_sem_faturamento_nem_documento_fiscal(): void
    {
        Permission::findOrCreate('patrimonio.ler', 'web');
        Permission::findOrCreate('patrimonio.escrever', 'web');
        Permission::findOrCreate('orcamento.escrever', 'web');

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-CES1',
            'razao_social' => 'RLP ETIQUETAS',
            'nome_fantasia' => 'RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
        ]);

        $cliente = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-CES1',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Cliente Comodato',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $user = User::query()->create([
            'codigo' => 'USR-CES1',
            'name' => 'Patrimônio',
            'email' => 'ces@test.local',
            'password' => bcrypt('secret'),
            'ativo' => true,
            'empresa_default_id' => $empresa->id,
        ]);
        $user->givePermissionTo(['patrimonio.ler', 'patrimonio.escrever', 'orcamento.escrever']);
        $user->empresas()->attach($empresa->id, ['padrao' => true]);
        Sanctum::actingAs($user);
        $h = ['X-Empresa-Id' => (string) $empresa->id];

        $bem = $this->withHeaders($h)->postJson('/api/v1/bens', [
            'descricao' => 'Impressora desktop cedida',
            'categoria' => 'EQUIPAMENTO',
            'status' => 'ATIVO',
        ])->assertCreated();
        $bemId = (int) $bem->json('data.id');

        $this->withHeaders($h)->postJson('/api/v1/orcamentos/calcular', [
            'tipo_operacao' => 'CESSAO_BEM',
            'parceiro_id' => $cliente->id,
        ])->assertUnprocessable();

        $ok = $this->withHeaders($h)->postJson('/api/v1/cessoes-bem', [
            'bem_id' => $bemId,
            'parceiro_id' => $cliente->id,
            'tipo' => 'COMODATO',
            'observacao' => 'Comodato de impressora no cliente.',
        ])->assertCreated();

        $this->assertSame('COMODATO', $ok->json('data.tipo'));
        $this->assertSame('VIGENTE', $ok->json('data.status'));
        $this->assertSame('NENHUM', $ok->json('data.documento_fiscal'));
        $this->assertStringContainsString('não gera', mb_strtolower($ok->json('data.aviso_fiscal')));

        $this->assertSame(BemPatrimonial::STATUS_CEDIDO, BemPatrimonial::query()->find($bemId)?->status);
        $this->assertSame(0, Faturamento::query()->count());
        $this->assertSame(0, DocumentoFiscalSaida::query()->count());

        $this->withHeaders($h)->postJson('/api/v1/cessoes-bem', [
            'bem_id' => $bemId,
            'parceiro_id' => $cliente->id,
            'tipo' => 'COMODATO',
        ])->assertUnprocessable();

        $id = (int) $ok->json('data.id');
        $this->withHeaders($h)->postJson("/api/v1/cessoes-bem/{$id}/encerrar", [
            'motivo' => 'Cliente devolveu o equipamento',
        ])->assertOk()->assertJsonPath('data.status', CessaoBem::STATUS_ENCERRADA);

        $this->assertSame(BemPatrimonial::STATUS_ATIVO, BemPatrimonial::query()->find($bemId)?->status);
    }
}
