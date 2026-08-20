<?php

namespace Tests\Feature;

use App\Models\BemPatrimonial;
use App\Models\CodigoSequence;
use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Higiene operacional: documentos saem; plataforma, BEM e audit_log ficam.
 * Estudo 32 — virada por cadastro + saldo; nunca apagar auditoria.
 */
class LimparDadosOperacionaisTest extends TestCase
{
    use RefreshDatabase;

    public function test_limpa_documentos_e_preserva_admin_plataforma_e_audit(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP Etiquetas',
            'nome_fantasia' => 'RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $adminPar = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-00001',
            'tipo_pessoa' => 'PF',
            'razao_social' => 'Administrador RLP',
            'papel_colaborador' => true,
            'situacao' => 'ATIVO',
        ]);

        $admin = User::query()->create([
            'name' => 'Administrador RLP',
            'email' => 'admin@rlp.com.br',
            'password' => 'secret',
            'codigo' => 'USR-00001',
            'ativo' => true,
            'parceiro_id' => $adminPar->id,
            'empresa_default_id' => $empresa->id,
        ]);
        $admin->empresas()->attach($empresa->id, ['padrao' => true]);

        $extraPar = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-00099',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Cliente Teste LTDA',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $extraUser = User::query()->create([
            'name' => 'Comercial extra',
            'email' => 'extra@rlp.com.br',
            'password' => 'secret',
            'codigo' => 'USR-00099',
            'ativo' => true,
            'parceiro_id' => $extraPar->id,
            'empresa_default_id' => $empresa->id,
        ]);
        $extraUser->empresas()->attach($empresa->id, ['padrao' => true]);

        Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'MP-PAP-999',
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'Papel teste',
            'unidade_comercial' => 'UN',
            'unidade_interna' => 'UN',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        DB::table('orcamentos')->insert([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 7,
            'codigo' => 'ORC-2026-00007',
            'versao' => 1,
            'parceiro_id' => $extraPar->id,
            'cliente_nome' => 'Cliente Teste LTDA',
            'status' => 'RASCUNHO',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        BemPatrimonial::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'BEM-00001',
            'descricao' => 'Betaflex',
            'categoria' => BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA,
            'status' => BemPatrimonial::STATUS_ATIVO,
            'fornecedor_id' => $extraPar->id,
            'responsavel_user_id' => $extraUser->id,
        ]);

        DB::table('audit_logs')->insert([
            'empresa_id' => $empresa->id,
            'user_id' => $extraUser->id,
            'acao' => 'CRIAR',
            'entidade' => 'orcamento',
            'entidade_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        CodigoSequence::query()->create([
            'empresa_id' => $empresa->id,
            'prefixo' => 'PAR',
            'proximo' => 100,
        ]);
        CodigoSequence::query()->create([
            'empresa_id' => null,
            'prefixo' => 'USR',
            'proximo' => 100,
        ]);
        CodigoSequence::query()->create([
            'empresa_id' => $empresa->id,
            'prefixo' => 'ORC-2026',
            'proximo' => 8,
        ]);
        CodigoSequence::query()->create([
            'empresa_id' => $empresa->id,
            'prefixo' => 'PED-2026',
            'proximo' => 4,
        ]);
        CodigoSequence::query()->create([
            'empresa_id' => $empresa->id,
            'prefixo' => 'MP-PAP',
            'proximo' => 50,
        ]);
        CodigoSequence::query()->create([
            'empresa_id' => $empresa->id,
            'prefixo' => 'FAC-RETA',
            'proximo' => 3,
        ]);
        CodigoSequence::query()->create([
            'empresa_id' => null,
            'prefixo' => 'BEM',
            'proximo' => 8,
        ]);

        $this->artisan('erp:limpar-operacional', ['--force' => true])
            ->assertSuccessful();

        $this->assertDatabaseHas('users', ['id' => $admin->id, 'email' => 'admin@rlp.com.br']);
        $this->assertDatabaseHas('parceiros', ['id' => $adminPar->id, 'codigo' => 'PAR-00001']);
        $this->assertDatabaseMissing('users', ['email' => 'extra@rlp.com.br']);
        $this->assertDatabaseMissing('parceiros', ['codigo' => 'PAR-00099']);
        $this->assertSame(0, DB::table('orcamentos')->count());
        $this->assertSame(0, DB::table('produtos')->count());
        $this->assertSame(1, DB::table('audit_logs')->count());
        $this->assertDatabaseHas('empresas', ['codigo' => 'EMP-00001']);
        $this->assertDatabaseHas('bens_patrimoniais', ['codigo' => 'BEM-00001']);

        $bem = BemPatrimonial::query()->where('codigo', 'BEM-00001')->first();
        $this->assertNotNull($bem);
        $this->assertNull($bem->fornecedor_id);
        $this->assertNull($bem->responsavel_user_id);

        $this->assertSame(2, (int) CodigoSequence::query()->where('prefixo', 'PAR')->value('proximo'));
        $this->assertSame(2, (int) CodigoSequence::query()->where('prefixo', 'USR')->value('proximo'));
        $this->assertSame(1, (int) CodigoSequence::query()->where('prefixo', 'ORC-2026')->value('proximo'));
        $this->assertSame(1, (int) CodigoSequence::query()->where('prefixo', 'PED-2026')->value('proximo'));
        $this->assertSame(1, (int) CodigoSequence::query()->where('prefixo', 'MP-PAP')->value('proximo'));
        $this->assertSame(1, (int) CodigoSequence::query()->where('prefixo', 'FAC-RETA')->value('proximo'));
        $this->assertSame(8, (int) CodigoSequence::query()->where('prefixo', 'BEM')->value('proximo'));
    }

    public function test_dry_run_nao_altera_nada(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);

        $par = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-00001',
            'tipo_pessoa' => 'PF',
            'razao_social' => 'Admin',
            'situacao' => 'ATIVO',
        ]);

        $admin = User::query()->create([
            'name' => 'Admin',
            'email' => 'admin@rlp.com.br',
            'password' => 'secret',
            'codigo' => 'USR-00001',
            'ativo' => true,
            'parceiro_id' => $par->id,
            'empresa_default_id' => $empresa->id,
        ]);

        Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'SVC-001',
            'familia' => 'SVC',
            'descricao_fiscal' => 'Serviço',
            'unidade_comercial' => 'UN',
            'situacao' => 'ATIVO',
        ]);

        $this->artisan('erp:limpar-operacional', ['--dry-run' => true])
            ->assertSuccessful();

        $this->assertSame(1, Produto::query()->count());
        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }
}
