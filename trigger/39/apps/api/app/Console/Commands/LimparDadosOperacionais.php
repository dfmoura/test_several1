<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\PermissionRegistrar;

/**
 * Limpeza cadenciada do operacional — preserva plataforma (EMP, RBAC, catálogos,
 * naturezas, departamentos, BEM, CFIN) e apenas o usuário ADMIN + parceiro dele.
 *
 * Estudo 32: cadastros e documentos operacionais são dados de negócio; não confundir
 * com seed de plataforma (roles, EMP, parâmetros, catálogo ORC/fiscal).
 */
class LimparDadosOperacionais extends Command
{
    protected $signature = 'erp:limpar-operacional
                            {--dry-run : Só inventaria contagens; não altera nada}
                            {--force : Executa sem confirmação interativa}
                            {--admin-email= : E-mail do admin a preservar (default: config erp.admin_email)}';

    protected $description = 'Limpa parceiros/produtos/ORC/OC/estoque/TIT (CP/CR) preservando só o ADMIN e seu PAR';

    /** @var list<string> */
    private const OPERATIONAL_TABLES = [
        'webhook_inbox',
        'cobrancas',
        'titulo_baixas',
        'titulos',
        'faturamento_itens',
        'documento_fiscal_saidas',
        'faturamentos',
        'orcamento_links_aprovacao',
        'matriz_cobradas',
        'ordem_producao_materiais',
        'ordens_producao',
        'ordens_servico',
        'pedido_itens',
        'pedidos',
        'orcamentos',
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
        'parceiros',
        'users',
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $adminEmail = (string) ($this->option('admin-email') ?: config('erp.admin_email', 'admin@rlp.com.br'));

        $admin = User::withTrashed()
            ->where('email', $adminEmail)
            ->first();

        if ($admin === null) {
            $this->error("Admin não encontrado: {$adminEmail}");

            return self::FAILURE;
        }

        if ($admin->parceiro_id === null) {
            $this->error("Admin {$adminEmail} sem parceiro_id — abortando para não orphanar identidade.");

            return self::FAILURE;
        }

        $keepUserId = (int) $admin->id;
        $keepParceiroId = (int) $admin->parceiro_id;

        $this->info('Preservar:');
        $this->line("  user #{$keepUserId} {$admin->email} ({$admin->codigo})");
        $this->line("  parceiro #{$keepParceiroId}");
        $this->newLine();

        $counts = $this->inventory($keepUserId, $keepParceiroId);
        $this->table(['escopo', 'total', 'remover'], $counts);

        if ($dryRun) {
            $this->warn('Dry-run: nenhuma alteração.');

            return self::SUCCESS;
        }

        if (! $force && ! $this->confirm('Confirma limpeza operacional irreversível neste banco?', false)) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($keepUserId, $keepParceiroId) {
            $this->breakCircularRefs();
            $this->purgeDocuments();
            $this->purgeProdutos();
            $this->nullifyExternalRefs($keepUserId, $keepParceiroId);
            $this->purgeUsersExcept($keepUserId);
            $this->purgeParceirosExcept($keepParceiroId);
            $this->realignSequences($keepParceiroId, $keepUserId);
        });

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->newLine();
        $this->info('Limpeza concluída.');
        $this->table(['escopo', 'total', 'remover'], $this->inventory($keepUserId, $keepParceiroId));

        return self::SUCCESS;
    }

    /**
     * @return list<array{0: string, 1: int, 2: int}>
     */
    private function inventory(int $keepUserId, int $keepParceiroId): array
    {
        $rows = [];

        foreach (self::OPERATIONAL_TABLES as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $total = (int) DB::table($table)->count();
            $remove = match ($table) {
                'users' => (int) DB::table($table)->where('id', '!=', $keepUserId)->count(),
                'parceiros' => (int) DB::table($table)->where('id', '!=', $keepParceiroId)->count(),
                'parceiro_contatos',
                'parceiro_contas_bancarias',
                'parceiro_enderecos_entrega',
                'parceiro_fiscal_historicos' => (int) DB::table($table)
                    ->where('parceiro_id', '!=', $keepParceiroId)
                    ->count(),
                default => $total,
            };

            $rows[] = [$table, $total, $remove];
        }

        return $rows;
    }

    private function breakCircularRefs(): void
    {
        if (Schema::hasTable('faturamentos') && Schema::hasColumn('faturamentos', 'adiantamento_titulo_id')) {
            DB::table('faturamentos')->update(['adiantamento_titulo_id' => null]);
            $this->line('· faturamentos.adiantamento_titulo_id → null');
        }

        if (Schema::hasTable('titulos') && Schema::hasColumn('titulos', 'faturamento_id')) {
            DB::table('titulos')->update(['faturamento_id' => null, 'pedido_id' => null]);
            $this->line('· titulos.faturamento_id / pedido_id → null');
        }

        if (Schema::hasTable('orcamentos') && Schema::hasColumn('orcamentos', 'adiantamento_titulo_id')) {
            DB::table('orcamentos')->update(['adiantamento_titulo_id' => null]);
            $this->line('· orcamentos.adiantamento_titulo_id → null');
        }

        if (Schema::hasTable('estoque_movimentos') && Schema::hasColumn('estoque_movimentos', 'ajuste_id')) {
            DB::table('estoque_movimentos')->update(['ajuste_id' => null]);
            $this->line('· estoque_movimentos.ajuste_id → null');
        }

        if (Schema::hasTable('estoque_ajustes') && Schema::hasColumn('estoque_ajustes', 'movimento_id')) {
            DB::table('estoque_ajustes')->update(['movimento_id' => null]);
            $this->line('· estoque_ajustes.movimento_id → null');
        }

        if (Schema::hasTable('ordens_producao') && Schema::hasColumn('ordens_producao', 'pa_movimento_id')) {
            DB::table('ordens_producao')->update(['pa_movimento_id' => null]);
            $this->line('· ordens_producao.pa_movimento_id → null');
        }

        if (Schema::hasTable('ordem_producao_materiais')) {
            if (Schema::hasColumn('ordem_producao_materiais', 'saida_movimento_id')) {
                DB::table('ordem_producao_materiais')->update(['saida_movimento_id' => null]);
            }
            if (Schema::hasColumn('ordem_producao_materiais', 'retorno_movimento_id')) {
                DB::table('ordem_producao_materiais')->update(['retorno_movimento_id' => null]);
            }
            $this->line('· ordem_producao_materiais MOV FKs → null');
        }

        if (Schema::hasTable('estoque_movimentos')) {
            foreach (['pedido_id', 'ordem_producao_id', 'ordem_servico_id'] as $col) {
                if (Schema::hasColumn('estoque_movimentos', $col)) {
                    DB::table('estoque_movimentos')->update([$col => null]);
                }
            }
            $this->line('· estoque_movimentos PED/OP/OS FKs → null');
        }
    }

    private function purgeDocuments(): void
    {
        // Ordem: folhas → documentos → cadastros dependentes.
        $steps = [
            'webhook_inbox',
            'cobrancas',
            'titulo_baixas',
            'titulos',
            'faturamento_itens',
            'documento_fiscal_saidas',
            'faturamentos',
            'orcamento_links_aprovacao',
            'matriz_cobradas',
            'ordem_producao_materiais',
            'ordens_producao',
            'ordens_servico',
            'pedido_itens',
            'pedidos',
            'orcamentos',
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
        ];

        foreach ($steps as $table) {
            $this->truncateIfExists($table);
        }

        if (Storage::disk('local')->exists('nfe-entradas')) {
            Storage::disk('local')->deleteDirectory('nfe-entradas');
            $this->line('· storage nfe-entradas removido');
        }
    }

    private function purgeProdutos(): void
    {
        $this->truncateIfExists('produtos');
    }

    private function nullifyExternalRefs(int $keepUserId, int $keepParceiroId): void
    {
        if (Schema::hasTable('bens_patrimoniais')) {
            DB::table('bens_patrimoniais')
                ->whereNotNull('fornecedor_id')
                ->where('fornecedor_id', '!=', $keepParceiroId)
                ->update(['fornecedor_id' => null]);

            DB::table('bens_patrimoniais')
                ->whereNotNull('responsavel_user_id')
                ->where('responsavel_user_id', '!=', $keepUserId)
                ->update(['responsavel_user_id' => null]);

            $this->line('· bens_patrimoniais: FKs externas neutralizadas');
        }

        if (Schema::hasTable('parceiros')) {
            DB::table('parceiros')
                ->where('id', $keepParceiroId)
                ->whereNotNull('vendedor_parceiro_id')
                ->update(['vendedor_parceiro_id' => null]);
        }

        // Tabelas de plataforma que podem carimbar users a remover.
        $stampTables = [
            'audit_logs' => ['user_id'],
            'bens_patrimoniais' => ['criado_por', 'atualizado_por'],
            'empresa_fiscal_historicos' => ['alterado_por'],
            'empresas' => ['criado_por', 'atualizado_por'],
            'orc_mapa_facas' => ['criado_por', 'atualizado_por'],
            'parametros_empresa' => ['alterado_por'],
            'parceiros' => ['criado_por', 'atualizado_por'],
        ];

        foreach ($stampTables as $table => $cols) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach ($cols as $col) {
                if (! Schema::hasColumn($table, $col)) {
                    continue;
                }
                // nullOnDelete na maioria; null explícito evita falha se o FK for RESTRICT.
                DB::table($table)
                    ->whereNotNull($col)
                    ->where($col, '!=', $keepUserId)
                    ->update([$col => null]);
            }
        }

        $this->line('· carimbos de usuário (plataforma) → null onde não-admin');
    }

    private function purgeUsersExcept(int $keepUserId): void
    {
        $otherIds = DB::table('users')->where('id', '!=', $keepUserId)->pluck('id')->all();
        if ($otherIds === []) {
            $this->line('· users: nada a remover');

            return;
        }

        if (Schema::hasTable('personal_access_tokens')) {
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->whereIn('tokenable_id', $otherIds)
                ->delete();
        }

        if (Schema::hasTable('sessions')) {
            DB::table('sessions')->whereIn('user_id', $otherIds)->delete();
        }

        if (Schema::hasTable('model_has_roles')) {
            DB::table('model_has_roles')
                ->where('model_type', User::class)
                ->whereIn('model_id', $otherIds)
                ->delete();
        }

        if (Schema::hasTable('model_has_permissions')) {
            DB::table('model_has_permissions')
                ->where('model_type', User::class)
                ->whereIn('model_id', $otherIds)
                ->delete();
        }

        if (Schema::hasTable('empresa_user')) {
            DB::table('empresa_user')->whereIn('user_id', $otherIds)->delete();
        }

        // Soft-deleted e ativos: hard delete dos demais.
        $n = DB::table('users')->whereIn('id', $otherIds)->delete();
        $this->line("· users removidos: {$n} (mantido #{$keepUserId})");
    }

    private function purgeParceirosExcept(int $keepParceiroId): void
    {
        $satellites = [
            'parceiro_contatos',
            'parceiro_contas_bancarias',
            'parceiro_enderecos_entrega',
            'parceiro_fiscal_historicos',
        ];

        foreach ($satellites as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            $n = DB::table($table)->where('parceiro_id', '!=', $keepParceiroId)->delete();
            $this->line("· {$table} removidos: {$n}");
        }

        // Quebra self-FK antes do delete em massa.
        if (Schema::hasColumn('parceiros', 'vendedor_parceiro_id')) {
            DB::table('parceiros')
                ->where('id', '!=', $keepParceiroId)
                ->update(['vendedor_parceiro_id' => null]);
        }

        $n = DB::table('parceiros')->where('id', '!=', $keepParceiroId)->delete();
        $this->line("· parceiros removidos: {$n} (mantido #{$keepParceiroId})");
    }

    private function realignSequences(int $keepParceiroId, int $keepUserId): void
    {
        if (! Schema::hasTable('codigo_sequences')) {
            return;
        }

        $parceiroCodigo = (string) DB::table('parceiros')->where('id', $keepParceiroId)->value('codigo');
        $userCodigo = (string) DB::table('users')->where('id', $keepUserId)->value('codigo');

        $parNext = $this->nextAfterCode($parceiroCodigo, 'PAR');
        $usrNext = $this->nextAfterCode($userCodigo, 'USR');

        // PAR é por empresa; USR é global (empresa_id null).
        $empId = DB::table('parceiros')->where('id', $keepParceiroId)->value('empresa_id');

        if ($empId !== null) {
            DB::table('codigo_sequences')
                ->where('empresa_id', $empId)
                ->where('prefixo', 'PAR')
                ->update(['proximo' => $parNext]);
        }

        DB::table('codigo_sequences')
            ->whereNull('empresa_id')
            ->where('prefixo', 'USR')
            ->update(['proximo' => $usrNext]);

        // Documentos / produtos: reinicia em 1 (próximo código = 00001).
        $docPrefixes = ['ORC', 'OC', 'MOV', 'TIT', 'BX', 'AJU', 'NEC', 'COT', 'COB', 'PFC'];
        DB::table('codigo_sequences')
            ->whereIn('prefixo', $docPrefixes)
            ->update(['proximo' => 1]);

        // Prefixo de família de produto (MP-PAP, etc.): reinicia.
        DB::table('codigo_sequences')
            ->where(function ($q) {
                $q->where('prefixo', 'like', 'MP-%')
                    ->orWhere('prefixo', 'like', 'EMB-%')
                    ->orWhere('prefixo', 'like', 'PA-%')
                    ->orWhere('prefixo', 'like', 'REV-%')
                    ->orWhere('prefixo', 'SVC');
            })
            ->update(['proximo' => 1]);

        $this->line("· sequences: PAR→{$parNext}, USR→{$usrNext}, docs/prod→1");
    }

    private function nextAfterCode(string $codigo, string $prefix): int
    {
        if (preg_match('/^'.preg_quote($prefix, '/').'-(\d+)$/', $codigo, $m) === 1) {
            return ((int) $m[1]) + 1;
        }

        return 2;
    }

    private function truncateIfExists(string $table): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        $n = DB::table($table)->count();
        // DELETE (não TRUNCATE): respeita FKs e permite transação.
        DB::table($table)->delete();
        $this->line("· {$table}: {$n} → 0");
    }
}
