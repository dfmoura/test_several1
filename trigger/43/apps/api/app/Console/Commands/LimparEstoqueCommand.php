<?php

namespace App\Console\Commands;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * Higiene de laboratório: zera o ledger de estoque de uma EMP para retestar
 * entrada/virada/AJU do zero — sem apagar cadastro (produto/PAR/plataforma).
 *
 * Preserva: produtos, parceiros, usuários, EMP, RBAC, endereços físicos, audit_log,
 * DF-e na caixa (volta RECEBIDA→AMARRADA/DISPONIVEL), OCs (reabre recebimento).
 *
 * Proibido em production. Para wipe total de documentos: erp:limpar-operacional.
 */
class LimparEstoqueCommand extends Command
{
    protected $signature = 'erp:limpar-estoque
                            {--empresa=EMP-00001 : Código da EMP (instalação)}
                            {--dry-run : Só inventaria; não altera}
                            {--force : Executa sem confirmação interativa}';

    protected $description = 'Zera ledger de estoque da EMP (saldos/lotes/MOV/AJU/INV/NF-e entrada) preservando cadastros';

    /** Prefixos de documento de estoque (raiz e máscara anual). */
    private const ESTOQUE_DOC_PREFIX_ROOTS = ['MOV', 'AJU', 'INV', 'ENT'];

    public function handle(): int
    {
        $stage = (string) config('erp.stage', config('app.env', 'local'));
        if ($stage === 'production' || (string) config('app.env') === 'production') {
            $this->error('Recusado: erp:limpar-estoque não roda em production.');

            return self::FAILURE;
        }

        $codigoEmp = (string) $this->option('empresa');
        $empresa = Empresa::query()->where('codigo', $codigoEmp)->first();
        if ($empresa === null) {
            $this->error("Empresa {$codigoEmp} não encontrada.");

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');
        $empresaId = (int) $empresa->id;

        $this->info("Limpeza de estoque · {$empresa->codigo} #{$empresaId} · stage={$stage}");
        $counts = $this->inventory($empresaId);
        $this->table(['escopo', 'total', 'ação'], $counts);

        if ($dryRun) {
            $this->warn('Dry-run: nenhuma alteração.');

            return self::SUCCESS;
        }

        if (! $force && ! $this->confirm('Confirma zerar o ledger de estoque desta EMP? (irreversível)', false)) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($empresaId) {
            $this->breakCircularRefs($empresaId);
            $this->purgeTitulosDeEntrada($empresaId);
            $this->purgeNfeEntradas($empresaId);
            $this->purgeLedger($empresaId);
            $this->reabrirOrdensCompra($empresaId);
            $this->reabrirDfeRecebidos($empresaId);
            $this->realignSequences($empresaId);
        });

        $this->newLine();
        $this->info('Estoque zerado.');
        $this->table(['escopo', 'total', 'ação'], $this->inventory($empresaId));

        return self::SUCCESS;
    }

    /**
     * @return list<array{0: string, 1: int|string, 2: string}>
     */
    private function inventory(int $empresaId): array
    {
        $rows = [];
        $empCount = function (string $table) use ($empresaId): int {
            if (! Schema::hasTable($table)) {
                return 0;
            }
            $q = DB::table($table);
            if (Schema::hasColumn($table, 'empresa_id')) {
                $q->where('empresa_id', $empresaId);
            }

            return (int) $q->count();
        };

        $movIds = $this->movimentoIds($empresaId);
        $titMov = 0;
        if (Schema::hasTable('titulos') && $movIds !== []) {
            $titMov = (int) DB::table('titulos')
                ->where('empresa_id', $empresaId)
                ->whereIn('movimento_id', $movIds)
                ->count();
        }

        $ocReabrir = 0;
        if (Schema::hasTable('ordens_compra')) {
            $ocReabrir = (int) DB::table('ordens_compra')
                ->where('empresa_id', $empresaId)
                ->whereIn('status', [OrdemCompra::STATUS_PARCIAL, OrdemCompra::STATUS_RECEBIDA])
                ->count();
        }

        $dfeReabrir = 0;
        if (Schema::hasTable('dfe_documentos')) {
            $dfeReabrir = (int) DB::table('dfe_documentos')
                ->where('empresa_id', $empresaId)
                ->where('situacao', DfeDocumento::SITUACAO_RECEBIDA)
                ->count();
        }

        $rows[] = ['estoque_saldos', $empCount('estoque_saldos'), 'remover'];
        $rows[] = ['estoque_lotes', $empCount('estoque_lotes'), 'remover'];
        $rows[] = ['estoque_movimento_itens', $this->countItensMov($empresaId), 'remover'];
        $rows[] = ['estoque_movimentos', $empCount('estoque_movimentos'), 'remover'];
        $rows[] = ['estoque_ajustes', $empCount('estoque_ajustes'), 'remover'];
        $rows[] = ['estoque_inventario_itens', $this->countInvItens($empresaId), 'remover'];
        $rows[] = ['estoque_inventarios', $empCount('estoque_inventarios'), 'remover'];
        $rows[] = ['nfe_entrada_itens', $this->countNfeItens($empresaId), 'remover'];
        $rows[] = ['nfe_entradas', $empCount('nfe_entradas'), 'remover'];
        $rows[] = ['titulos (via MOV)', $titMov, 'remover'];
        $rows[] = ['OC PARCIAL/RECEBIDA', $ocReabrir, '→ ABERTA + qtde_recebida=0'];
        $rows[] = ['DF-e RECEBIDA', $dfeReabrir, '→ AMARRADA/DISPONIVEL'];
        $rows[] = ['estoque_enderecos', $empCount('estoque_enderecos'), 'preservar'];
        $rows[] = ['produtos', $empCount('produtos'), 'preservar'];
        if (Schema::hasTable('audit_logs')) {
            $rows[] = ['audit_logs', $empCount('audit_logs'), 'preservar'];
        }

        return $rows;
    }

    private function breakCircularRefs(int $empresaId): void
    {
        if (Schema::hasTable('estoque_movimentos') && Schema::hasColumn('estoque_movimentos', 'ajuste_id')) {
            DB::table('estoque_movimentos')
                ->where('empresa_id', $empresaId)
                ->update(['ajuste_id' => null]);
            $this->line('· estoque_movimentos.ajuste_id → null');
        }

        if (Schema::hasTable('estoque_ajustes') && Schema::hasColumn('estoque_ajustes', 'movimento_id')) {
            DB::table('estoque_ajustes')
                ->where('empresa_id', $empresaId)
                ->update(['movimento_id' => null]);
            $this->line('· estoque_ajustes.movimento_id → null');
        }

        if (Schema::hasTable('ordens_producao') && Schema::hasColumn('ordens_producao', 'pa_movimento_id')) {
            DB::table('ordens_producao')
                ->where('empresa_id', $empresaId)
                ->update(['pa_movimento_id' => null]);
            $this->line('· ordens_producao.pa_movimento_id → null');
        }

        if (Schema::hasTable('ordem_producao_materiais')) {
            $opIds = Schema::hasTable('ordens_producao')
                ? DB::table('ordens_producao')->where('empresa_id', $empresaId)->pluck('id')->all()
                : [];
            if ($opIds !== []) {
                $upd = [];
                if (Schema::hasColumn('ordem_producao_materiais', 'saida_movimento_id')) {
                    $upd['saida_movimento_id'] = null;
                }
                if (Schema::hasColumn('ordem_producao_materiais', 'retorno_movimento_id')) {
                    $upd['retorno_movimento_id'] = null;
                }
                if ($upd !== []) {
                    DB::table('ordem_producao_materiais')->whereIn('ordem_producao_id', $opIds)->update($upd);
                    $this->line('· ordem_producao_materiais MOV FKs → null');
                }
            }
        }

        if (Schema::hasTable('estoque_movimento_itens') && Schema::hasColumn('estoque_movimento_itens', 'lote_id')) {
            $movIds = $this->movimentoIds($empresaId);
            if ($movIds !== []) {
                DB::table('estoque_movimento_itens')
                    ->whereIn('movimento_id', $movIds)
                    ->update(['lote_id' => null]);
            }
        }

        if (Schema::hasTable('estoque_ajustes') && Schema::hasColumn('estoque_ajustes', 'lote_id')) {
            DB::table('estoque_ajustes')
                ->where('empresa_id', $empresaId)
                ->update(['lote_id' => null]);
        }

        $this->line('· lote_id em itens/AJU → null');
    }

    private function purgeTitulosDeEntrada(int $empresaId): void
    {
        if (! Schema::hasTable('titulos')) {
            return;
        }

        $movIds = $this->movimentoIds($empresaId);
        if ($movIds === []) {
            $this->line('· titulos via MOV: nada');

            return;
        }

        $titIds = DB::table('titulos')
            ->where('empresa_id', $empresaId)
            ->whereIn('movimento_id', $movIds)
            ->pluck('id')
            ->all();

        if ($titIds === []) {
            $this->line('· titulos via MOV: nada');

            return;
        }

        if (Schema::hasTable('titulo_baixas')) {
            $nBx = DB::table('titulo_baixas')->whereIn('titulo_id', $titIds)->delete();
            $this->line("· titulo_baixas: {$nBx} → 0");
        }

        $n = DB::table('titulos')->whereIn('id', $titIds)->delete();
        $this->line("· titulos (via MOV): {$n} → 0");
    }

    private function purgeNfeEntradas(int $empresaId): void
    {
        if (! Schema::hasTable('nfe_entradas')) {
            return;
        }

        $nfeIds = DB::table('nfe_entradas')->where('empresa_id', $empresaId)->pluck('id')->all();
        if ($nfeIds !== [] && Schema::hasTable('nfe_entrada_itens')) {
            $n = DB::table('nfe_entrada_itens')->whereIn('nfe_entrada_id', $nfeIds)->delete();
            $this->line("· nfe_entrada_itens: {$n} → 0");
        }

        $n = DB::table('nfe_entradas')->where('empresa_id', $empresaId)->delete();
        $this->line("· nfe_entradas: {$n} → 0");

        if (Storage::disk('local')->exists('nfe-entradas')) {
            // Só remove XMLs desta EMP se path for por id — limpeza best-effort do espelho local.
            Storage::disk('local')->deleteDirectory('nfe-entradas/'.$empresaId);
            $this->line('· storage nfe-entradas/'.$empresaId.' (se existir)');
        }
    }

    private function purgeLedger(int $empresaId): void
    {
        $movIds = $this->movimentoIds($empresaId);

        if ($movIds !== [] && Schema::hasTable('estoque_movimento_itens')) {
            $n = DB::table('estoque_movimento_itens')->whereIn('movimento_id', $movIds)->delete();
            $this->line("· estoque_movimento_itens: {$n} → 0");
        }

        if (Schema::hasTable('estoque_movimentos')) {
            $n = DB::table('estoque_movimentos')->where('empresa_id', $empresaId)->delete();
            $this->line("· estoque_movimentos: {$n} → 0");
        }

        if (Schema::hasTable('estoque_ajustes')) {
            $n = DB::table('estoque_ajustes')->where('empresa_id', $empresaId)->delete();
            $this->line("· estoque_ajustes: {$n} → 0");
        }

        if (Schema::hasTable('estoque_inventarios')) {
            $invIds = DB::table('estoque_inventarios')->where('empresa_id', $empresaId)->pluck('id')->all();
            if ($invIds !== [] && Schema::hasTable('estoque_inventario_itens')) {
                $n = DB::table('estoque_inventario_itens')->whereIn('inventario_id', $invIds)->delete();
                $this->line("· estoque_inventario_itens: {$n} → 0");
            }
            $n = DB::table('estoque_inventarios')->where('empresa_id', $empresaId)->delete();
            $this->line("· estoque_inventarios: {$n} → 0");
        }

        if (Schema::hasTable('estoque_lotes')) {
            $n = DB::table('estoque_lotes')->where('empresa_id', $empresaId)->delete();
            $this->line("· estoque_lotes: {$n} → 0");
        }

        if (Schema::hasTable('estoque_saldos')) {
            $n = DB::table('estoque_saldos')->where('empresa_id', $empresaId)->delete();
            $this->line("· estoque_saldos: {$n} → 0");
        }
    }

    private function reabrirOrdensCompra(int $empresaId): void
    {
        if (! Schema::hasTable('ordens_compra')) {
            return;
        }

        $ocIds = DB::table('ordens_compra')
            ->where('empresa_id', $empresaId)
            ->whereIn('status', [OrdemCompra::STATUS_PARCIAL, OrdemCompra::STATUS_RECEBIDA])
            ->pluck('id')
            ->all();

        if ($ocIds === []) {
            // Ainda zera qtde_recebida residual em ABERTA (dados sujos de lab).
            if (Schema::hasTable('ordem_compra_itens')) {
                $allOc = DB::table('ordens_compra')->where('empresa_id', $empresaId)->pluck('id')->all();
                if ($allOc !== []) {
                    $n = DB::table('ordem_compra_itens')
                        ->whereIn('ordem_compra_id', $allOc)
                        ->where('qtde_recebida', '>', 0)
                        ->update(['qtde_recebida' => 0]);
                    if ($n > 0) {
                        $this->line("· ordem_compra_itens.qtde_recebida residual: {$n} → 0");
                    }
                }
            }
            $this->line('· OC: nenhuma PARCIAL/RECEBIDA');

            return;
        }

        if (Schema::hasTable('ordem_compra_itens')) {
            DB::table('ordem_compra_itens')
                ->whereIn('ordem_compra_id', $ocIds)
                ->update(['qtde_recebida' => 0]);
        }

        $n = DB::table('ordens_compra')
            ->whereIn('id', $ocIds)
            ->update(['status' => OrdemCompra::STATUS_ABERTA]);

        $this->line("· OC reabertas: {$n} → ABERTA (qtde_recebida=0)");
    }

    private function reabrirDfeRecebidos(int $empresaId): void
    {
        if (! Schema::hasTable('dfe_documentos')) {
            return;
        }

        $docs = DB::table('dfe_documentos')
            ->where('empresa_id', $empresaId)
            ->where('situacao', DfeDocumento::SITUACAO_RECEBIDA)
            ->get(['id', 'ordem_compra_id']);

        $nAmar = 0;
        $nDisp = 0;
        foreach ($docs as $doc) {
            $situacao = $doc->ordem_compra_id
                ? DfeDocumento::SITUACAO_AMARRADA
                : DfeDocumento::SITUACAO_DISPONIVEL;
            DB::table('dfe_documentos')->where('id', $doc->id)->update(['situacao' => $situacao]);
            if ($situacao === DfeDocumento::SITUACAO_AMARRADA) {
                $nAmar++;
            } else {
                $nDisp++;
            }
        }

        $this->line("· DF-e RECEBIDA → AMARRADA={$nAmar} DISPONIVEL={$nDisp}");
    }

    private function realignSequences(int $empresaId): void
    {
        if (! Schema::hasTable('codigo_sequences')) {
            return;
        }

        DB::table('codigo_sequences')
            ->where('empresa_id', $empresaId)
            ->where(function ($q) {
                $q->whereIn('prefixo', self::ESTOQUE_DOC_PREFIX_ROOTS);
                foreach (self::ESTOQUE_DOC_PREFIX_ROOTS as $root) {
                    $q->orWhere('prefixo', 'like', $root.'-%');
                }
            })
            ->update(['proximo' => 1]);

        $this->line('· sequences MOV/AJU/INV/ENT → 1');
    }

    /** @return list<int> */
    private function movimentoIds(int $empresaId): array
    {
        if (! Schema::hasTable('estoque_movimentos')) {
            return [];
        }

        return DB::table('estoque_movimentos')
            ->where('empresa_id', $empresaId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function countItensMov(int $empresaId): int
    {
        if (! Schema::hasTable('estoque_movimento_itens')) {
            return 0;
        }
        $movIds = $this->movimentoIds($empresaId);
        if ($movIds === []) {
            return 0;
        }

        return (int) DB::table('estoque_movimento_itens')->whereIn('movimento_id', $movIds)->count();
    }

    private function countInvItens(int $empresaId): int
    {
        if (! Schema::hasTable('estoque_inventarios') || ! Schema::hasTable('estoque_inventario_itens')) {
            return 0;
        }
        $invIds = DB::table('estoque_inventarios')->where('empresa_id', $empresaId)->pluck('id')->all();
        if ($invIds === []) {
            return 0;
        }

        return (int) DB::table('estoque_inventario_itens')->whereIn('inventario_id', $invIds)->count();
    }

    private function countNfeItens(int $empresaId): int
    {
        if (! Schema::hasTable('nfe_entradas') || ! Schema::hasTable('nfe_entrada_itens')) {
            return 0;
        }
        $ids = DB::table('nfe_entradas')->where('empresa_id', $empresaId)->pluck('id')->all();
        if ($ids === []) {
            return 0;
        }

        return (int) DB::table('nfe_entrada_itens')->whereIn('nfe_entrada_id', $ids)->count();
    }
}
