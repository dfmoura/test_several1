<?php

namespace Tests\Feature;

use App\Models\CodigoSequence;
use App\Models\Empresa;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\Titulo;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Lab: limpa PED/OP/FAT/receber da EMP e devolve ORCs a "Em preparação".
 */
class LimparCadeiaPosOrcTest extends TestCase
{
    use RefreshDatabase;

    public function test_limpa_cadeia_e_repor_orc_em_preparacao(): void
    {
        config(['erp.stage' => 'local', 'app.env' => 'local']);

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP Etiquetas',
            'nome_fantasia' => 'RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $outra = Empresa::query()->create([
            'codigo' => 'EMP-00002',
            'razao_social' => 'Outra EMP',
            'cnpj' => '00000000000191',
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $nat = NaturezaGerencial::query()->create([
            'codigo' => '1.01.02',
            'codigo_exibicao' => 'NAT-1.01.02',
            'grupo' => 1,
            'nivel' => 3,
            'parent_id' => null,
            'nome' => 'Venda de produto',
            'aceita_lancamento' => true,
            'ativo' => true,
            'ordenacao' => 102,
        ]);

        $par = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-00001',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Cliente Teste',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        $par2 = Parceiro::query()->create([
            'empresa_id' => $outra->id,
            'codigo' => 'PAR-00001',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Cliente Outra',
            'papel_cliente' => true,
            'situacao' => 'ATIVO',
        ]);

        User::query()->create([
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
            'codigo' => 'MP-PAP-001',
            'familia' => 'MP',
            'grupo' => 'MP-PAP',
            'descricao_fiscal' => 'Papel',
            'unidade_comercial' => 'KG',
            'unidade_interna' => 'KG',
            'fator_conversao' => '1',
            'situacao' => 'ATIVO',
        ]);

        $orcAprovadoId = DB::table('orcamentos')->insertGetId([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 7,
            'codigo' => 'ORC-2026-00007',
            'versao' => 1,
            'parceiro_id' => $par->id,
            'cliente_nome' => 'Cliente Teste',
            'status' => Orcamento::STATUS_APROVADO,
            'result_snapshot' => json_encode(['ok' => true]),
            'financeiro_status' => 'LIBERADO',
            'enviado_em' => now(),
            'decidido_em' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $orcRascunhoId = DB::table('orcamentos')->insertGetId([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 8,
            'codigo' => 'ORC-2026-00008',
            'versao' => 1,
            'parceiro_id' => $par->id,
            'cliente_nome' => 'Cliente Teste',
            'status' => Orcamento::STATUS_RASCUNHO,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $orcOutraId = DB::table('orcamentos')->insertGetId([
            'empresa_id' => $outra->id,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-2026-00001',
            'versao' => 1,
            'parceiro_id' => $par2->id,
            'cliente_nome' => 'Cliente Outra',
            'status' => Orcamento::STATUS_APROVADO,
            'result_snapshot' => json_encode(['ok' => true]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $pedId = DB::table('pedidos')->insertGetId([
            'empresa_id' => $empresa->id,
            'codigo' => 'PED-2026-00001',
            'orcamento_id' => $orcAprovadoId,
            'parceiro_id' => $par->id,
            'status' => 'FATURADO',
            'faixa_index' => 0,
            'tolerancia_qtd_pct' => 20,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $pedItemId = DB::table('pedido_itens')->insertGetId([
            'empresa_id' => $empresa->id,
            'pedido_id' => $pedId,
            'ordem' => 1,
            'necessidade' => 'PRODUCAO',
            'familia_fiscal' => 'PA-ETQ',
            'descricao' => 'Etiqueta',
            'qtde_pedida' => '1000.0000',
            'qtde_produzida' => '1000.0000',
            'qtde_faturavel' => '1000.0000',
            'unidade' => 'MIL',
            'status' => 'PRODUZIDO',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('ordens_producao')->insert([
            'empresa_id' => $empresa->id,
            'codigo' => 'OP-2026-00001',
            'pedido_id' => $pedId,
            'pedido_item_id' => $pedItemId,
            'status' => 'CONCLUIDA',
            'qtde_planejada' => '1000.0000',
            'qtde_boa' => '1000.0000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $pedOutraId = DB::table('pedidos')->insertGetId([
            'empresa_id' => $outra->id,
            'codigo' => 'PED-2026-00001',
            'orcamento_id' => $orcOutraId,
            'parceiro_id' => $par2->id,
            'status' => 'LIBERADO',
            'faixa_index' => 0,
            'tolerancia_qtd_pct' => 20,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $fatId = DB::table('faturamentos')->insertGetId([
            'empresa_id' => $empresa->id,
            'codigo' => 'FAT-2026-00001',
            'pedido_id' => $pedId,
            'orcamento_id' => $orcAprovadoId,
            'parceiro_id' => $par->id,
            'status' => 'CONFIRMADO',
            'nf_status' => 'PENDENTE',
            'valor_bruto' => '100.00',
            'valor_adiantamento' => '0.00',
            'valor_a_cobrar' => '100.00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('faturamento_itens')->insert([
            'empresa_id' => $empresa->id,
            'faturamento_id' => $fatId,
            'pedido_item_id' => $pedItemId,
            'ordem' => 1,
            'descricao' => 'Etiqueta',
            'qtde' => '1000.0000',
            'valor' => '100.00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $titReceberId = DB::table('titulos')->insertGetId([
            'empresa_id' => $empresa->id,
            'codigo' => 'TIT-2026-00001',
            'tipo' => Titulo::TIPO_RECEBER,
            'parceiro_id' => $par->id,
            'natureza_id' => $nat->id,
            'orcamento_id' => $orcAprovadoId,
            'pedido_id' => $pedId,
            'faturamento_id' => $fatId,
            'emissao' => now()->toDateString(),
            'vencimento' => now()->toDateString(),
            'valor' => '100.00',
            'saldo' => '100.00',
            'status' => Titulo::STATUS_ABERTO,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $titPagarId = DB::table('titulos')->insertGetId([
            'empresa_id' => $empresa->id,
            'codigo' => 'TIT-2026-00099',
            'tipo' => Titulo::TIPO_PAGAR,
            'parceiro_id' => $par->id,
            'natureza_id' => $nat->id,
            'emissao' => now()->toDateString(),
            'vencimento' => now()->toDateString(),
            'valor' => '50.00',
            'saldo' => '50.00',
            'status' => Titulo::STATUS_ABERTO,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (DB::getSchemaBuilder()->hasTable('orcamento_links_aprovacao')) {
            DB::table('orcamento_links_aprovacao')->insert([
                'orcamento_id' => $orcAprovadoId,
                'token' => str_repeat('a', 64),
                'ativo' => true,
                'expira_em' => now()->addDay(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        CodigoSequence::query()->create([
            'empresa_id' => $empresa->id,
            'prefixo' => 'PED-2026',
            'proximo' => 9,
        ]);
        CodigoSequence::query()->create([
            'empresa_id' => $empresa->id,
            'prefixo' => 'ORC-2026',
            'proximo' => 20,
        ]);

        DB::table('audit_logs')->insert([
            'empresa_id' => $empresa->id,
            'acao' => 'CRIAR',
            'entidade' => 'pedido',
            'entidade_id' => $pedId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('erp:limpar-cadeia-pos-orc', [
            '--empresa' => 'EMP-00001',
            '--force' => true,
        ])->assertSuccessful();

        $this->assertSame(0, DB::table('pedidos')->where('empresa_id', $empresa->id)->count());
        $this->assertSame(0, DB::table('ordens_producao')->where('empresa_id', $empresa->id)->count());
        $this->assertSame(0, DB::table('faturamentos')->where('empresa_id', $empresa->id)->count());
        $this->assertDatabaseMissing('titulos', ['id' => $titReceberId]);
        $this->assertDatabaseHas('titulos', ['id' => $titPagarId, 'tipo' => Titulo::TIPO_PAGAR]);

        $orcAprovado = DB::table('orcamentos')->where('id', $orcAprovadoId)->first();
        $this->assertSame(Orcamento::STATUS_CALCULADO, $orcAprovado->status);
        $this->assertNull($orcAprovado->financeiro_status);
        $this->assertNull($orcAprovado->enviado_em);
        $this->assertNull($orcAprovado->decidido_em);

        $orcRascunho = DB::table('orcamentos')->where('id', $orcRascunhoId)->first();
        $this->assertSame(Orcamento::STATUS_RASCUNHO, $orcRascunho->status);

        $this->assertSame(1, DB::table('pedidos')->where('empresa_id', $outra->id)->count());
        $this->assertSame(Orcamento::STATUS_APROVADO, DB::table('orcamentos')->where('id', $orcOutraId)->value('status'));
        $this->assertSame(1, Produto::query()->where('empresa_id', $empresa->id)->count());
        $this->assertSame(1, DB::table('audit_logs')->where('empresa_id', $empresa->id)->count());
        $this->assertSame(1, (int) CodigoSequence::query()->where('prefixo', 'PED-2026')->value('proximo'));
        $this->assertSame(9, (int) CodigoSequence::query()->where('prefixo', 'ORC-2026')->value('proximo'));
    }

    public function test_dry_run_nao_altera(): void
    {
        config(['erp.stage' => 'local', 'app.env' => 'local']);

        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-00001',
            'razao_social' => 'RLP',
            'cnpj' => '01423183000110',
            'situacao' => 'ATIVA',
        ]);

        $par = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'PAR-00001',
            'tipo_pessoa' => 'PJ',
            'razao_social' => 'Cliente',
            'situacao' => 'ATIVO',
        ]);

        DB::table('orcamentos')->insert([
            'empresa_id' => $empresa->id,
            'ano' => 2026,
            'numero' => 1,
            'codigo' => 'ORC-2026-00001',
            'versao' => 1,
            'parceiro_id' => $par->id,
            'cliente_nome' => 'Cliente',
            'status' => Orcamento::STATUS_APROVADO,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('erp:limpar-cadeia-pos-orc', [
            '--empresa' => 'EMP-00001',
            '--dry-run' => true,
        ])->assertSuccessful();

        $this->assertSame(Orcamento::STATUS_APROVADO, DB::table('orcamentos')->value('status'));
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

        $this->artisan('erp:limpar-cadeia-pos-orc', [
            '--empresa' => 'EMP-00001',
            '--force' => true,
        ])->assertFailed();
    }
}
