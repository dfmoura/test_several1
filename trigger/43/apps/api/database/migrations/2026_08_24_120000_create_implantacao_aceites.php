<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Matriz de aceite de implantação (ADR_IMPLANTACAO_ACEITE).
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
        Schema::create('implantacao_aceites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('codigo', 32);
            $table->string('status_dev', 16)->default('PENDENTE');
            $table->string('status_cliente', 16)->default('PENDENTE');
            $table->string('obs_dev', 500)->nullable();
            $table->string('obs_cliente', 500)->nullable();
            $table->foreignId('validado_dev_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validado_dev_em')->nullable();
            $table->foreignId('validado_cliente_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('validado_cliente_em')->nullable();
            $table->timestamps();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status_dev']);
            $table->index(['empresa_id', 'status_cliente']);
        });

        $registrar = app()[PermissionRegistrar::class];
        $registrar->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $name) {
            Permission::findOrCreate($name, 'web');
        }

        // Cache precisa conhecer os nomes novos antes do grant ao papel.
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
        Schema::dropIfExists('implantacao_aceites');

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
