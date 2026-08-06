<?php

namespace App\Console\Commands;

use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Idempotente — seed do catálogo ORC + permissão de gestão (deploys existentes).
 */
class EnsureOrcamentoCatalogo extends Command
{
    protected $signature = 'orcamento:ensure-catalogo {--force : Sobrescreve valores já cadastrados com o JSON oficial}';

    protected $description = 'Garante RBAC orcamento.catalogo.gerir e semeia as 4 bases editáveis do motor';

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

        $result = $service->seedFromJson(forceOverwrite: (bool) $this->option('force'));
        $this->info('Seed catálogo: '.json_encode($result, JSON_UNESCAPED_UNICODE));
        $this->info('Resumo: '.json_encode($service->resumo(), JSON_UNESCAPED_UNICODE));

        return self::SUCCESS;
    }
}
