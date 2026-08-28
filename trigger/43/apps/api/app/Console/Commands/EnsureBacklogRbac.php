<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Idempotente — garante consulta do Backlog nos papéis após seed/deploy
 * (SEED_ON_BOOT usa syncPermissions e removeria backlog.ler se ausente do seeder).
 * Escrita permanece só em USR-00019 (ADR_BACKLOG.md).
 */
class EnsureBacklogRbac extends Command
{
    protected $signature = 'backlog:ensure-rbac';

    protected $description = 'Garante backlog.ler nos papéis operacionais; backlog.escrever só em USR-00019';

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

    public function handle(): int
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

            $this->info("Papel {$roleName}: backlog.ler");
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
            $this->info(self::USUARIO_ESCRITA.': backlog.ler + backlog.escrever');
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $this->info('Cache Spatie limpo.');

        return self::SUCCESS;
    }
}
