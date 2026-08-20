<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Comercial\FacasMapaService;
use Illuminate\Console\Command;

/**
 * Alinha rótulos legados do mapa aos PAR fornecedores da EMP (idempotente).
 */
class AlinharFacasFornecedores extends Command
{
    protected $signature = 'facas:alinhar-fornecedores {--empresa= : Código ou id da EMP (omitir = todas com fornecedor PAR)}';

    protected $description = 'Atualiza orc_mapa_facas.fornecedor com o nome do parceiro fornecedor correspondente';

    public function handle(FacasMapaService $service): int
    {
        if (! $service->tablesReady()) {
            $this->error('Tabela orc_mapa_facas ausente.');

            return self::FAILURE;
        }

        $filtro = trim((string) $this->option('empresa'));
        $empresas = Empresa::query()->orderBy('id');
        if ($filtro !== '') {
            if (ctype_digit($filtro)) {
                $empresas->where('id', (int) $filtro);
            } else {
                $empresas->where('codigo', $filtro);
            }
        }

        $ok = 0;
        foreach ($empresas->get() as $empresa) {
            app()->instance('empresa', $empresa);
            $result = $service->alinharFornecedoresParceiros((int) $empresa->id);
            $this->info($empresa->codigo.': '.json_encode($result, JSON_UNESCAPED_UNICODE));
            $ok++;
        }

        if ($ok === 0) {
            $this->warn('Nenhuma empresa encontrada.');

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
