<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Backlog: consulta aberta aos papéis operacionais; escrita permanece
 * restrita a USR-00019 (ADR_BACKLOG.md).
 *
 * Persistência via insertOrIgnore em role_has_permissions (evita falso
 * positivo do cache Spatie em hasPermissionTo).
 */
return new class extends Migration
{
    private const LER = 'backlog.ler';

    private const ESCREVER = 'backlog.escrever';

    private const USUARIO_ESCRITA = 'USR-00019';

    /** @var list<string> */
    private const ROLES_CONSULTA = [
        'ADMIN',
        'FINANCEIRO',
        'COMERCIAL',
        'COMPRAS',
        'FISCAL',
        'PRODUCAO',
        'EXPEDICAO',
        'CONSULTA',
    ];

    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $ler = Permission::findOrCreate(self::LER, 'web');
        $escrever = Permission::findOrCreate(self::ESCREVER, 'web');

        foreach (self::ROLES_CONSULTA as $roleName) {
            $role = Role::findOrCreate($roleName, 'web');

            DB::table('role_has_permissions')->insertOrIgnore([
                'permission_id' => $ler->id,
                'role_id' => $role->id,
            ]);

            DB::table('role_has_permissions')
                ->where('role_id', $role->id)
                ->where('permission_id', $escrever->id)
                ->delete();
        }

        $user = User::query()->where('codigo', self::USUARIO_ESCRITA)->first();
        if ($user) {
            DB::table('model_has_permissions')->insertOrIgnore([
                'permission_id' => $ler->id,
                'model_type' => User::class,
                'model_id' => $user->id,
            ]);
            DB::table('model_has_permissions')->insertOrIgnore([
                'permission_id' => $escrever->id,
                'model_type' => User::class,
                'model_id' => $user->id,
            ]);
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::ROLES_CONSULTA as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role) {
                $role->revokePermissionTo(self::LER);
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
