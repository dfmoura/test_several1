<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Models\EmpresaCertificadoA1;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use App\Services\Compras\DfeSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Sync DF-e delta (NSU) para EMPs com A1 apto — só nuvem.
 * Agenda: fora do pico · sem boot/login/Painel (BL-093).
 */
class SyncDfeDeltaCommand extends Command
{
    protected $signature = 'dfe:sync-delta {--empresa= : ID de uma EMP (opcional)}';

    protected $description = 'Enfileira sync DF-e (delta NSU) para empresas com A1 apto na nuvem';

    public function handle(DfeSyncService $sync, EmpresaCertificadoA1Service $a1): int
    {
        if (! $sync->stagePermiteSync()) {
            $this->warn('Stage atual não permite DF-e (só homolog/production). Nada enfileirado.');

            return self::SUCCESS;
        }

        $query = Empresa::query()->where('situacao', 'ATIVA');
        if ($this->option('empresa')) {
            $query->where('id', (int) $this->option('empresa'));
        } else {
            $ids = EmpresaCertificadoA1::query()->pluck('empresa_id');
            $query->whereIn('id', $ids);
        }

        $ok = 0;
        $skip = 0;
        foreach ($query->cursor() as $empresa) {
            if (! $a1->aptoParaOperar($empresa)) {
                $skip++;

                continue;
            }
            try {
                $sync->enfileirar($empresa);
                $ok++;
                $this->line('Enfileirado EMP '.$empresa->codigo.' (#'.$empresa->id.')');
            } catch (\Throwable $e) {
                $skip++;
                Log::info('dfe.sync_delta.skip', [
                    'empresa_id' => $empresa->id,
                    'erro' => $e->getMessage(),
                ]);
                $this->warn('Skip EMP '.$empresa->codigo.': '.$e->getMessage());
            }
        }

        $this->info("DF-e delta: {$ok} enfileirado(s), {$skip} ignorado(s).");

        return self::SUCCESS;
    }
}
