<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Estoque\EstoqueEnderecoService;
use Illuminate\Console\Command;

class SeedEstoqueEnderecosCommand extends Command
{
    protected $signature = 'erp:seed-estoque-enderecos {--empresa=}';

    protected $description = 'Gabarito 6×4×4 vãos de almoxarifado (ADR_CADASTRO_INSUMO_VOLUME F4)';

    public function handle(EstoqueEnderecoService $service): int
    {
        $empresaId = $this->option('empresa');
        $query = Empresa::query()->where('situacao', 'ATIVA');
        if ($empresaId) {
            $query->where('id', (int) $empresaId);
        }

        $empresas = $query->get();
        if ($empresas->isEmpty()) {
            $this->warn('Nenhuma empresa encontrada.');

            return self::FAILURE;
        }

        foreach ($empresas as $empresa) {
            $out = $service->seedGabarito($empresa);
            $this->info(sprintf(
                'EMP %s (#%d): %d criados · %d já existiam · total gabarito %d',
                $empresa->codigo,
                $empresa->id,
                $out['criados'],
                $out['existentes'],
                $out['total'],
            ));
        }

        return self::SUCCESS;
    }
}
