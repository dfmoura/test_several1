<?php

namespace App\Console\Commands;

use App\Models\Relatorio;
use App\Models\RelatorioExecucao;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Retenção operacional (impacto computacional §7 / §8-R6):
 *  - PDFs com mais de N dias: apaga arquivo, mantém linha (arquivo expirado).
 *  - relatorio_execucoes com mais de M dias: hard delete (barato, auditável).
 *
 * Idempotente. Dry-run com --dry-run.
 */
class PurgarRelatorios extends Command
{
    protected $signature = 'relatorios:purgar
                            {--dry-run : Lista o que seria removido sem alterar nada}
                            {--pdf-dias= : Sobrescreve RELATORIO_PDF_RETENCAO_DIAS}
                            {--exec-dias= : Sobrescreve RELATORIO_EXECUCAO_RETENCAO_DIAS}';

    protected $description = 'Purge PDFs antigos (mantém registro) e logs de execução de IA';

    public function handle(): int
    {
        $pdfDias = $this->option('pdf-dias') !== null
            ? (int) $this->option('pdf-dias')
            : (int) config('erp.relatorio_pdf_retencao_dias', 180);
        $execDias = $this->option('exec-dias') !== null
            ? (int) $this->option('exec-dias')
            : (int) config('erp.relatorio_execucao_retencao_dias', 90);
        $dry = (bool) $this->option('dry-run');

        $pdfRemovidos = 0;
        $execRemovidos = 0;

        if ($pdfDias > 0) {
            $corte = now()->subDays($pdfDias);
            $q = Relatorio::query()
                ->whereNotNull('arquivo_path')
                ->where('arquivo_path', '!=', '')
                ->where('created_at', '<', $corte);

            $q->orderBy('id')->chunkById(100, function ($rows) use ($dry, &$pdfRemovidos) {
                foreach ($rows as $relatorio) {
                    /** @var Relatorio $relatorio */
                    $path = (string) $relatorio->arquivo_path;
                    if ($dry) {
                        $this->line("PDF dry-run: #{$relatorio->id} {$relatorio->codigo} → {$path}");
                        $pdfRemovidos++;

                        continue;
                    }

                    if ($path !== '') {
                        Storage::disk('local')->delete($path);
                    }
                    $relatorio->update(['arquivo_path' => null]);
                    $pdfRemovidos++;
                }
            });
        } else {
            $this->warn('Retenção de PDF desligada (relatorio_pdf_retencao_dias=0).');
        }

        if ($execDias > 0) {
            $corteExec = now()->subDays($execDias);
            if ($dry) {
                $execRemovidos = RelatorioExecucao::query()
                    ->where('created_at', '<', $corteExec)
                    ->count();
                $this->line("Execuções dry-run: {$execRemovidos} linha(s) com created_at < {$corteExec->toDateTimeString()}");
            } else {
                // Delete em lotes para não travar o InnoDB em bases maiores.
                do {
                    $ids = RelatorioExecucao::query()
                        ->where('created_at', '<', $corteExec)
                        ->orderBy('id')
                        ->limit(500)
                        ->pluck('id');
                    if ($ids->isEmpty()) {
                        break;
                    }
                    $n = RelatorioExecucao::query()->whereIn('id', $ids)->delete();
                    $execRemovidos += $n;
                } while ($ids->count() === 500);
            }
        } else {
            $this->warn('Retenção de execuções desligada (relatorio_execucao_retencao_dias=0).');
        }

        $prefix = $dry ? '[dry-run] ' : '';
        $this->info("{$prefix}PDFs expirados: {$pdfRemovidos} · execuções purgadas: {$execRemovidos}");

        return self::SUCCESS;
    }
}
