<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * BL-049 — faturamento do PED (COMERCIAL/FINANCEIRO/FISCAL; PRODUÇÃO não escreve).
 */
return new class extends Migration
{
    /** @var list<string> */
    private const PERMISSIONS = [
        'faturamento.ler',
        'faturamento.escrever',
    ];

    /** @var array<string, list<string>> */
    private const ROLE_GRANTS = [
        'ADMIN' => self::PERMISSIONS,
        'FISCAL' => self::PERMISSIONS,
        'FINANCEIRO' => self::PERMISSIONS,
        'COMERCIAL' => self::PERMISSIONS,
        'PRODUCAO' => ['faturamento.ler'],
        'EXPEDICAO' => ['faturamento.ler'],
        'CONSULTA' => ['faturamento.ler'],
    ];

    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        foreach (self::ROLE_GRANTS as $roleName => $perms) {
            $role = Role::findOrCreate($roleName, 'web');
            foreach ($perms as $perm) {
                if (! $role->hasPermissionTo($perm)) {
                    $role->givePermissionTo($perm);
                }
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::ROLE_GRANTS as $roleName => $perms) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role) {
                $role->revokePermissionTo($perms);
            }
        }

        Permission::query()
            ->where('guard_name', 'web')
            ->whereIn('name', self::PERMISSIONS)
            ->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
