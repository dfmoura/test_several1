<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Comercial\FacasMapaService;
use Illuminate\Console\Command;

/**
 * Limpa o inventário ativo da EMP e rematerializa a partir do JSON oficial.
 * Não toca no template. Não usa force de geometria.
 */
class SubstituirFacasInventario extends Command
{
    protected $signature = 'facas:substituir-inventario
        {empresa : Código ou id da EMP}
        {--purge : Após rematerializar, remove inativas da EMP (mapa limpo na homolog)}
        {--force : Confirma a operação (obrigatório)}';

    protected $description = 'Inativa o mapa ativo da EMP e rematerializa do JSON oficial (opcional --purge das inativas)';

    public function handle(FacasMapaService $service): int
    {
        if (! $service->tablesReady()) {
            $this->error('Tabela orc_mapa_facas ausente.');

            return self::FAILURE;
        }

        if (! $this->option('force')) {
            $this->error('Confirme com --force (operação destrutiva no inventário ativo da EMP).');

            return self::FAILURE;
        }

        $filtro = trim((string) $this->argument('empresa'));
        $emp = ctype_digit($filtro)
            ? Empresa::query()->find((int) $filtro)
            : Empresa::query()->where('codigo', $filtro)->first();

        if (! $emp) {
            $this->error('Empresa não encontrada: '.$filtro);

            return self::FAILURE;
        }

        $purge = (bool) $this->option('purge');
        $this->warn(sprintf(
            'Substituindo inventário EMP %s (id=%d)%s…',
            $emp->codigo,
            $emp->id,
            $purge ? ' + purge inativas' : '',
        ));

        $result = $service->substituirInventarioEmpresa((int) $emp->id, $purge);
        $this->info(json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        return self::SUCCESS;
    }
}
