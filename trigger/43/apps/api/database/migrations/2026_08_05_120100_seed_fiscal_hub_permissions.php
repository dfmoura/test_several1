<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Garante RBAC de hubs fiscais mesmo sem reseed completo (banco já existente).
 */
return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $perm = Permission::findOrCreate('fiscal.hubs.gerir', 'web');

        $admin = Role::findOrCreate('ADMIN', 'web');
        $admin->givePermissionTo($perm);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $admin = Role::query()->where('name', 'ADMIN')->where('guard_name', 'web')->first();
        if ($admin) {
            $admin->revokePermissionTo('fiscal.hubs.gerir');
        }

        Permission::query()
            ->where('name', 'fiscal.hubs.gerir')
            ->where('guard_name', 'web')
            ->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
