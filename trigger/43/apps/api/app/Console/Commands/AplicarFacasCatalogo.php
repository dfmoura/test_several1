<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Comercial\FacasMapaService;
use Illuminate\Console\Command;

/**
 * Aplica o JSON oficial do mapa com segurança (homolog / deploy).
 * Seed aditivo + metadados; nunca apaga; não força geometria da EMP.
 */
class AplicarFacasCatalogo extends Command
{
    protected $signature = 'facas:aplicar-catalogo
        {--empresa= : Código ou id da EMP (omitir = template + todas as EMPs)}
        {--meta-only : Só reconcilia metadados (não roda seed)}';

    protected $description = 'Aplica mapa_facas.json com segurança (seed aditivo + metadados; sem force de geometria)';

    public function handle(FacasMapaService $service): int
    {
        if (! $service->tablesReady()) {
            $this->error('Tabela orc_mapa_facas ausente — rode as migrations primeiro.');

            return self::FAILURE;
        }

        $metaOnly = (bool) $this->option('meta-only');
        $filtro = trim((string) $this->option('empresa'));

        if ($filtro === '') {
            $this->line('— Template (empresa_id nulo) —');
            $this->aplicarUm($service, null, $metaOnly);

            foreach (Empresa::query()->orderBy('id')->get(['id', 'codigo']) as $emp) {
                $this->line(sprintf('— EMP %s (id=%d) —', $emp->codigo, $emp->id));
                $this->aplicarUm($service, (int) $emp->id, $metaOnly);
            }

            return self::SUCCESS;
        }

        if (ctype_digit($filtro)) {
            $emp = Empresa::query()->find((int) $filtro);
        } else {
            $emp = Empresa::query()->where('codigo', $filtro)->first();
        }
        if (! $emp) {
            $this->error('Empresa não encontrada: '.$filtro);

            return self::FAILURE;
        }

        $this->line(sprintf('— EMP %s (id=%d) —', $emp->codigo, $emp->id));
        $this->aplicarUm($service, (int) $emp->id, $metaOnly);

        return self::SUCCESS;
    }

    private function aplicarUm(FacasMapaService $service, ?int $empresaId, bool $metaOnly): void
    {
        if ($metaOnly) {
            $meta = $service->reconciliarMetadadosDoJson($empresaId);
            $this->info('metadados: '.json_encode($meta, JSON_UNESCAPED_UNICODE));

            return;
        }

        $result = $service->aplicarCatalogoSeguro($empresaId);
        $this->info(sprintf(
            'seed criados=%d existentes=%d | meta atualizados=%d iguais=%d sem_match=%d | resumo=%s',
            $result['seed']['criados'],
            $result['seed']['existentes'],
            $result['metadados']['atualizados'],
            $result['metadados']['iguais'],
            $result['metadados']['sem_match'],
            json_encode($result['resumo'], JSON_UNESCAPED_UNICODE),
        ));
    }
}
