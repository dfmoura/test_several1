<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

/**
 * Repõe instalação FLEXORC vazia para provisionar conta (CLI ou flag lab).
 * Remove todas as EMPs e contas self-service; preserva operadores PLATAFORMA.
 * Não restaura demo RLP (seed FLEXORC não cria mais EMP-00001).
 */
class ReporDemoPlataforma extends Command
{
    protected $signature = 'plataforma:repor-demo
                            {--dry-run : Inventaria; não apaga}
                            {--force : Executa sem confirmação}';

    protected $description = 'Remove empresas e contas FLEXORC; deixa instalação pronta para plataforma:criar-conta';

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
        $dry = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $keepUserIds = $this->plataformaUserIds();
        $allEmpIds = DB::table('empresas')->pluck('id')->map(fn ($id) => (int) $id)->all();

        $extraUserQuery = DB::table('users');
        if ($keepUserIds !== []) {
            $extraUserQuery->whereNotIn('id', $keepUserIds);
        }
        $extraUserIds = $extraUserQuery->pluck('id')->map(fn ($id) => (int) $id)->all();

        $this->info('Preservar: operadores PLATAFORMA ('.count($keepUserIds).')');
        $this->info('Remover empresas: '.count($allEmpIds).' · contas: '.count($extraUserIds));
        if ($allEmpIds !== []) {
            foreach (DB::table('empresas')->whereIn('id', $allEmpIds)->orderBy('id')->get(['codigo', 'cnpj', 'razao_social']) as $row) {
                $this->line("  - {$row->codigo}  {$row->cnpj}  {$row->razao_social}");
            }
        }
        if ($extraUserIds !== []) {
            foreach (DB::table('users')->whereIn('id', $extraUserIds)->orderBy('id')->get(['codigo', 'email']) as $row) {
                $this->line("  - {$row->codigo}  {$row->email}");
            }
        }
        $this->comment('Próximo passo: plataforma:criar-conta ou make alinhar-primeiro-cadastro EMAIL=…');

        if ($dry) {
            $this->warn('Dry-run: nenhuma alteração.');

            return self::SUCCESS;
        }

        if (! $force && ! $this->confirm('Apagar todas as EMPs e contas FLEXORC?', false)) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($allEmpIds, $extraUserIds, $keepUserIds) {
            $this->nullifyStamps($keepUserIds);
            $this->purgeUsers($extraUserIds);
            if ($allEmpIds !== []) {
                $this->purgeEmpresas($allEmpIds);
            }
            $this->resetSequences();
        });

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->info('Instalação vazia: pronta para plataforma:criar-conta (sem demo RLP).');

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
        $this->line("· users removidos: {$n}");
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

        if (Schema::hasTable('audit_logs') && Schema::hasColumn('audit_logs', 'empresa_id')) {
            DB::table('audit_logs')->whereIn('empresa_id', $empresaIds)->update(['empresa_id' => null]);
        }

        $n = DB::table('empresas')->whereIn('id', $empresaIds)->delete();
        $this->line("· empresas removidas: {$n}");
    }

    private function resetSequences(): void
    {
        if (! Schema::hasTable('codigo_sequences')) {
            return;
        }

        foreach (['USR', 'EMP', 'CFIN'] as $prefixo) {
            $row = DB::table('codigo_sequences')->whereNull('empresa_id')->where('prefixo', $prefixo)->first();
            if ($row === null) {
                DB::table('codigo_sequences')->insert([
                    'empresa_id' => null,
                    'prefixo' => $prefixo,
                    'proximo' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('codigo_sequences')->where('id', $row->id)->update([
                    'proximo' => 1,
                    'updated_at' => now(),
                ]);
            }
        }
    }
}
