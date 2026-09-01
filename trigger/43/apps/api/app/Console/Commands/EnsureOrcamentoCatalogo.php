<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Idempotente — seed do catálogo ORC + permissão de gestão (deploys existentes).
 * Seméia template (empresa_id nulo) e cada EMP — novos escalares do motor entram sem sobrescrever edições.
 */
class EnsureOrcamentoCatalogo extends Command
{
    protected $signature = 'orcamento:ensure-catalogo {--force : Sobrescreve valores já cadastrados com o JSON oficial}';

    protected $description = 'Garante RBAC orcamento.catalogo.gerir e semeia bases + parâmetros do motor ORC (todas as EMPs)';

    public function handle(OrcamentoCatalogoAdminService $service): int
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $perm = Permission::findOrCreate('orcamento.catalogo.gerir', 'web');
        $admin = Role::findOrCreate('ADMIN', 'web');
        $admin->givePermissionTo($perm);
        $this->info('ADMIN: orcamento.catalogo.gerir');

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        if (! $service->tablesReady()) {
            $this->error('Tabelas do catálogo ausentes — rode as migrations primeiro.');

            return self::FAILURE;
        }

        $force = (bool) $this->option('force');
        $totais = [
            'papeis' => 0,
            'acabamentos' => 0,
            'tipos_troca' => 0,
            'maquinas' => 0,
            'tarifas' => 0,
            'parametros' => 0,
            'estruturas' => 0,
            'faixas_frete' => 0,
        ];

        // Template da instalação (fallback quando EMP ainda não tem linha).
        $template = $service->seedFromJson(null, $force, null);
        foreach ($template['criados'] as $k => $n) {
            $totais[$k] = ($totais[$k] ?? 0) + $n;
        }
        $this->line('Template (empresa_id nulo): parâmetros +'.($template['criados']['parametros'] ?? 0)
            .' · estruturas +'.($template['criados']['estruturas'] ?? 0));

        $ids = Empresa::query()->orderBy('id')->pluck('id');
        foreach ($ids as $id) {
            $chunk = $service->seedFromJson(null, $force, (int) $id);
            foreach ($chunk['criados'] as $k => $n) {
                $totais[$k] = ($totais[$k] ?? 0) + $n;
            }
            $this->line(sprintf(
                'EMP id=%d: parâmetros +%d · estruturas +%d',
                $id,
                $chunk['criados']['parametros'] ?? 0,
                $chunk['criados']['estruturas'] ?? 0,
            ));
        }

        $this->info('Seed catálogo (criados): '.json_encode($totais, JSON_UNESCAPED_UNICODE));
        $this->info('Resumo (contexto CLI / template): '.json_encode($service->resumo(), JSON_UNESCAPED_UNICODE));
        $this->comment('UI: Administração → Catálogo ORC → Tinta (rv4) · Perdas · Embalagem · Como calcula');

        return self::SUCCESS;
    }
}
