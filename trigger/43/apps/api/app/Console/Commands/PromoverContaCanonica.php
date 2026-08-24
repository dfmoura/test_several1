<?php

namespace App\Console\Commands;

use App\Models\Parceiro;
use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

/**
 * Deixa uma conta FLEXORC self-service como a única da instalação, no padrão
 * de primeiro cadastro: identidade alinhada, sequências coerentes, livro da
 * EMP intacto. Preserva o operador TRIGGER. Não restaura demo RLP.
 *
 * Inverso seletivo de plataforma:repor-demo — não apaga o pagador canônico.
 * audit_log não se apaga (SEGURANCA_NUVEM_AWS).
 */
class PromoverContaCanonica extends Command
{
    protected $signature = 'plataforma:promover-conta
                            {email : E-mail da conta FLEXORC a preservar}
                            {--dry-run : Inventaria; não altera nada}
                            {--force : Executa sem confirmação}';

    protected $description = 'Preserva uma conta FLEXORC + operador TRIGGER e remove as demais contas/EMPs';

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
        'naturezas_gerenciais',
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
            $this->error('Esta conta está excluída. Restaure antes de promovê-la.');

            return self::FAILURE;
        }
        if ($canonical->hasRole(PlatformRbac::ROLE)) {
            $this->error('Este e-mail é operador TRIGGER. Não use o console como conta FLEXORC.');

            return self::FAILURE;
        }

        $canonicalEmpIds = DB::table('empresa_user')
            ->where('user_id', $canonical->id)
            ->pluck('empresa_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $keepEmpIds = $canonicalEmpIds;

        $plataformaIds = $this->plataformaUserIds();
        $keepUserIds = array_values(array_unique(array_merge(
            $plataformaIds,
            [(int) $canonical->id]
        )));

        $extraEmpQuery = DB::table('empresas');
        if ($keepEmpIds !== []) {
            $extraEmpQuery->whereNotIn('id', $keepEmpIds);
        }
        $extraEmpIds = $extraEmpQuery->pluck('id')->map(fn ($id) => (int) $id)->all();

        $extraUserQuery = DB::table('users');
        if ($keepUserIds !== []) {
            $extraUserQuery->whereNotIn('id', $keepUserIds);
        }
        $extraUserIds = $extraUserQuery->pluck('id')->map(fn ($id) => (int) $id)->all();

        $this->info("Conta canônica: {$canonical->codigo}  {$canonical->email}");
        $this->line('  empresas: '.($canonicalEmpIds === [] ? '—' : $this->empCodes($canonicalEmpIds)));
        $this->info('Preservar também: operador PLATAFORMA');
        $this->info('Remover empresas: '.count($extraEmpIds).' · contas: '.count($extraUserIds));
        if ($extraEmpIds !== []) {
            foreach (DB::table('empresas')->whereIn('id', $extraEmpIds)->orderBy('id')->get(['codigo']) as $row) {
                $this->line("  - {$row->codigo}");
            }
        }
        if ($extraUserIds !== []) {
            foreach (DB::table('users')->whereIn('id', $extraUserIds)->orderBy('id')->get(['codigo', 'email']) as $row) {
                $this->line("  - {$row->codigo}  {$row->email}");
            }
        }

        $dry = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        if ($dry) {
            $this->warn('Dry-run: nenhuma alteração.');

            return self::SUCCESS;
        }

        if (! $force && ! $this->confirm('Promover esta conta e apagar as demais self-service?', false)) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($canonical, $extraEmpIds, $extraUserIds, $keepEmpIds, $keepUserIds, $canonicalEmpIds) {
            $this->nullifyStamps($keepUserIds);
            $this->purgeUsers($extraUserIds, $keepEmpIds);
            if ($extraEmpIds !== []) {
                $this->purgeEmpresas($extraEmpIds, $keepEmpIds);
            }
            $this->alinharIdentidade($canonical->fresh() ?? $canonical, $canonicalEmpIds);
            $this->realignSequences($keepEmpIds, $canonicalEmpIds);
        });

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $fresh = User::query()->where('email', $email)->firstOrFail();
        $this->info("Conta canônica pronta: {$fresh->codigo}  {$fresh->name}  {$fresh->email}");
        foreach (DB::table('empresas')->whereIn('id', $canonicalEmpIds)->orderBy('codigo')->get(['codigo', 'razao_social']) as $row) {
            $this->line("  {$row->codigo}  {$row->razao_social}");
        }

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
     * @param  list<int>  $ids
     */
    private function empCodes(array $ids): string
    {
        if ($ids === []) {
            return '—';
        }

        return DB::table('empresas')->whereIn('id', $ids)->orderBy('codigo')->pluck('codigo')->implode(', ');
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
            if ($keepEmpIds !== []) {
                DB::table('empresa_user')->whereNotIn('empresa_id', $keepEmpIds)->delete();
            }
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

        if (Schema::hasColumn('users', 'empresa_default_id')) {
            DB::table('users')
                ->whereIn('empresa_default_id', $empresaIds)
                ->update(['empresa_default_id' => null]);
        }

        if (Schema::hasTable('audit_logs') && Schema::hasColumn('audit_logs', 'empresa_id')) {
            DB::table('audit_logs')->whereIn('empresa_id', $empresaIds)->update(['empresa_id' => null]);
        }

        $n = DB::table('empresas')->whereIn('id', $empresaIds)->delete();
        $this->line("· empresas removidas: {$n}");
    }

    /**
     * Identidade de primeiro cadastro: nome apresentável, fantasia da EMP, PAR master.
     *
     * @param  list<int>  $canonicalEmpIds
     */
    private function alinharIdentidade(User $user, array $canonicalEmpIds): void
    {
        $antes = trim((string) $user->name);
        if ($this->nomeFraco($antes)) {
            $user->name = mb_convert_case($antes, MB_CASE_TITLE, 'UTF-8');
            $user->save();
        }

        if ($canonicalEmpIds !== [] && Schema::hasTable('empresas')) {
            foreach (DB::table('empresas')->whereIn('id', $canonicalEmpIds)->get(['id', 'razao_social', 'nome_fantasia']) as $row) {
                $fantasia = trim((string) ($row->nome_fantasia ?? ''));
                $razao = trim((string) ($row->razao_social ?? ''));
                if ($fantasia === '' && $razao !== '') {
                    DB::table('empresas')->where('id', $row->id)->update(['nome_fantasia' => $razao]);
                }
            }
        }

        $defaultId = (int) ($user->empresa_default_id ?? 0);
        if ($defaultId > 0 && in_array($defaultId, $canonicalEmpIds, true)) {
            foreach ($canonicalEmpIds as $empId) {
                DB::table('empresa_user')
                    ->where('user_id', $user->id)
                    ->where('empresa_id', $empId)
                    ->update(['padrao' => $empId === $defaultId ? 1 : 0]);
            }
        }

        if (! Schema::hasTable('parceiros') || $canonicalEmpIds === []) {
            return;
        }

        $nomeAlvo = mb_strtolower(trim((string) $user->name));
        $nomeAntes = mb_strtolower($antes);

        $pars = Parceiro::query()
            ->whereIn('empresa_id', $canonicalEmpIds)
            ->where('papel_colaborador', true)
            ->where(function ($q) use ($user, $nomeAlvo, $nomeAntes) {
                $q->where('id', $user->parceiro_id)
                    ->orWhere('email', $user->email)
                    ->orWhereRaw('LOWER(razao_social) = ?', [$nomeAlvo]);
                if ($nomeAntes !== '' && $nomeAntes !== $nomeAlvo) {
                    $q->orWhereRaw('LOWER(razao_social) = ?', [$nomeAntes]);
                }
            })
            ->get();

        foreach ($pars as $par) {
            $updates = [];
            if (trim((string) ($par->email ?? '')) === '') {
                $updates['email'] = $user->email;
            }
            if (trim((string) ($par->cargo ?? '')) === '') {
                $updates['cargo'] = 'Administrador';
            }
            if (trim((string) ($par->nome_fantasia ?? '')) === '') {
                $updates['nome_fantasia'] = $user->name;
            }
            if ($this->nomeFraco((string) $par->razao_social) || mb_strtolower((string) $par->razao_social) === $nomeAntes) {
                $updates['razao_social'] = $user->name;
                if (trim((string) ($par->nome_fantasia ?? '')) === '' || $this->nomeFraco((string) $par->nome_fantasia)) {
                    $updates['nome_fantasia'] = $user->name;
                }
            }
            if ($updates !== []) {
                $par->update($updates);
            }
        }
    }

    private function nomeFraco(string $name): bool
    {
        $name = trim($name);

        return $name === '' || preg_match('/^\p{Ll}+$/u', $name) === 1;
    }

    /**
     * @param  list<int>  $keepEmpIds
     * @param  list<int>  $canonicalEmpIds
     */
    private function realignSequences(array $keepEmpIds, array $canonicalEmpIds): void
    {
        if (! Schema::hasTable('codigo_sequences')) {
            return;
        }

        $this->setNextFromMax(null, 'EMP', 'empresas', 'codigo');
        $this->setNextFromMax(null, 'USR', 'users', 'codigo');
        if (Schema::hasTable('empresa_contas_financeiras')) {
            $this->setNextFromMax(null, 'CFIN', 'empresa_contas_financeiras', 'codigo');
        }
        if (Schema::hasTable('bens_patrimoniais')) {
            $this->setNextFromMax(null, 'BEM', 'bens_patrimoniais', 'codigo');
        }

        foreach ($keepEmpIds as $empId) {
            $this->setNextFromMax($empId, 'PAR', 'parceiros', 'codigo');
        }

        foreach ($canonicalEmpIds as $empId) {
            $this->setNextFromMax($empId, 'ORC-'.date('Y'), 'orcamentos', 'codigo');
        }

        $this->line('· sequências alinhadas ao maior código restante');
    }

    private function setNextFromMax(?int $empresaId, string $prefix, string $table, string $column): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        $like = $prefix.'-%';
        $offset = strlen($prefix) + 2;
        $query = DB::table($table)->where($column, 'like', $like);
        if ($empresaId !== null && Schema::hasColumn($table, 'empresa_id')) {
            $query->where('empresa_id', $empresaId);
        }

        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            $max = $query->selectRaw("MAX(CAST(SUBSTR({$column}, ?) AS INTEGER)) as max_n", [$offset])->value('max_n');
        } else {
            $max = $query->selectRaw("MAX(CAST(SUBSTRING({$column}, ?) AS UNSIGNED)) as max_n", [$offset])->value('max_n');
        }

        $next = ((int) ($max ?? 0)) + 1;
        $seqQuery = DB::table('codigo_sequences')->where('prefixo', $prefix);
        if ($empresaId === null) {
            $seqQuery->whereNull('empresa_id');
        } else {
            $seqQuery->where('empresa_id', $empresaId);
        }

        if ($seqQuery->exists()) {
            $seqQuery->update(['proximo' => $next]);

            return;
        }

        if ($next > 1) {
            DB::table('codigo_sequences')->insert([
                'empresa_id' => $empresaId,
                'prefixo' => $prefix,
                'proximo' => $next,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
