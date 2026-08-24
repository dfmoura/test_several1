<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

/**
 * Zera o livro operacional de uma conta FLEXORC (EMPs + ORC e dependências).
 *
 * Preserva: usuário, RBAC, mensalidade (conta_ativacoes), demais contas.
 * audit_log não se apaga (SEGURANCA_NUVEM_AWS) — só desvincula empresa_id.
 *
 * Após a limpeza a conta fica no estado pós-cadastro: pode criar EMP de novo pelo menu.
 */
class LimparLivroConta extends Command
{
    protected $signature = 'plataforma:limpar-livro-conta
                            {email : E-mail da conta FLEXORC}
                            {--dry-run : Inventaria; não altera nada}
                            {--force : Executa sem confirmação}';

    protected $description = 'Remove EMPs e orçamentos (livro) de uma conta FLEXORC; preserva login e mensalidade';

    /**
     * Ordem: documentos → estoque/compras → satélites PAR → cadastro EMP → PAR.
     * Tabelas sem empresa_id (ex. orcamento_links_aprovacao) saem por FK cascade do ORC.
     *
     * @var list<string>
     */
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

        $user = User::withTrashed()->where('email', $email)->first();
        if ($user === null) {
            $this->error("Conta não encontrada: {$email}");

            return self::FAILURE;
        }
        if ($user->trashed()) {
            $this->error('Esta conta está excluída. Restaure antes de limpar o livro.');

            return self::FAILURE;
        }
        if ($user->hasRole(PlatformRbac::ROLE)) {
            $this->error('Operador TRIGGER não tem livro FLEXORC. Abortado.');

            return self::FAILURE;
        }

        $targetEmpIds = DB::table('empresa_user')
            ->where('user_id', $user->id)
            ->pluck('empresa_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        if ($targetEmpIds === []) {
            $this->warn('Nenhuma EMP vinculada a esta conta. Nada a limpar.');

            return self::SUCCESS;
        }

        $shared = DB::table('empresa_user')
            ->whereIn('empresa_id', $targetEmpIds)
            ->where('user_id', '!=', $user->id)
            ->exists();
        if ($shared) {
            $this->error('Há outro usuário vinculado a alguma dessas EMPs. Abortado para não misturar livros.');

            return self::FAILURE;
        }

        $orcCount = Schema::hasTable('orcamentos')
            ? (int) DB::table('orcamentos')->whereIn('empresa_id', $targetEmpIds)->count()
            : 0;

        $this->info("Conta: {$user->codigo}  {$user->email}");
        $this->info('Remover livro:');
        foreach (DB::table('empresas')->whereIn('id', $targetEmpIds)->orderBy('codigo')->get(['id', 'codigo', 'nome_fantasia', 'razao_social']) as $row) {
            $orc = Schema::hasTable('orcamentos')
                ? (int) DB::table('orcamentos')->where('empresa_id', $row->id)->count()
                : 0;
            $label = trim((string) ($row->nome_fantasia ?: $row->razao_social));
            $this->line("  - {$row->codigo}  {$label}  (ORC={$orc})");
        }
        $this->line("  total ORC: {$orcCount}");
        $this->comment('Preserva: usuário, ADMIN, mensalidade (conta_ativacoes), audit_log.');

        if ((bool) $this->option('dry-run')) {
            $this->warn('Dry-run: nenhuma alteração.');

            return self::SUCCESS;
        }

        if (! (bool) $this->option('force') && ! $this->confirm('Apagar EMPs e orçamentos desta conta?', false)) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($user, $targetEmpIds) {
            $this->detachContaDoLivro($user, $targetEmpIds);
            $this->purgeEmpresas($targetEmpIds);
            $this->realignEmpSequence();
        });

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $fresh = User::query()->where('email', $email)->firstOrFail();
        $restantes = DB::table('empresa_user')->where('user_id', $fresh->id)->count();
        $this->info("Livro limpo: {$fresh->codigo}  {$fresh->email}  EMPs restantes={$restantes}");
        $this->comment('Próximo passo na UI: Empresas → cadastrar EMP (catálogo ORC nasce no onboarding).');

        return self::SUCCESS;
    }

    /**
     * @param  list<int>  $empresaIds
     */
    private function detachContaDoLivro(User $user, array $empresaIds): void
    {
        $updates = [];
        if (Schema::hasColumn('users', 'empresa_default_id')
            && $user->empresa_default_id !== null
            && in_array((int) $user->empresa_default_id, $empresaIds, true)) {
            $updates['empresa_default_id'] = null;
        }
        if (Schema::hasColumn('users', 'parceiro_id') && $user->parceiro_id !== null) {
            $parEmp = Schema::hasTable('parceiros')
                ? DB::table('parceiros')->where('id', $user->parceiro_id)->value('empresa_id')
                : null;
            if ($parEmp !== null && in_array((int) $parEmp, $empresaIds, true)) {
                $updates['parceiro_id'] = null;
            }
        }
        if ($updates !== []) {
            DB::table('users')->where('id', $user->id)->update($updates);
        }

        if (Schema::hasTable('personal_access_tokens')) {
            // Sessões antigas carregam X-Empresa-Id morto; força re-login limpo.
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $user->id)
                ->delete();
        }
        if (Schema::hasTable('sessions')) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }
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

        // Links de aprovação não têm empresa_id — apagar via ORC antes do hard delete.
        if (Schema::hasTable('orcamento_links_aprovacao') && Schema::hasTable('orcamentos')) {
            $orcIds = DB::table('orcamentos')->whereIn('empresa_id', $empresaIds)->pluck('id');
            if ($orcIds->isNotEmpty()) {
                $n = DB::table('orcamento_links_aprovacao')->whereIn('orcamento_id', $orcIds)->delete();
                if ($n > 0) {
                    $this->line("· orcamento_links_aprovacao: {$n}");
                }
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

    private function realignEmpSequence(): void
    {
        if (! Schema::hasTable('codigo_sequences') || ! Schema::hasTable('empresas')) {
            return;
        }

        $max = 0;
        foreach (DB::table('empresas')->pluck('codigo') as $codigo) {
            if (preg_match('/^EMP-(\d+)$/', (string) $codigo, $m) === 1) {
                $max = max($max, (int) $m[1]);
            }
        }

        $row = DB::table('codigo_sequences')
            ->whereNull('empresa_id')
            ->where('prefixo', 'EMP')
            ->first();

        if ($row === null) {
            DB::table('codigo_sequences')->insert([
                'empresa_id' => null,
                'prefixo' => 'EMP',
                'proximo' => $max + 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('codigo_sequences')->where('id', $row->id)->update([
                'proximo' => $max + 1,
                'updated_at' => now(),
            ]);
        }
    }
}
