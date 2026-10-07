<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Estoque\EstoqueEnderecoService;
use Illuminate\Console\Command;

class SeedEstoqueEnderecosCommand extends Command
{
    protected $signature = 'erp:seed-estoque-enderecos {--empresa=}';

    protected $description = 'Gabarito 6×4×3 com rótulo P00000001; não desativa local cadastrado além da malha';

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
                'EMP %s (#%d): %d criados · %d ok · %d rótulo→seq · %d legado duplicado inativado · total gabarito %d',
                $empresa->codigo,
                $empresa->id,
                $out['criados'],
                $out['existentes'],
                $out['renomeados'],
                $out['desativados'],
                $out['total'],
            ));
        }

        return self::SUCCESS;
    }
}
