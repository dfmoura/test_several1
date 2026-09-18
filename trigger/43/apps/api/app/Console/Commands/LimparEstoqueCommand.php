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
 * entrada/virada/AJU do zero.
 *
 * Padrão (sem flags): preserva produtos, PAR, endereços, DF-e; reabre OC recebida.
 * `--com-oc`: apaga OCs (+ NEC/COT da EMP) e desamarra DF-e (caixa permanece).
 * `--com-produtos`: apaga SKUs + de-para da EMP (implica `--com-oc`; limpa materiais OP).
 *
 * Não toca ORC/PED/FAT/parceiros/usuários/plataforma/audit_log.
 * Proibido em production. Wipe total: erp:limpar-operacional.
 * Cadeia comercial (PED→TIT) sem apagar ORC: erp:limpar-cadeia-pos-orc.
 */
class LimparEstoqueCommand extends Command
{
    protected $signature = 'erp:limpar-estoque
                            {--empresa=EMP-00001 : Código da EMP (instalação)}
                            {--com-oc : Apaga OCs (e NEC/COT) da EMP; desamarra DF-e}
                            {--com-produtos : Apaga cadastro de produtos + de-para (implica --com-oc)}
                            {--dry-run : Só inventaria; não altera}
                            {--force : Executa sem confirmação interativa}';

    protected $description = 'Zera ledger de estoque da EMP; opcionalmente OCs e cadastro de produtos';

    /** Prefixos de documento de estoque (raiz e máscara anual). */
    private const ESTOQUE_DOC_PREFIX_ROOTS = ['MOV', 'AJU', 'INV', 'ENT'];

    /** Prefixos extras ao apagar OC / produtos. */
    private const OC_DOC_PREFIX_ROOTS = ['OC', 'NEC', 'COT'];

    private const PRODUTO_DOC_PREFIX_ROOTS = ['PRD', 'MP', 'EMB', 'REV', 'PA', 'SVC', 'FAC', 'MUC'];

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
        $comProdutos = (bool) $this->option('com-produtos');
        $comOc = (bool) $this->option('com-oc') || $comProdutos;
        $empresaId = (int) $empresa->id;

        $modo = 'ledger';
        if ($comProdutos) {
            $modo = 'ledger+OC+produtos';
        } elseif ($comOc) {
            $modo = 'ledger+OC';
        }

        $this->info("Limpeza de estoque · {$empresa->codigo} #{$empresaId} · stage={$stage} · modo={$modo}");
        $counts = $this->inventory($empresaId, $comOc, $comProdutos);
        $this->table(['escopo', 'total', 'ação'], $counts);

        if ($dryRun) {
            $this->warn('Dry-run: nenhuma alteração.');

            return self::SUCCESS;
        }

        $prompt = match (true) {
            $comProdutos => 'Confirma zerar estoque + apagar OCs + cadastro de produtos desta EMP?',
            $comOc => 'Confirma zerar estoque + apagar OCs desta EMP?',
            default => 'Confirma zerar o ledger de estoque desta EMP? (irreversível)',
        };

        if (! $force && ! $this->confirm($prompt, false)) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($empresaId, $comOc, $comProdutos) {
            $this->breakCircularRefs($empresaId);
            $this->purgeTitulosDeEntrada($empresaId);
            $this->purgeNfeEntradas($empresaId);
            $this->purgeLedger($empresaId);

            if ($comOc) {
                $this->purgeCompras($empresaId);
            } else {
                $this->reabrirOrdensCompra($empresaId);
                $this->reabrirDfeRecebidos($empresaId);
            }

            if ($comProdutos) {
                $this->purgeProdutos($empresaId);
            }

            $this->realignSequences($empresaId, $comOc, $comProdutos);
        });

        $this->newLine();
        $this->info(match (true) {
            $comProdutos => 'Estoque, OCs e produtos zerados.',
            $comOc => 'Estoque e OCs zerados.',
            default => 'Estoque zerado.',
        });
        $this->table(['escopo', 'total', 'ação'], $this->inventory($empresaId, $comOc, $comProdutos));

        return self::SUCCESS;
    }

    /**
     * @return list<array{0: string, 1: int|string, 2: string}>
     */
    private function inventory(int $empresaId, bool $comOc, bool $comProdutos): array
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

        if ($comOc) {
            $rows[] = ['ordens_compra', $empCount('ordens_compra'), 'remover'];
            $rows[] = ['ordem_compra_itens', $this->countOcItens($empresaId), 'remover'];
            $rows[] = ['compra_necessidades', $empCount('compra_necessidades'), 'remover'];
            $rows[] = ['cotacoes', $empCount('cotacoes'), 'remover'];
            $rows[] = ['DF-e amarradas', $this->countDfeAmarradas($empresaId), '→ DISPONIVEL (desamarrar)'];
        } else {
            $rows[] = ['OC PARCIAL/RECEBIDA', $ocReabrir, '→ ABERTA + qtde_recebida=0'];
            $rows[] = ['DF-e RECEBIDA', $dfeReabrir, '→ AMARRADA/DISPONIVEL'];
        }

        $rows[] = ['estoque_enderecos', $empCount('estoque_enderecos'), 'preservar'];

        if ($comProdutos) {
            $rows[] = ['produto_fornecedor_codigos', $empCount('produto_fornecedor_codigos'), 'remover'];
            $rows[] = ['ordem_producao_materiais', $empCount('ordem_producao_materiais'), 'remover (FK produto)'];
            $rows[] = ['produtos', $empCount('produtos'), 'remover'];
        } else {
            $rows[] = ['produtos', $empCount('produtos'), 'preservar'];
        }

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

    /**
     * Apaga OCs / NEC / COT da EMP e desamarra DF-e (caixa permanece DISPONIVEL).
     */
    private function purgeCompras(int $empresaId): void
    {
        if (Schema::hasTable('dfe_documentos')) {
            $n = DB::table('dfe_documentos')
                ->where('empresa_id', $empresaId)
                ->whereNotNull('ordem_compra_id')
                ->update([
                    'ordem_compra_id' => null,
                    'situacao' => DfeDocumento::SITUACAO_DISPONIVEL,
                ]);
            $this->line("· DF-e desamarradas: {$n} → DISPONIVEL");
        }

        $ocIds = Schema::hasTable('ordens_compra')
            ? DB::table('ordens_compra')->where('empresa_id', $empresaId)->pluck('id')->all()
            : [];

        if ($ocIds !== [] && Schema::hasTable('ordem_compra_itens')) {
            $n = DB::table('ordem_compra_itens')->whereIn('ordem_compra_id', $ocIds)->delete();
            $this->line("· ordem_compra_itens: {$n} → 0");
        }

        if (Schema::hasTable('ordens_compra')) {
            // SoftDeletes: delete físico para liberar código/unique e cadastro limpo.
            $n = DB::table('ordens_compra')->where('empresa_id', $empresaId)->delete();
            $this->line("· ordens_compra: {$n} → 0");
        }

        if (Schema::hasTable('cotacoes')) {
            $cotIds = DB::table('cotacoes')->where('empresa_id', $empresaId)->pluck('id')->all();
            if ($cotIds !== []) {
                if (Schema::hasTable('cotacao_propostas')) {
                    DB::table('cotacao_propostas')->whereIn('cotacao_id', $cotIds)->delete();
                }
                if (Schema::hasTable('cotacao_itens')) {
                    DB::table('cotacao_itens')->whereIn('cotacao_id', $cotIds)->delete();
                }
                $n = DB::table('cotacoes')->where('empresa_id', $empresaId)->delete();
                $this->line("· cotacoes: {$n} → 0");
            }
        }

        if (Schema::hasTable('compra_necessidades')) {
            $n = DB::table('compra_necessidades')->where('empresa_id', $empresaId)->delete();
            $this->line("· compra_necessidades: {$n} → 0");
        }
    }

    /**
     * Remove SKUs + de-para da EMP. Pré-requisito: ledger e OCs já limpos.
     * Materiais de OP são removidos (RESTRICT em produto_id); PED/ORC permanecem.
     */
    private function purgeProdutos(int $empresaId): void
    {
        if (Schema::hasTable('ordem_producao_materiais')) {
            $n = DB::table('ordem_producao_materiais')->where('empresa_id', $empresaId)->delete();
            $this->line("· ordem_producao_materiais: {$n} → 0");
        }

        if (Schema::hasTable('pedido_itens') && Schema::hasColumn('pedido_itens', 'produto_pa_id')) {
            $n = DB::table('pedido_itens')
                ->where('empresa_id', $empresaId)
                ->whereNotNull('produto_pa_id')
                ->update(['produto_pa_id' => null]);
            if ($n > 0) {
                $this->line("· pedido_itens.produto_pa_id: {$n} → null");
            }
        }

        if (Schema::hasTable('produto_fornecedor_codigos')) {
            $n = DB::table('produto_fornecedor_codigos')->where('empresa_id', $empresaId)->delete();
            $this->line("· produto_fornecedor_codigos: {$n} → 0");
        }

        if (Schema::hasTable('produtos')) {
            $n = DB::table('produtos')->where('empresa_id', $empresaId)->delete();
            $this->line("· produtos: {$n} → 0");
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

    private function realignSequences(int $empresaId, bool $comOc = false, bool $comProdutos = false): void
    {
        if (! Schema::hasTable('codigo_sequences')) {
            return;
        }

        $roots = self::ESTOQUE_DOC_PREFIX_ROOTS;
        if ($comOc) {
            $roots = array_merge($roots, self::OC_DOC_PREFIX_ROOTS);
        }
        if ($comProdutos) {
            $roots = array_merge($roots, self::PRODUTO_DOC_PREFIX_ROOTS);
        }

        DB::table('codigo_sequences')
            ->where('empresa_id', $empresaId)
            ->where(function ($q) use ($roots) {
                $q->whereIn('prefixo', $roots);
                foreach ($roots as $root) {
                    $q->orWhere('prefixo', 'like', $root.'-%');
                }
            })
            ->update(['proximo' => 1]);

        $label = 'MOV/AJU/INV/ENT';
        if ($comOc) {
            $label .= '/OC';
        }
        if ($comProdutos) {
            $label .= '/PRD';
        }
        $this->line("· sequences {$label} → 1");
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

    private function countOcItens(int $empresaId): int
    {
        if (! Schema::hasTable('ordens_compra') || ! Schema::hasTable('ordem_compra_itens')) {
            return 0;
        }
        $ids = DB::table('ordens_compra')->where('empresa_id', $empresaId)->pluck('id')->all();
        if ($ids === []) {
            return 0;
        }

        return (int) DB::table('ordem_compra_itens')->whereIn('ordem_compra_id', $ids)->count();
    }

    private function countDfeAmarradas(int $empresaId): int
    {
        if (! Schema::hasTable('dfe_documentos')) {
            return 0;
        }

        return (int) DB::table('dfe_documentos')
            ->where('empresa_id', $empresaId)
            ->whereNotNull('ordem_compra_id')
            ->count();
    }
}
