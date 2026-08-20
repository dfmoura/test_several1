<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Garante RBAC de ORC mesmo sem reseed completo (banco já existente).
 */
return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $ler = Permission::findOrCreate('orcamento.ler', 'web');
        $escrever = Permission::findOrCreate('orcamento.escrever', 'web');

        foreach (['ADMIN', 'COMERCIAL'] as $roleName) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->givePermissionTo([$ler, $escrever]);
        }

        $consulta = Role::findOrCreate('CONSULTA', 'web');
        $consulta->givePermissionTo($ler);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (['ADMIN', 'COMERCIAL', 'CONSULTA'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role) {
                $role->revokePermissionTo(['orcamento.ler', 'orcamento.escrever']);
            }
        }

        Permission::query()
            ->whereIn('name', ['orcamento.ler', 'orcamento.escrever'])
            ->where('guard_name', 'web')
            ->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
