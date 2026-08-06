<?php

namespace App\Jobs;

use App\Models\RelatorioPlanejamento;
use App\Services\Relatorio\RelatorioService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class PlanejarRelatorioJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 120;

    public function __construct(public readonly int $planejamentoId) {}

    public function handle(RelatorioService $service): void
    {
        $p = RelatorioPlanejamento::query()->find($this->planejamentoId);
        if ($p === null) {
            return;
        }
        $service->processarPlanejamento($p);
    }

    public function failed(?\Throwable $e): void
    {
        $p = RelatorioPlanejamento::query()->find($this->planejamentoId);
        if ($p === null || $p->status === RelatorioPlanejamento::STATUS_PRONTO) {
            return;
        }
        $p->update([
            'status' => RelatorioPlanejamento::STATUS_ERRO,
            'erro_mensagem' => mb_substr($e?->getMessage() ?? 'Falha no planejamento.', 0, 2000),
        ]);
    }
}
