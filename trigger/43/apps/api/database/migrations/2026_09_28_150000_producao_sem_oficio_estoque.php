<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Ofício do almoxarifado ≠ ofício da máquina.
 * PRODUCAO deixa de buscar/baixar na prateleira (estoque.ler / estoque.escrever).
 * COMPRAS e ADMIN mantêm a busca. Quem recebe é producao.escrever na máquina.
 */
return new class extends Migration
{
    /** @var list<string> */
    private const REVOKE = [
        'estoque.ler',
        'estoque.escrever',
    ];

    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $role = Role::query()->where('name', 'PRODUCAO')->where('guard_name', 'web')->first();
        if ($role) {
            $ids = Permission::query()
                ->where('guard_name', 'web')
                ->whereIn('name', self::REVOKE)
                ->pluck('id');
            if ($ids->isNotEmpty()) {
                $role->permissions()->detach($ids);
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $role = Role::findOrCreate('PRODUCAO', 'web');
        foreach (self::REVOKE as $name) {
            $perm = Permission::findOrCreate($name, 'web');
            if (! $role->hasPermissionTo($perm)) {
                $role->givePermissionTo($perm);
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
