<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Backlog restrito ao usuário de laboratório USR-00019 (ADR_BACKLOG.md).
 * Remove grants de papéis; concede backlog.ler/escrever só a esse USR.
 */
return new class extends Migration
{
    private const PERMISSIONS = [
        'backlog.ler',
        'backlog.escrever',
    ];

    private const USUARIO_CODIGO = 'USR-00019';

    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $name) {
            Permission::findOrCreate($name, 'web');
        }

        foreach (Role::query()->where('guard_name', 'web')->get() as $role) {
            $role->revokePermissionTo(self::PERMISSIONS);
        }

        // Remove concessão direta prévia de qualquer outro usuário.
        $perms = Permission::query()
            ->where('guard_name', 'web')
            ->whereIn('name', self::PERMISSIONS)
            ->get();

        foreach ($perms as $perm) {
            $perm->users()->detach();
        }

        $user = User::query()->where('codigo', self::USUARIO_CODIGO)->first();
        if ($user) {
            $user->givePermissionTo(self::PERMISSIONS);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $user = User::query()->where('codigo', self::USUARIO_CODIGO)->first();
        if ($user) {
            $user->revokePermissionTo(self::PERMISSIONS);
        }

        // Restaura grants por papel (estado anterior da seed).
        $roleGrants = [
            'ADMIN' => self::PERMISSIONS,
            'FINANCEIRO' => self::PERMISSIONS,
            'COMERCIAL' => self::PERMISSIONS,
            'COMPRAS' => self::PERMISSIONS,
            'CONSULTA' => ['backlog.ler'],
        ];

        foreach ($roleGrants as $roleName => $perms) {
            $role = Role::findOrCreate($roleName, 'web');
            foreach ($perms as $perm) {
                if (! $role->hasPermissionTo($perm)) {
                    $role->givePermissionTo($perm);
                }
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
