<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Permissões BL-033 — compras / estoque / financeiro operacional.
 */
return new class extends Migration
{
    private const PERMISSIONS = [
        'compras.ler',
        'compras.escrever',
        'estoque.ler',
        'estoque.escrever',
        'financeiro.ler',
        'financeiro.escrever',
    ];

    /** @var array<string, list<string>> */
    private const ROLE_GRANTS = [
        'ADMIN' => self::PERMISSIONS,
        'COMPRAS' => [
            'compras.ler',
            'compras.escrever',
            'estoque.ler',
            'estoque.escrever',
        ],
        'PRODUCAO' => [
            'compras.ler',
            'estoque.ler',
            'estoque.escrever',
        ],
        'FINANCEIRO' => [
            'financeiro.ler',
            'financeiro.escrever',
            'estoque.ler',
            'compras.ler',
        ],
        'FISCAL' => [
            'compras.ler',
            'estoque.ler',
        ],
        'CONSULTA' => [
            'compras.ler',
            'estoque.ler',
            'financeiro.ler',
        ],
    ];

    public function up(): void
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
