<?php

namespace App\Support;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * RBAC do console TRIGGER — nunca atribuído ao ADMIN da conta FLEXORC.
 * Norma: docs/ADR_CONSOLE_PLATAFORMA.md
 */
final class PlatformRbac
{
    public const ROLE = 'PLATAFORMA';

    /** @var list<string> */
    public const PERMISSIONS = [
        'plataforma.operar',
        'plataforma.contas.ler',
        'plataforma.contas.provisionar',
        'plataforma.contas.bonificar',
        'plataforma.usuarios.ler',
        'plataforma.auditoria.ler',
        'plataforma.integracoes.gerir',
        'plataforma.billing.gerir',
    ];

    public static function ensure(): void
    {
        foreach (self::PERMISSIONS as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $role = Role::findOrCreate(self::ROLE, 'web');
        $role->syncPermissions(self::PERMISSIONS);

        $admin = Role::query()->where('name', 'ADMIN')->where('guard_name', 'web')->first();
        if ($admin !== null) {
            foreach (self::PERMISSIONS as $name) {
                if ($admin->hasPermissionTo($name)) {
                    $admin->revokePermissionTo($name);
                }
            }
        }

        $registrar = app()[PermissionRegistrar::class];
        $registrar->forgetCachedPermissions();
        // Garante que o próximo can()/hasPermissionTo recarregue do banco neste processo.
        $registrar->clearPermissionsCollection();
    }

    public static function isPapelProibidoNoTenant(string $role): bool
    {
        return strtoupper($role) === self::ROLE;
    }
}
