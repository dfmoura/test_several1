<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Garante estoque.aprovar no ADMIN (alçada LIDER).
 * Corrige ambientes onde só estoque.aprovar_gestor foi sincronizado.
 */
return new class extends Migration
{
    /** @var list<string> */
    private const PERMS = [
        'estoque.aprovar',
        'estoque.aprovar_gestor',
    ];

    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (self::PERMS as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $admin = Role::findOrCreate('ADMIN', 'web');
        foreach (self::PERMS as $name) {
            if (! $admin->hasPermissionTo($name)) {
                $admin->givePermissionTo($name);
            }
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Não revoga: correção de integridade; down seria destrutivo em produção.
    }
};
