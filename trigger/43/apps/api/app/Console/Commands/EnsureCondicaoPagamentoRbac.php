<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Idempotente — garante RBAC de condições de pagamento após deploy em banco existente.
 */
class EnsureCondicaoPagamentoRbac extends Command
{
    protected $signature = 'condicao-pagamento:ensure-rbac';

    protected $description = 'Garante permissões condicao_pagamento.ler/escrever nos papéis canônicos';

    /** @var list<string> */
    private const PERMISSIONS = [
        'condicao_pagamento.ler',
        'condicao_pagamento.escrever',
    ];

    /** @var array<string, list<string>> */
    private const ROLE_GRANTS = [
        'ADMIN' => self::PERMISSIONS,
        'FINANCEIRO' => self::PERMISSIONS,
        'COMERCIAL' => self::PERMISSIONS,
        'COMPRAS' => self::PERMISSIONS,
        'FISCAL' => ['condicao_pagamento.ler'],
        'PRODUCAO' => ['condicao_pagamento.ler'],
        'EXPEDICAO' => ['condicao_pagamento.ler'],
        'CONSULTA' => ['condicao_pagamento.ler'],
    ];

    public function handle(): int
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $name) {
            Permission::findOrCreate($name, 'web');
        }

        foreach (self::ROLE_GRANTS as $roleName => $perms) {
            $role = Role::findOrCreate($roleName, 'web');
            foreach ($perms as $perm) {
                if (! $role->hasPermissionTo($perm)) {
                    $role->givePermissionTo($perm);
                }
            }
            $this->info("Papel {$roleName}: ".implode(', ', $perms));
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $this->info('Cache Spatie limpo.');

        return self::SUCCESS;
    }
}
