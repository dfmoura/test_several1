<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Titulo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Higiene de laboratório: remove a cadeia pós-ORC de uma EMP e devolve
 * orçamentos ao rótulo UX "Em preparação" (RASCUNHO | CALCULADO).
 *
 * Cadeia: COB → BX → TIT RECEBER (comerciais) → FAT/ENT/DFS → OP/OS → PED
 * + links de aprovação / matriz cobrada / comissões ligadas.
 *
 * Preserva: ORCs (reset), PAR, produtos, OC/compras, ledger de estoque
 * (só nullifica FKs PED/OP/OS em MOV), plataforma, audit_log.
 *
 * Proibido em production. Wipe total: erp:limpar-operacional.
 * Ledger zerado (se OP já consumiu estoque): erp:limpar-estoque --empresa=…
 */
class LimparCadeiaPosOrcCommand extends Command
{
    protected $signature = 'erp:limpar-cadeia-pos-orc
                            {--empresa=EMP-00001 : Código da EMP (instalação)}
                            {--dry-run : Só inventaria; não altera}
                            {--force : Executa sem confirmação interativa}';

    protected $description = 'Limpa PED/OP/FAT/ENT/TIT RECEBER/BX/COB da EMP e deixa ORCs em preparação';

    /** Prefixos de documento da cadeia comercial (raiz e máscara anual). */
    private const DOC_PREFIX_ROOTS = [
        'PED', 'OP', 'OS', 'FAT', 'DFS', 'ENT', 'TIT', 'BX', 'COB', 'COM', 'CFE',
    ];

    public function handle(): int
    {
        $stage = (string) config('erp.stage', config('app.env', 'local'));
        if ($stage === 'production' || (string) config('app.env') === 'production') {
            $this->error('Recusado: erp:limpar-cadeia-pos-orc não roda em production.');

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

        $this->info("Limpeza cadeia pós-ORC · {$empresa->codigo} #{$empresaId} · stage={$stage}");
        $this->line('ORCs → Em preparação (RASCUNHO|CALCULADO); cadastro/OC/ledger preservados.');
        $counts = $this->inventory($empresaId);
        $this->table(['escopo', 'total', 'ação'], $counts);

        if ($dryRun) {
            $this->warn('Dry-run: nenhuma alteração.');

            return self::SUCCESS;
        }

        if (! $force && ! $this->confirm(
            'Confirma limpar PED/OP/FAT/ENT/receber/baixas desta EMP e repor ORCs em preparação?',
            false
        )) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($empresaId) {
            $this->breakCircularRefs($empresaId);
            $this->purgeComissoes($empresaId);
            $this->purgeFinanceiroReceber($empresaId);
            $this->purgeFaturamentoEntrega($empresaId);
            $this->purgeProducao($empresaId);
            $this->purgePedidos($empresaId);
            $this->resetOrcamentosPreparacao($empresaId);
            $this->realignSequences($empresaId);
        });

        $this->newLine();
        $this->info('Cadeia pós-ORC limpa; orçamentos em preparação.');
        $this->table(['escopo', 'total', 'ação'], $this->inventory($empresaId));
        $this->warn('Se OP/FAT já movimentou estoque, rode: php artisan erp:limpar-estoque --empresa='.$codigoEmp);

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

        $titIds = $this->tituloReceberComercialIds($empresaId);
        $bx = 0;
        $cob = 0;
        if ($titIds !== []) {
            if (Schema::hasTable('titulo_baixas')) {
                $bx = (int) DB::table('titulo_baixas')->whereIn('titulo_id', $titIds)->count();
            }
            if (Schema::hasTable('cobrancas')) {
                $cob = (int) DB::table('cobrancas')->whereIn('titulo_id', $titIds)->count();
            }
        }

        $orcPrep = 0;
        $orcReset = 0;
        if (Schema::hasTable('orcamentos')) {
            $orcPrep = (int) DB::table('orcamentos')
                ->where('empresa_id', $empresaId)
                ->whereIn('status', [Orcamento::STATUS_RASCUNHO, Orcamento::STATUS_CALCULADO])
                ->count();
            $orcReset = (int) DB::table('orcamentos')
                ->where('empresa_id', $empresaId)
                ->whereNotIn('status', [Orcamento::STATUS_RASCUNHO, Orcamento::STATUS_CALCULADO])
                ->count();
        }

        $rows[] = ['cobrancas (via TIT receber)', $cob, 'remover'];
        $rows[] = ['titulo_baixas (via TIT receber)', $bx, 'remover'];
        $rows[] = ['titulos RECEBER comerciais', count($titIds), 'remover'];
        $rows[] = ['faturamento_itens', $this->countFatItens($empresaId), 'remover'];
        $rows[] = ['documento_fiscal_saidas', $empCount('documento_fiscal_saidas'), 'remover'];
        $rows[] = ['entregas', $empCount('entregas'), 'remover'];
        $rows[] = ['faturamentos', $empCount('faturamentos'), 'remover'];
        $rows[] = ['comissoes', $empCount('comissoes'), 'remover'];
        $rows[] = ['comissao_fechamentos', $empCount('comissao_fechamentos'), 'remover'];
        $rows[] = ['ordem_producao_materiais', $empCount('ordem_producao_materiais'), 'remover'];
        $rows[] = ['ordens_producao', $empCount('ordens_producao'), 'remover'];
        $rows[] = ['ordens_servico', $empCount('ordens_servico'), 'remover'];
        $rows[] = ['pedido_itens', $this->countPedItens($empresaId), 'remover'];
        $rows[] = ['pedidos', $empCount('pedidos'), 'remover'];
        $rows[] = ['orcamento_links_aprovacao', $this->countLinksOrc($empresaId), 'remover'];
        $rows[] = ['matriz_cobradas', $empCount('matriz_cobradas'), 'remover'];
        $rows[] = ['orcamentos já em preparação', $orcPrep, 'preservar'];
        $rows[] = ['orcamentos → preparação', $orcReset, 'reset status/financeiro'];
        $rows[] = ['produtos / parceiros / OC', '—', 'preservar'];
        $rows[] = ['estoque_saldos / MOV', '—', 'preservar (FK PED/OP null)'];

        if (Schema::hasTable('audit_logs')) {
            $rows[] = ['audit_logs', $empCount('audit_logs'), 'preservar'];
        }

        return $rows;
    }

    private function breakCircularRefs(int $empresaId): void
    {
        if (Schema::hasTable('faturamentos') && Schema::hasColumn('faturamentos', 'adiantamento_titulo_id')) {
            DB::table('faturamentos')
                ->where('empresa_id', $empresaId)
                ->update(['adiantamento_titulo_id' => null]);
            $this->line('· faturamentos.adiantamento_titulo_id → null');
        }

        if (Schema::hasTable('titulos')) {
            $upd = [];
            if (Schema::hasColumn('titulos', 'faturamento_id')) {
                $upd['faturamento_id'] = null;
            }
            if (Schema::hasColumn('titulos', 'pedido_id')) {
                $upd['pedido_id'] = null;
            }
            if ($upd !== []) {
                // Só títulos que vamos apagar (receber comerciais); PAGAR/OC ficam.
                $titIds = $this->tituloReceberComercialIds($empresaId);
                if ($titIds !== []) {
                    DB::table('titulos')->whereIn('id', $titIds)->update($upd);
                    $this->line('· titulos comerciais: faturamento_id/pedido_id → null');
                }
            }
        }

        if (Schema::hasTable('orcamentos') && Schema::hasColumn('orcamentos', 'adiantamento_titulo_id')) {
            DB::table('orcamentos')
                ->where('empresa_id', $empresaId)
                ->update(['adiantamento_titulo_id' => null]);
            $this->line('· orcamentos.adiantamento_titulo_id → null');
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

        if (Schema::hasTable('estoque_movimentos')) {
            foreach (['pedido_id', 'ordem_producao_id', 'ordem_servico_id'] as $col) {
                if (Schema::hasColumn('estoque_movimentos', $col)) {
                    DB::table('estoque_movimentos')
                        ->where('empresa_id', $empresaId)
                        ->whereNotNull($col)
                        ->update([$col => null]);
                }
            }
            $this->line('· estoque_movimentos PED/OP/OS FKs → null');
        }
    }

    private function purgeComissoes(int $empresaId): void
    {
        if (Schema::hasTable('comissoes')) {
            $n = DB::table('comissoes')->where('empresa_id', $empresaId)->delete();
            $this->line("· comissoes: {$n} → 0");
        }
        if (Schema::hasTable('comissao_fechamentos')) {
            $n = DB::table('comissao_fechamentos')->where('empresa_id', $empresaId)->delete();
            $this->line("· comissao_fechamentos: {$n} → 0");
        }
    }

    private function purgeFinanceiroReceber(int $empresaId): void
    {
        $titIds = $this->tituloReceberComercialIds($empresaId);
        if ($titIds === []) {
            $this->line('· titulos RECEBER comerciais: nada');

            return;
        }

        if (Schema::hasTable('cobrancas')) {
            $n = DB::table('cobrancas')->whereIn('titulo_id', $titIds)->delete();
            $this->line("· cobrancas: {$n} → 0");
        }

        if (Schema::hasTable('titulo_baixas')) {
            $n = DB::table('titulo_baixas')->whereIn('titulo_id', $titIds)->delete();
            $this->line("· titulo_baixas: {$n} → 0");
        }

        $n = DB::table('titulos')->whereIn('id', $titIds)->delete();
        $this->line("· titulos RECEBER comerciais: {$n} → 0");
    }

    private function purgeFaturamentoEntrega(int $empresaId): void
    {
        $fatIds = Schema::hasTable('faturamentos')
            ? DB::table('faturamentos')->where('empresa_id', $empresaId)->pluck('id')->all()
            : [];

        if ($fatIds !== [] && Schema::hasTable('faturamento_itens')) {
            $n = DB::table('faturamento_itens')->whereIn('faturamento_id', $fatIds)->delete();
            $this->line("· faturamento_itens: {$n} → 0");
        }

        if (Schema::hasTable('documento_fiscal_saidas')) {
            $n = DB::table('documento_fiscal_saidas')->where('empresa_id', $empresaId)->delete();
            $this->line("· documento_fiscal_saidas: {$n} → 0");
        }

        if (Schema::hasTable('entregas')) {
            $n = DB::table('entregas')->where('empresa_id', $empresaId)->delete();
            $this->line("· entregas: {$n} → 0");
        }

        if (Schema::hasTable('faturamentos')) {
            $n = DB::table('faturamentos')->where('empresa_id', $empresaId)->delete();
            $this->line("· faturamentos: {$n} → 0");
        }
    }

    private function purgeProducao(int $empresaId): void
    {
        if (Schema::hasTable('ordem_producao_materiais')) {
            $n = DB::table('ordem_producao_materiais')->where('empresa_id', $empresaId)->delete();
            $this->line("· ordem_producao_materiais: {$n} → 0");
        }

        if (Schema::hasTable('ordens_producao')) {
            $n = DB::table('ordens_producao')->where('empresa_id', $empresaId)->delete();
            $this->line("· ordens_producao: {$n} → 0");
        }

        if (Schema::hasTable('ordens_servico')) {
            $n = DB::table('ordens_servico')->where('empresa_id', $empresaId)->delete();
            $this->line("· ordens_servico: {$n} → 0");
        }
    }

    private function purgePedidos(int $empresaId): void
    {
        $pedIds = Schema::hasTable('pedidos')
            ? DB::table('pedidos')->where('empresa_id', $empresaId)->pluck('id')->all()
            : [];

        if ($pedIds !== [] && Schema::hasTable('pedido_itens')) {
            $n = DB::table('pedido_itens')->whereIn('pedido_id', $pedIds)->delete();
            $this->line("· pedido_itens: {$n} → 0");
        }

        if (Schema::hasTable('pedidos')) {
            $n = DB::table('pedidos')->where('empresa_id', $empresaId)->delete();
            $this->line("· pedidos: {$n} → 0");
        }
    }

    /**
     * Devolve ORCs ao rótulo "Em preparação": RASCUNHO (sem cálculo) ou CALCULADO.
     * Limpa aceite/link/financeiro; preserva snapshots e valores comerciais.
     */
    private function resetOrcamentosPreparacao(int $empresaId): void
    {
        if (Schema::hasTable('orcamento_links_aprovacao')) {
            $orcIds = DB::table('orcamentos')->where('empresa_id', $empresaId)->pluck('id')->all();
            $n = $orcIds === []
                ? 0
                : DB::table('orcamento_links_aprovacao')->whereIn('orcamento_id', $orcIds)->delete();
            $this->line("· orcamento_links_aprovacao: {$n} → 0");
        }

        if (Schema::hasTable('matriz_cobradas')) {
            $n = DB::table('matriz_cobradas')->where('empresa_id', $empresaId)->delete();
            $this->line("· matriz_cobradas: {$n} → 0");
        }

        if (! Schema::hasTable('orcamentos')) {
            return;
        }

        $orcs = DB::table('orcamentos')->where('empresa_id', $empresaId)->get([
            'id',
            'status',
            'result_snapshot',
        ]);

        $nCalc = 0;
        $nRasc = 0;
        $nJa = 0;

        foreach ($orcs as $orc) {
            $temResultado = $orc->result_snapshot !== null && $orc->result_snapshot !== '';
            $alvo = $temResultado ? Orcamento::STATUS_CALCULADO : Orcamento::STATUS_RASCUNHO;

            if (in_array($orc->status, [Orcamento::STATUS_RASCUNHO, Orcamento::STATUS_CALCULADO], true)
                && $orc->status === $alvo
            ) {
                // Ainda limpa carimbos financeiros se sobraram de ciclo anterior.
                $limpo = $this->payloadOrcPreparacao($alvo);
                unset($limpo['status']);
                DB::table('orcamentos')->where('id', $orc->id)->update($limpo);
                $nJa++;

                continue;
            }

            DB::table('orcamentos')->where('id', $orc->id)->update($this->payloadOrcPreparacao($alvo));
            if ($alvo === Orcamento::STATUS_CALCULADO) {
                $nCalc++;
            } else {
                $nRasc++;
            }
        }

        $this->line("· orcamentos: reset→CALCULADO={$nCalc} RASCUNHO={$nRasc} já-prep={$nJa}");
    }

    /**
     * @return array<string, mixed>
     */
    private function payloadOrcPreparacao(string $status): array
    {
        $payload = [
            'status' => $status,
            'updated_at' => now(),
        ];

        $nullable = [
            'enviado_em',
            'visualizado_em',
            'decidido_em',
            'canal_aprovacao',
            'aceite_nome_cliente',
            'aceite_faixa_index',
            'aceite_ip',
            'aceite_user_agent',
            'motivo_decisao',
            'financeiro_status',
            'adiantamento_titulo_id',
        ];

        foreach ($nullable as $col) {
            if (Schema::hasColumn('orcamentos', $col)) {
                $payload[$col] = null;
            }
        }

        return $payload;
    }

    private function realignSequences(int $empresaId): void
    {
        if (! Schema::hasTable('codigo_sequences')) {
            return;
        }

        $roots = self::DOC_PREFIX_ROOTS;

        DB::table('codigo_sequences')
            ->where('empresa_id', $empresaId)
            ->where(function ($q) use ($roots) {
                $q->whereIn('prefixo', $roots);
                foreach ($roots as $root) {
                    $q->orWhere('prefixo', 'like', $root.'-%');
                }
            })
            ->update(['proximo' => 1]);

        // ORC permanece: realinha proximo ao maior numero do ano + 1.
        if (Schema::hasTable('orcamentos')) {
            $anos = DB::table('orcamentos')
                ->where('empresa_id', $empresaId)
                ->distinct()
                ->pluck('ano');
            foreach ($anos as $ano) {
                $maxAno = (int) DB::table('orcamentos')
                    ->where('empresa_id', $empresaId)
                    ->where('ano', $ano)
                    ->max('numero');
                $prefixo = 'ORC-'.$ano;
                $exists = DB::table('codigo_sequences')
                    ->where('empresa_id', $empresaId)
                    ->where('prefixo', $prefixo)
                    ->exists();
                if ($exists) {
                    DB::table('codigo_sequences')
                        ->where('empresa_id', $empresaId)
                        ->where('prefixo', $prefixo)
                        ->update(['proximo' => $maxAno + 1]);
                }
            }
        }

        $this->line('· sequences PED/OP/FAT/ENT/TIT/BX/COB → 1; ORC realinhado');
    }

    /**
     * TIT RECEBER da EMP ligados a ORC/PED/FAT (inclui adiantamento e fatura).
     * Não toca PAGAR (OC/compras) nem avulso sem vínculo comercial.
     *
     * @return list<int>
     */
    private function tituloReceberComercialIds(int $empresaId): array
    {
        if (! Schema::hasTable('titulos')) {
            return [];
        }

        $q = DB::table('titulos')
            ->where('empresa_id', $empresaId)
            ->where('tipo', Titulo::TIPO_RECEBER);

        $q->where(function ($inner) {
            $inner->whereNotNull('orcamento_id')
                ->orWhereNotNull('pedido_id')
                ->orWhereNotNull('faturamento_id');
        });

        return $q->pluck('id')->map(fn ($id) => (int) $id)->all();
    }

    private function countFatItens(int $empresaId): int
    {
        if (! Schema::hasTable('faturamentos') || ! Schema::hasTable('faturamento_itens')) {
            return 0;
        }
        $ids = DB::table('faturamentos')->where('empresa_id', $empresaId)->pluck('id')->all();
        if ($ids === []) {
            return 0;
        }

        return (int) DB::table('faturamento_itens')->whereIn('faturamento_id', $ids)->count();
    }

    private function countPedItens(int $empresaId): int
    {
        if (! Schema::hasTable('pedidos') || ! Schema::hasTable('pedido_itens')) {
            return 0;
        }
        $ids = DB::table('pedidos')->where('empresa_id', $empresaId)->pluck('id')->all();
        if ($ids === []) {
            return 0;
        }

        return (int) DB::table('pedido_itens')->whereIn('pedido_id', $ids)->count();
    }

    private function countLinksOrc(int $empresaId): int
    {
        if (! Schema::hasTable('orcamento_links_aprovacao') || ! Schema::hasTable('orcamentos')) {
            return 0;
        }
        $ids = DB::table('orcamentos')->where('empresa_id', $empresaId)->pluck('id')->all();
        if ($ids === []) {
            return 0;
        }

        return (int) DB::table('orcamento_links_aprovacao')->whereIn('orcamento_id', $ids)->count();
    }
}
