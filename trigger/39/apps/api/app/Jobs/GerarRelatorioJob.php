<?php

namespace App\Jobs;

use App\Models\Relatorio;
use App\Services\Relatorio\RelatorioService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\MaxAttemptsExceededException;
use Illuminate\Queue\SerializesModels;

class GerarRelatorioJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 240;

    public function __construct(public readonly int $relatorioId) {}

    public function handle(RelatorioService $service): void
    {
        // Relatórios com SVG (mapa de facas) precisam de folga além do php.ini 256M.
        @ini_set('memory_limit', '384M');

        $relatorio = Relatorio::query()->find($this->relatorioId);
        if ($relatorio === null) {
            return;
        }

        $service->processar($relatorio);
    }

    public function failed(?\Throwable $e): void
    {
        $relatorio = Relatorio::query()->find($this->relatorioId);
        if ($relatorio === null) {
            return;
        }

        if (in_array($relatorio->status, [Relatorio::STATUS_CONCLUIDO, Relatorio::STATUS_ERRO], true)
            && filled($relatorio->erro_mensagem)
            && ! str_contains((string) $relatorio->erro_mensagem, 'attempted too many times')) {
            return;
        }

        $msg = $this->mensagemAmigavel($e);

        $relatorio->update([
            'status' => Relatorio::STATUS_ERRO,
            'erro_mensagem' => mb_substr($msg, 0, 2000),
        ]);
    }

    private function mensagemAmigavel(?\Throwable $e): string
    {
        $raw = $e?->getMessage() ?? 'Falha desconhecida na fila.';
        $prev = $e?->getPrevious()?->getMessage() ?? '';
        $blob = $raw.' '.$prev;

        if (str_contains($blob, 'Allowed memory size') || str_contains($blob, 'memory')) {
            return 'Memória insuficiente ao gerar o PDF. Para mapa de facas com desenho, o sistema limita a 60 linhas — use filtros (formato/máquina) ou reprocesse.';
        }

        if ($e instanceof MaxAttemptsExceededException || str_contains($raw, 'attempted too many times')) {
            return 'O processamento do relatório foi interrompido. Clique em Reprocessar. Se for mapa de facas com desenho, prefira filtros (ex.: formato RETA).';
        }

        return $raw;
    }
}
