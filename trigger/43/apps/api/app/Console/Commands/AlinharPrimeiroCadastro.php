<?php

namespace App\Console\Commands;

use App\Models\ContaAtivacao;
use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

/**
 * Conta FLEXORC canônica = USR-00001 (primeiro cadastro).
 * Remove o legado demo RLP (EMP-00001/00002 + *@rlp.com.br).
 * Preserva operador PLATAFORMA, mensalidade e audit_log.
 */
class AlinharPrimeiroCadastro extends Command
{
    protected $signature = 'plataforma:alinhar-primeiro-cadastro
                            {email : E-mail da conta FLEXORC canônica}
                            {--dry-run : Inventaria; não altera nada}
                            {--force : Executa sem confirmação}';

    protected $description = 'Faz a conta FLEXORC ser USR-00001 e remove o demo RLP';

    /** @var list<string> */
    private const LEGACY_RLP_EMPRESAS = ['EMP-00001', 'EMP-00002'];

    /** @var list<string> */
    private const LEGACY_RLP_EMAILS = [
        'admin@rlp.com.br',
        'comercial@rlp.com.br',
        'financeiro@rlp.com.br',
        'fiscal@rlp.com.br',
        'producao@rlp.com.br',
        'compras@rlp.com.br',
        'consulta@rlp.com.br',
    ];

    /** @var list<string> */
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
        'empresa_certificados_a1',
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
        'empresa_contas_financeiras',
        'codigo_sequences',
        'parceiros',
    ];

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('E-mail inválido.');

            return self::FAILURE;
        }

        $canonical = User::withTrashed()->where('email', $email)->first();
        if ($canonical === null) {
            $this->error("Conta não encontrada: {$email}");

            return self::FAILURE;
        }
        if ($canonical->trashed()) {
            $this->error('Esta conta está excluída. Restaure antes de alinhá-la.');

            return self::FAILURE;
        }
        if ($canonical->hasRole(PlatformRbac::ROLE)) {
            $this->error('Operador TRIGGER não é conta FLEXORC. Abortado.');

            return self::FAILURE;
        }

        $rlpEmpIds = DB::table('empresas')
            ->whereIn('codigo', self::LEGACY_RLP_EMPRESAS)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $adminEmail = strtolower((string) config('erp.admin_email', 'admin@rlp.com.br'));
        $rlpEmails = array_values(array_unique(array_map(
            'strtolower',
            array_merge(self::LEGACY_RLP_EMAILS, [$adminEmail])
        )));
        $rlpEmails = array_values(array_filter($rlpEmails, fn ($e) => $e !== $email));

        $rlpUserIds = DB::table('users')
            ->whereIn('email', $rlpEmails)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $canonicalEmpCount = (int) DB::table('empresa_user')->where('user_id', $canonical->id)->count();

        $this->info("Conta canônica: {$canonical->codigo}  {$canonical->email}  → USR-00001");
        $this->line('  EMPs vinculadas: '.$canonicalEmpCount);
        $this->info('Remover legado RLP: '.count($rlpEmpIds).' EMP · '.count($rlpUserIds).' users');
        if ($rlpEmpIds !== []) {
            foreach (DB::table('empresas')->whereIn('id', $rlpEmpIds)->orderBy('codigo')->get(['codigo', 'nome_fantasia']) as $row) {
                $this->line("  - {$row->codigo}  {$row->nome_fantasia}");
            }
        }
        if ($rlpUserIds !== []) {
            foreach (DB::table('users')->whereIn('id', $rlpUserIds)->orderBy('codigo')->get(['codigo', 'email']) as $row) {
                $this->line("  - {$row->codigo}  {$row->email}");
            }
        }
        $this->comment('Preserva: operador PLATAFORMA, mensalidade, audit_log.');

        if ((bool) $this->option('dry-run')) {
            $this->warn('Dry-run: nenhuma alteração.');

            return self::SUCCESS;
        }

        if (! (bool) $this->option('force') && ! $this->confirm('Alinhar esta conta como USR-00001 e apagar o demo RLP?', false)) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($canonical, $rlpEmpIds, $rlpUserIds) {
            $this->nullifyStamps([(int) $canonical->id, ...$this->plataformaUserIds()]);
            $this->purgeUsers($rlpUserIds);
            if ($rlpEmpIds !== []) {
                $this->purgeEmpresas($rlpEmpIds);
            }
            $this->promoverCodigoUsr1($canonical);
            $this->garantirContaAtivacao($canonical);
            $this->detachSeSemEmp($canonical);
            $this->invalidateSessions((int) $canonical->id);
            $this->realignSequences();
        });

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $fresh = User::query()->where('email', $email)->firstOrFail();
        $emps = (int) DB::table('empresa_user')->where('user_id', $fresh->id)->count();
        $billing = Schema::hasTable('conta_ativacoes')
            ? DB::table('conta_ativacoes')->where('user_id', $fresh->id)->value('billing_status')
            : null;
        $this->info("Primeiro cadastro: {$fresh->codigo}  {$fresh->name}  {$fresh->email}");
        $this->line("  EMPs={$emps}  billing=".($billing ?? '—'));
        $this->comment('UI: Empresas → cadastrar EMP (conta master via plataforma:criar-conta).');

        return self::SUCCESS;
    }

    /**
     * @return list<int>
     */
    private function plataformaUserIds(): array
    {
        if (! Schema::hasTable('model_has_roles') || ! Schema::hasTable('roles')) {
            return [];
        }

        return DB::table('model_has_roles as mhr')
            ->join('roles', 'roles.id', '=', 'mhr.role_id')
            ->where('mhr.model_type', User::class)
            ->where('roles.name', PlatformRbac::ROLE)
            ->pluck('mhr.model_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @param  list<int>  $keepUserIds
     */
    private function nullifyStamps(array $keepUserIds): void
    {
        $stampTables = [
            'audit_logs' => ['user_id'],
            'bens_patrimoniais' => ['criado_por', 'atualizado_por', 'responsavel_user_id'],
            'empresa_fiscal_historicos' => ['alterado_por'],
            'empresa_contas_financeiras' => ['criado_por', 'atualizado_por'],
            'empresa_certificados_a1' => ['uploaded_by'],
            'empresas' => ['criado_por', 'atualizado_por'],
            'departamentos' => ['criado_por', 'atualizado_por'],
            'naturezas_gerenciais' => ['criado_por', 'atualizado_por'],
            'orc_mapa_facas' => ['criado_por', 'atualizado_por'],
            'orc_catalogo_papeis' => ['criado_por', 'atualizado_por'],
            'orc_catalogo_acabamentos' => ['criado_por', 'atualizado_por'],
            'orc_catalogo_tipos_troca' => ['criado_por', 'atualizado_por'],
            'orc_catalogo_maquinas' => ['criado_por', 'atualizado_por'],
            'orc_catalogo_parametros' => ['criado_por', 'atualizado_por'],
            'orc_catalogo_faixas_frete' => ['criado_por', 'atualizado_por'],
            'parametros_empresa' => ['alterado_por'],
            'parceiros' => ['criado_por', 'atualizado_por'],
            'fiscal_hubs' => ['criado_por', 'atualizado_por'],
            'ia_provedores' => ['criado_por', 'atualizado_por'],
        ];

        $keep = $keepUserIds === [] ? [0] : $keepUserIds;

        foreach ($stampTables as $table => $cols) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach ($cols as $col) {
                if (! Schema::hasColumn($table, $col)) {
                    continue;
                }
                DB::table($table)
                    ->whereNotNull($col)
                    ->whereNotIn($col, $keep)
                    ->update([$col => null]);
            }
        }
    }

    /**
     * @param  list<int>  $userIds
     */
    private function purgeUsers(array $userIds): void
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
        }

        $n = DB::table('users')->whereIn('id', $userIds)->delete();
        $this->line("· users RLP removidos: {$n}");
    }

    /**
     * @param  list<int>  $empresaIds
     */
    private function purgeEmpresas(array $empresaIds): void
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

        if (Schema::hasTable('orcamento_links_aprovacao') && Schema::hasTable('orcamentos')) {
            $orcIds = DB::table('orcamentos')->whereIn('empresa_id', $empresaIds)->pluck('id');
            if ($orcIds->isNotEmpty()) {
                DB::table('orcamento_links_aprovacao')->whereIn('orcamento_id', $orcIds)->delete();
            }
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

        if (Schema::hasColumn('users', 'empresa_default_id')) {
            DB::table('users')
                ->whereIn('empresa_default_id', $empresaIds)
                ->update(['empresa_default_id' => null]);
        }

        if (Schema::hasColumn('users', 'parceiro_id') && $parceiroIds !== []) {
            DB::table('users')->whereIn('parceiro_id', $parceiroIds)->update(['parceiro_id' => null]);
        }

        if (Schema::hasTable('audit_logs') && Schema::hasColumn('audit_logs', 'empresa_id')) {
            DB::table('audit_logs')->whereIn('empresa_id', $empresaIds)->update(['empresa_id' => null]);
        }

        $n = DB::table('empresas')->whereIn('id', $empresaIds)->delete();
        $this->line("· empresas RLP removidas: {$n}");
    }

    private function promoverCodigoUsr1(User $user): void
    {
        $holder = DB::table('users')
            ->where('codigo', 'USR-00001')
            ->where('id', '!=', $user->id)
            ->first();

        if ($holder !== null) {
            // Libera o código sem colidir (quem restou não é RLP — move para slot temporário).
            $tmp = 'USR-TMP-'.str_pad((string) $holder->id, 5, '0', STR_PAD_LEFT);
            DB::table('users')->where('id', $holder->id)->update(['codigo' => $tmp]);
            $this->line("· liberou USR-00001 de {$holder->email} → {$tmp}");
        }

        if ($user->codigo !== 'USR-00001') {
            DB::table('users')->where('id', $user->id)->update(['codigo' => 'USR-00001']);
            $this->line("· {$user->email} → USR-00001");
        }
    }

    private function garantirContaAtivacao(User $user): void
    {
        if (! Schema::hasTable('conta_ativacoes')) {
            return;
        }

        ContaAtivacao::query()->firstOrCreate(
            ['user_id' => $user->id],
            [
                'billing_status' => ContaAtivacao::BILLING_PENDENTE,
                'billing_provider' => (string) config('erp.banking.provider', 'mock'),
            ]
        );
    }

    private function detachSeSemEmp(User $user): void
    {
        $hasEmp = Schema::hasTable('empresa_user')
            && DB::table('empresa_user')->where('user_id', $user->id)->exists();

        if ($hasEmp) {
            return;
        }

        $updates = [];
        if (Schema::hasColumn('users', 'empresa_default_id')) {
            $updates['empresa_default_id'] = null;
        }
        if (Schema::hasColumn('users', 'parceiro_id')) {
            $updates['parceiro_id'] = null;
        }
        if ($updates !== []) {
            DB::table('users')->where('id', $user->id)->update($updates);
        }
    }

    private function invalidateSessions(int $userId): void
    {
        if (Schema::hasTable('personal_access_tokens')) {
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $userId)
                ->delete();
        }
        if (Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $userId)->delete();
        }
    }

    private function realignSequences(): void
    {
        if (! Schema::hasTable('codigo_sequences')) {
            return;
        }

        $this->setNextFromMax(null, 'USR', 'users', 'codigo', '/^USR-(\d+)$/');
        $this->setNextFromMax(null, 'EMP', 'empresas', 'codigo', '/^EMP-(\d+)$/');
    }

    private function setNextFromMax(?int $empresaId, string $prefixo, string $table, string $column, string $pattern): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        $max = 0;
        foreach (DB::table($table)->pluck($column) as $codigo) {
            if (preg_match($pattern, (string) $codigo, $m) === 1) {
                $max = max($max, (int) $m[1]);
            }
        }

        $q = DB::table('codigo_sequences')->where('prefixo', $prefixo);
        if ($empresaId === null) {
            $q->whereNull('empresa_id');
        } else {
            $q->where('empresa_id', $empresaId);
        }
        $row = $q->first();

        if ($row === null) {
            DB::table('codigo_sequences')->insert([
                'empresa_id' => $empresaId,
                'prefixo' => $prefixo,
                'proximo' => max(1, $max + 1),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('codigo_sequences')->where('id', $row->id)->update([
                'proximo' => max(1, $max + 1),
                'updated_at' => now(),
            ]);
        }
    }
}
