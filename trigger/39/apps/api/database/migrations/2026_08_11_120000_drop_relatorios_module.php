<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Remove o módulo Relatórios IA (tabelas, PDFs storage path e RBAC).
 * Mantém as migrations históricas de create/seed — esta migration fecha o ciclo.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Ordem por FK: execucoes referencia planejamentos e relatorios.
        Schema::dropIfExists('relatorio_execucoes');
        Schema::dropIfExists('relatorio_planejamentos');
        Schema::dropIfExists('relatorios');

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        foreach (['ADMIN', 'COMERCIAL', 'CONSULTA'] as $roleName) {
            $role = Role::query()->where('name', $roleName)->where('guard_name', 'web')->first();
            if ($role) {
                $role->revokePermissionTo(['relatorio.ler', 'relatorio.escrever']);
            }
        }

        Permission::query()
            ->whereIn('name', ['relatorio.ler', 'relatorio.escrever'])
            ->where('guard_name', 'web')
            ->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Irreversível: recriar o módulo exige o código e as migrations históricas de create.
    }
};
