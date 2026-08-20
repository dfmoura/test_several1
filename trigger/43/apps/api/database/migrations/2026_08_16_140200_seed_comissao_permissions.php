<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * BL-061 — comissão COM- (FINANCEIRO escreve; COMERCIAL lê).
 */
return new class extends Migration
{
    /** @var list<string> */
    private const PERMISSIONS = [
        'comissao.ler',
        'comissao.escrever',
    ];

    /** @var array<string, list<string>> */
    private const ROLE_GRANTS = [
        'ADMIN' => self::PERMISSIONS,
        'FINANCEIRO' => self::PERMISSIONS,
        'COMERCIAL' => ['comissao.ler'],
        'FISCAL' => ['comissao.ler'],
        'CONSULTA' => ['comissao.ler'],
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
