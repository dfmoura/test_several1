<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * BL-042 — estoque.aprovar_gestor (alçada média/alta + GERAL/VIRADA).
 */
return new class extends Migration
{
    private const PERMISSION = 'estoque.aprovar_gestor';

    /** @var array<string, list<string>> */
    private const ROLE_GRANTS = [
        'ADMIN' => [self::PERMISSION],
    ];

    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::findOrCreate(self::PERMISSION, 'web');

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
            ->where('name', self::PERMISSION)
            ->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
