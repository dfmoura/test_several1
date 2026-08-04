<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Idempotente — garante RBAC de orçamento após deploys em banco já existente.
 */
class EnsureOrcamentoRbac extends Command
{
    protected $signature = 'orcamento:ensure-rbac';

    protected $description = 'Garante permissões orcamento.ler/escrever nos papéis ADMIN, COMERCIAL e CONSULTA';

    public function handle(): int
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $ler = Permission::findOrCreate('orcamento.ler', 'web');
        $escrever = Permission::findOrCreate('orcamento.escrever', 'web');

        foreach (['ADMIN', 'COMERCIAL'] as $roleName) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->givePermissionTo([$ler, $escrever]);
            $this->info("Papel {$roleName}: orcamento.ler + orcamento.escrever");
        }

        $consulta = Role::findOrCreate('CONSULTA', 'web');
        $consulta->givePermissionTo($ler);
        $this->info('Papel CONSULTA: orcamento.ler');

        // Re-sincroniza ADMIN com o conjunto canônico do seeder quando possível.
        $admin = Role::findByName('ADMIN', 'web');
        if (! $admin->hasPermissionTo('orcamento.ler')) {
            $admin->givePermissionTo($ler);
        }
        if (! $admin->hasPermissionTo('orcamento.escrever')) {
            $admin->givePermissionTo($escrever);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $this->info('Cache Spatie limpo.');

        return self::SUCCESS;
    }
}
