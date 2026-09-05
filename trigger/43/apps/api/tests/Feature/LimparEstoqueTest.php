<?php

namespace Tests\Feature;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Lab: zera ledger de estoque da EMP sem apagar cadastro / plataforma.
 */
class LimparEstoqueTest extends TestCase
{
    use RefreshDatabase;

    public function test_zera_ledger_preserva_produto_e_endereco(): void
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

        $par = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-00001',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Fornecedor Teste',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
        ]);

        $user = User::query()->create([
            'name' => 'Admin',
            'email' => 'admin@rlp.com.br',
            'password' => 'secret',
            'codigo' => 'USR-00001',
            'ativo' => true,
            'parceiro_id' => $par->id,
            'empresa_default_id' => $empresa->id,
        ]);

        $produto = Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'MP-PAP-001',
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'Papel teste',
            'unidade_comercial' => 'KG',
            'unidade_interna' => 'KG',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        $endId = null;
        if (DB::getSchemaBuilder()->hasTable('estoque_enderecos')) {
            $endId = DB::table('estoque_enderecos')->insertGetId([
                'empresa_id' => $empresa->id,
                'codigo' => 'P01-C01-V01',
                'prateleira' => 1,
                'coluna' => 1,
                'vao' => 1,
                'largura_m' => '1.500',
                'profundidade_m' => '0.600',
                'altura_m' => '1.000',
                'ativo' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $loteId = DB::table('estoque_lotes')->insertGetId([
            'empresa_id' => $empresa->id,
            'produto_id' => $produto->id,
            'codigo' => 'L-001',
            'data_entrada' => now()->toDateString(),
            'qtde' => '100.0000',
            'unidade' => 'KG',
            'origem_tipo' => 'AJUSTE',
            'origem_id' => null,
            'endereco_id' => $endId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('estoque_saldos')->insert([
            'empresa_id' => $empresa->id,
            'produto_id' => $produto->id,
            'qtde' => '100.0000',
            'unidade' => 'KG',
            'custo_medio' => '10.000000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $ajuId = DB::table('estoque_ajustes')->insertGetId([
            'empresa_id' => $empresa->id,
            'codigo' => 'AJU-00001',
            'produto_id' => $produto->id,
            'origem' => 'VIRADA',
            'motivo_codigo' => 'A03',
            'status' => 'APROVADO',
            'qtde_sistema' => '0.0000',
            'qtde_contada' => '100.0000',
            'qtde_diferenca' => '100.0000',
            'unidade' => 'KG',
            'checklist_confirmado' => true,
            'solicitado_por' => $user->id,
            'aprovado_por' => $user->id,
            'aprovado_em' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $movId = DB::table('estoque_movimentos')->insertGetId([
            'empresa_id' => $empresa->id,
            'codigo' => 'MOV-00001',
            'tipo' => 'AJUSTE',
            'ajuste_id' => $ajuId,
            'conferido_em' => now(),
            'conferido_por' => $user->id,
            'criado_por' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('estoque_ajustes')->where('id', $ajuId)->update(['movimento_id' => $movId]);

        DB::table('estoque_movimento_itens')->insert([
            'movimento_id' => $movId,
            'produto_id' => $produto->id,
            'lote_id' => $loteId,
            'qtde' => '100.0000',
            'unidade' => 'KG',
            'valor_unitario' => '10.000000',
            'valor_total' => '1000.00',
            'custo_medio_apos' => '10.000000',
            'ordem' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $ocId = DB::table('ordens_compra')->insertGetId([
            'empresa_id' => $empresa->id,
            'codigo' => 'OC-00001',
            'fornecedor_id' => $par->id,
            'origem' => OrdemCompra::ORIGEM_DIRETA,
            'status' => OrdemCompra::STATUS_RECEBIDA,
            'valor_total' => '0.00',
            'criado_por' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('ordem_compra_itens')->insert([
            'ordem_compra_id' => $ocId,
            'produto_id' => $produto->id,
            'qtde_pedida' => '50.0000',
            'qtde_recebida' => '50.0000',
            'unidade' => 'KG',
            'valor_unitario' => '10.000000',
            'valor_total' => '500.00',
            'ordem' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (DB::getSchemaBuilder()->hasTable('dfe_documentos')) {
            DB::table('dfe_documentos')->insert([
                'empresa_id' => $empresa->id,
                'nsu' => '1',
                'schema_dfe' => 'resNFe',
                'chave' => str_repeat('1', 44),
                'situacao' => DfeDocumento::SITUACAO_RECEBIDA,
                'ordem_compra_id' => $ocId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('codigo_sequences')->insert([
            'empresa_id' => $empresa->id,
            'prefixo' => 'MOV',
            'proximo' => 9,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('erp:limpar-estoque', [
            '--empresa' => 'EMP-00001',
            '--force' => true,
        ])->assertSuccessful();

        $this->assertSame(0, (int) DB::table('estoque_saldos')->where('empresa_id', $empresa->id)->count());
        $this->assertSame(0, (int) DB::table('estoque_lotes')->where('empresa_id', $empresa->id)->count());
        $this->assertSame(0, (int) DB::table('estoque_movimentos')->where('empresa_id', $empresa->id)->count());
        $this->assertSame(0, (int) DB::table('estoque_ajustes')->where('empresa_id', $empresa->id)->count());
        $this->assertSame(1, (int) DB::table('produtos')->where('empresa_id', $empresa->id)->count());
        if ($endId !== null) {
            $this->assertSame(1, (int) DB::table('estoque_enderecos')->where('empresa_id', $empresa->id)->count());
        }

        $oc = DB::table('ordens_compra')->where('id', $ocId)->first();
        $this->assertSame(OrdemCompra::STATUS_ABERTA, $oc->status);
        $this->assertSame(0, bccomp((string) DB::table('ordem_compra_itens')->where('ordem_compra_id', $ocId)->value('qtde_recebida'), '0', 4));

        if (DB::getSchemaBuilder()->hasTable('dfe_documentos')) {
            $this->assertSame(
                DfeDocumento::SITUACAO_AMARRADA,
                DB::table('dfe_documentos')->where('ordem_compra_id', $ocId)->value('situacao')
            );
        }

        $this->assertSame(1, (int) DB::table('codigo_sequences')->where('empresa_id', $empresa->id)->where('prefixo', 'MOV')->value('proximo'));
    }

    public function test_dry_run_nao_altera(): void
    {
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);

        $produto = Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'MP-PAP-001',
            'familia' => 'MP',
            'descricao_fiscal' => 'Papel',
            'unidade_comercial' => 'KG',
            'situacao' => 'ATIVO',
        ]);

        DB::table('estoque_saldos')->insert([
            'empresa_id' => $empresa->id,
            'produto_id' => $produto->id,
            'qtde' => '10.0000',
            'unidade' => 'KG',
            'custo_medio' => '1.000000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('erp:limpar-estoque', [
            '--empresa' => 'EMP-00001',
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertSame(1, (int) DB::table('estoque_saldos')->where('empresa_id', $empresa->id)->count());
    }

    public function test_recusa_production(): void
    {
        config(['erp.stage' => 'production', 'app.env' => 'production']);

        Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);

        $this->artisan('erp:limpar-estoque', [
            '--empresa' => 'EMP-00001',
            '--force' => true,
        ])->assertFailed();
    }
}
