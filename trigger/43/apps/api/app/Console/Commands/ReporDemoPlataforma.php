<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Remove EMPs e contas self-service de ensaio. Mantém o demo do seed (EMP-00001/00002 + usuários RLP).
 */
class ReporDemoPlataforma extends Command
{
    protected $signature = 'plataforma:repor-demo
                            {--dry-run : Inventaria; não apaga}
                            {--force : Executa sem confirmação}';

    protected $description = 'Remove empresas e contas auto-cadastradas; deixa só o demo (EMP-00001 e EMP-00002)';

    /** @var list<string> */
    private const DEMO_EMPRESAS = ['EMP-00001', 'EMP-00002'];

    /** @var list<string> */
    private const DEMO_EMAILS = [
        'admin@rlp.com.br',
        'comercial@rlp.com.br',
        'financeiro@rlp.com.br',
        'fiscal@rlp.com.br',
        'producao@rlp.com.br',
        'compras@rlp.com.br',
        'consulta@rlp.com.br',
    ];

    /** Documentos de ensaio — no seed demo não há ORC/PED/TIT. */
    private const DOCUMENT_TABLES = [
        'cobrancas',
        'comissoes',
        'comissao_fechamentos',
        'titulo_baixas',
        'titulos',
        'faturamento_itens',
        'documento_fiscal_saidas',
        'entregas',
        'faturamentos',
        'orcamento_links_aprovacao',
        'matriz_cobradas',
        'ordem_producao_materiais',
        'ordens_producao',
        'ordens_servico',
        'pedido_itens',
        'pedidos',
        'orcamentos',
        'webhook_inbox',
    ];

    /** PAR do seed em EMP-00001. EMP-00002 não tem parceiro no seed. */
    private const DEMO_PAR_EMP1 = [
        'PAR-00001', 'PAR-00002', 'PAR-00003', 'PAR-00004', 'PAR-00005', 'PAR-00006', 'PAR-00007',
        'PAR-00010', 'PAR-00011',
    ];
    private const PURGE_TABLES = [
        'cobrancas',
        'comissoes',
        'comissao_fechamentos',
        'titulo_baixas',
        'titulos',
        'faturamento_itens',
        'documento_fiscal_saidas',
        'entregas',
        'faturamentos',
        'orcamento_links_aprovacao',
        'matriz_cobradas',
        'ordem_producao_materiais',
        'ordens_producao',
        'ordens_servico',
        'pedido_itens',
        'pedidos',
        'orcamentos',
        'cessoes_bem',
        'estoque_movimento_itens',
        'nfe_entrada_itens',
        'nfe_entradas',
        'estoque_movimentos',
        'estoque_ajustes',
        'estoque_inventario_itens',
        'estoque_inventarios',
        'estoque_lotes',
        'estoque_saldos',
        'ordem_compra_itens',
        'ordens_compra',
        'cotacao_propostas',
        'cotacao_itens',
        'cotacoes',
        'compra_necessidades',
        'produto_fornecedor_codigos',
        'produtos',
        'parceiro_contatos',
        'parceiro_contas_bancarias',
        'parceiro_enderecos_entrega',
        'parceiro_fiscal_historicos',
        'webhook_inbox',
        'empresa_bank_credentials',
        'empresa_ativacoes',
        'empresa_fiscal_historicos',
        'bens_patrimoniais',
        'orc_catalogo_faixas_frete',
        'orc_catalogo_papeis',
        'orc_catalogo_acabamentos',
        'orc_catalogo_tipos_troca',
        'orc_catalogo_maquinas',
        'orc_catalogo_parametros',
        'orc_mapa_facas',
        'parametros_empresa',
        'fiscal_hubs',
        'departamentos',
        'naturezas_gerenciais',
        'empresa_contas_financeiras',
        'codigo_sequences',
        'parceiros',
    ];

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $keepEmpIds = DB::table('empresas')
            ->whereIn('codigo', self::DEMO_EMPRESAS)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (count($keepEmpIds) < 1) {
            $this->error('Demo EMP-00001 não encontrado. Abortado.');

            return self::FAILURE;
        }

        $extraEmpIds = DB::table('empresas')
            ->whereNotIn('codigo', self::DEMO_EMPRESAS)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $adminEmail = strtolower((string) config('erp.admin_email', 'admin@rlp.com.br'));
        $keepEmails = array_values(array_unique(array_map('strtolower', array_merge(self::DEMO_EMAILS, [$adminEmail]))));

        $extraUserIds = DB::table('users')
            ->whereNotIn('email', $keepEmails)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $this->info('Preservar empresas: '.implode(', ', self::DEMO_EMPRESAS));
        $this->line('  ids: '.(implode(', ', $keepEmpIds) ?: '—'));
        $this->info('Remover empresas: '.count($extraEmpIds).' · contas: '.count($extraUserIds));
        if ($extraEmpIds !== []) {
            foreach (DB::table('empresas')->whereIn('id', $extraEmpIds)->orderBy('id')->get(['codigo', 'cnpj', 'razao_social']) as $row) {
                $this->line("  - {$row->codigo}  {$row->cnpj}  {$row->razao_social}");
            }
        }
        if ($extraUserIds !== []) {
            foreach (DB::table('users')->whereIn('id', $extraUserIds)->orderBy('id')->get(['codigo', 'email']) as $row) {
                $this->line("  - {$row->codigo}  {$row->email}");
            }
        }

        if ($dry) {
            $this->warn('Dry-run: nenhuma alteração.');

            return self::SUCCESS;
        }

        if (! $force && ! $this->confirm('Apagar empresas e contas fora do demo?', false)) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($extraEmpIds, $extraUserIds, $keepEmpIds) {
            $this->purgeUsers($extraUserIds, $keepEmpIds);
            if ($extraEmpIds !== []) {
                $this->purgeEmpresas($extraEmpIds, $keepEmpIds);
            }
            $this->stripEnsaiosDoDemo($keepEmpIds);
            $this->resetEmpSequence();
        });

        $this->info('Demo restaurado: só EMP-00001 e EMP-00002 (seed).');
        foreach (DB::table('empresas')->whereIn('codigo', self::DEMO_EMPRESAS)->orderBy('codigo')->get(['codigo', 'cnpj', 'razao_social']) as $row) {
            $this->line("  {$row->codigo}  {$row->cnpj}  {$row->razao_social}");
        }
        $this->comment('Estes dois CNPJs não servem para testar o cadastro novo — use outro.');

        return self::SUCCESS;
    }

    /**
     * @param  list<int>  $userIds
     * @param  list<int>  $keepEmpIds
     */
    private function purgeUsers(array $userIds, array $keepEmpIds): void
    {
        if ($userIds === []) {
            return;
        }

        if (Schema::hasTable('personal_access_tokens')) {
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->whereIn('tokenable_id', $userIds)
                ->delete();
        }
        if (Schema::hasTable('sessions')) {
            DB::table('sessions')->whereIn('user_id', $userIds)->delete();
        }
        if (Schema::hasTable('model_has_roles')) {
            DB::table('model_has_roles')->where('model_type', User::class)->whereIn('model_id', $userIds)->delete();
        }
        if (Schema::hasTable('model_has_permissions')) {
            DB::table('model_has_permissions')->where('model_type', User::class)->whereIn('model_id', $userIds)->delete();
        }
        if (Schema::hasTable('conta_ativacoes')) {
            DB::table('conta_ativacoes')->whereIn('user_id', $userIds)->delete();
        }
        if (Schema::hasTable('empresa_user')) {
            DB::table('empresa_user')->whereIn('user_id', $userIds)->delete();
            DB::table('empresa_user')->whereNotIn('empresa_id', $keepEmpIds)->delete();
        }

        $n = DB::table('users')->whereIn('id', $userIds)->delete();
        $this->line("· users removidos: {$n}");
    }

    /**
     * @param  list<int>  $empresaIds
     * @param  list<int>  $keepEmpIds
     */
    private function purgeEmpresas(array $empresaIds, array $keepEmpIds): void
    {
        $parceiroIds = [];
        if (Schema::hasTable('parceiros')) {
            $parceiroIds = DB::table('parceiros')->whereIn('empresa_id', $empresaIds)->pluck('id')->all();
        }

        foreach (['parceiro_contatos', 'parceiro_contas_bancarias', 'parceiro_enderecos_entrega', 'parceiro_fiscal_historicos'] as $sat) {
            if ($parceiroIds !== [] && Schema::hasTable($sat)) {
                DB::table($sat)->whereIn('parceiro_id', $parceiroIds)->delete();
            }
        }

        if (Schema::hasTable('parceiros') && Schema::hasColumn('parceiros', 'vendedor_parceiro_id') && $parceiroIds !== []) {
            DB::table('parceiros')->whereIn('id', $parceiroIds)->update(['vendedor_parceiro_id' => null]);
        }

        foreach (self::PURGE_TABLES as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'empresa_id')) {
                continue;
            }
            $n = DB::table($table)->whereIn('empresa_id', $empresaIds)->delete();
            if ($n > 0) {
                $this->line("· {$table}: {$n}");
            }
        }

        if (Schema::hasTable('empresa_user')) {
            DB::table('empresa_user')->whereIn('empresa_id', $empresaIds)->delete();
        }

        $fallback = $keepEmpIds[0] ?? null;
        if ($fallback !== null && Schema::hasColumn('users', 'empresa_default_id')) {
            DB::table('users')
                ->whereIn('empresa_default_id', $empresaIds)
                ->update(['empresa_default_id' => $fallback]);
        }

        if (Schema::hasTable('audit_logs') && Schema::hasColumn('audit_logs', 'empresa_id')) {
            DB::table('audit_logs')->whereIn('empresa_id', $empresaIds)->update(['empresa_id' => null]);
        }

        $n = DB::table('empresas')->whereIn('id', $empresaIds)->delete();
        $this->line("· empresas removidas: {$n}");
    }

    /**
     * Demo RLP: só PAR do seed em EMP-00001; EMP-00002 sem cliente de ensaio; zero ORC/PED.
     *
     * @param  list<int>  $keepEmpIds
     */
    private function stripEnsaiosDoDemo(array $keepEmpIds): void
    {
        if ($keepEmpIds === []) {
            return;
        }

        foreach (self::DOCUMENT_TABLES as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'empresa_id')) {
                continue;
            }
            $n = DB::table($table)->whereIn('empresa_id', $keepEmpIds)->delete();
            if ($n > 0) {
                $this->line("· demo {$table}: {$n}");
            }
        }

        $emp1 = (int) (DB::table('empresas')->where('codigo', 'EMP-00001')->value('id') ?? 0);
        $emp2 = (int) (DB::table('empresas')->where('codigo', 'EMP-00002')->value('id') ?? 0);

        $extraPar = collect();
        if ($emp1 > 0 && Schema::hasTable('parceiros')) {
            $extraPar = $extraPar->merge(
                DB::table('parceiros')->where('empresa_id', $emp1)->whereNotIn('codigo', self::DEMO_PAR_EMP1)->pluck('id')
            );
        }
        if ($emp2 > 0 && Schema::hasTable('parceiros')) {
            $extraPar = $extraPar->merge(
                DB::table('parceiros')->where('empresa_id', $emp2)->pluck('id')
            );
        }
        $parIds = $extraPar->map(fn ($id) => (int) $id)->unique()->values()->all();
        if ($parIds === []) {
            return;
        }

        foreach (['parceiro_contatos', 'parceiro_contas_bancarias', 'parceiro_enderecos_entrega', 'parceiro_fiscal_historicos'] as $sat) {
            if (Schema::hasTable($sat)) {
                DB::table($sat)->whereIn('parceiro_id', $parIds)->delete();
            }
        }
        if (Schema::hasColumn('parceiros', 'vendedor_parceiro_id')) {
            DB::table('parceiros')->whereIn('id', $parIds)->update(['vendedor_parceiro_id' => null]);
        }
        $n = DB::table('parceiros')->whereIn('id', $parIds)->delete();
        $this->line("· parceiros de ensaio no demo: {$n}");
    }

    private function resetEmpSequence(): void
    {
        if (! Schema::hasTable('codigo_sequences')) {
            return;
        }

        DB::table('codigo_sequences')
            ->whereNull('empresa_id')
            ->where('prefixo', 'EMP')
            ->update(['proximo' => 3]);
    }
}
