<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Garante vínculo das permissões de implantação aos papéis (ADR_IMPLANTACAO_ACEITE).
 * A migration 2026_08_24_120000 criava as permissões; o grant ao ADMIN podia falhar
 * se o cache do Spatie ainda não conhecia os nomes novos.
 */
return new class extends Migration
{
    private const PERMISSIONS = [
        'implantacao.ler',
        'implantacao.validar_dev',
        'implantacao.validar_cliente',
    ];

    /** @var array<string, list<string>> */
    private const ROLE_GRANTS = [
        'ADMIN' => self::PERMISSIONS,
        'CONSULTA' => ['implantacao.ler'],
    ];

    public function up(): void
    {
        $registrar = app()[PermissionRegistrar::class];
        $registrar->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $registrar->forgetCachedPermissions();

        foreach (self::ROLE_GRANTS as $roleName => $perms) {
            $role = Role::findOrCreate($roleName, 'web');
            foreach ($perms as $perm) {
                if (! $role->hasPermissionTo($perm)) {
                    $role->givePermissionTo($perm);
                }
            }
        }

        $registrar->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Não revoga: a 120000 já define o down canônico.
    }
};
