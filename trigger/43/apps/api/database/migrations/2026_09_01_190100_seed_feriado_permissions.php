<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /** @var list<string> */
    private const PERMISSIONS = [
        'feriado.ler',
        'feriado.escrever',
    ];

    /** @var array<string, list<string>> */
    private const ROLE_GRANTS = [
        'ADMIN' => self::PERMISSIONS,
        'FINANCEIRO' => self::PERMISSIONS,
        'COMERCIAL' => ['feriado.ler'],
        'COMPRAS' => ['feriado.ler'],
        'CONSULTA' => ['feriado.ler'],
    ];

    public function up(): void
    {
        foreach (self::PERMISSIONS as $name) {
            Permission::findOrCreate($name, 'web');
        }

        foreach (self::ROLE_GRANTS as $roleName => $perms) {
            $role = Role::findByName($roleName, 'web');
            $role->givePermissionTo($perms);
        }
    }

    public function down(): void
    {
        foreach (self::ROLE_GRANTS as $roleName => $perms) {
            $role = Role::findByName($roleName, 'web');
            $role->revokePermissionTo($perms);
        }

        Permission::query()->whereIn('name', self::PERMISSIONS)->delete();
    }
};
