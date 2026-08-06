<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $perm = Permission::findOrCreate('orcamento.catalogo.gerir', 'web');

        $admin = Role::findOrCreate('ADMIN', 'web');
        $admin->givePermissionTo($perm);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $admin = Role::query()->where('name', 'ADMIN')->where('guard_name', 'web')->first();
        if ($admin) {
            $admin->revokePermissionTo('orcamento.catalogo.gerir');
        }

        Permission::query()
            ->where('name', 'orcamento.catalogo.gerir')
            ->where('guard_name', 'web')
            ->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
