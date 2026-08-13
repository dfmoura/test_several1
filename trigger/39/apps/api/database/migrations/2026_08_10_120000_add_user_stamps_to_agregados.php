<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Selos de autoria (estudo 32 ARQUITETURA §5.2): criado_por / atualizado_por.
 * Expand-only, nullable — legado e jobs sem Auth ficam null.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'parceiros',
        'produtos',
        'orcamentos',
        'empresas',
        'bens_patrimoniais',
        'orc_mapa_facas',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreignId('criado_por')
                    ->nullable()
                    ->after('id')
                    ->constrained('users')
                    ->nullOnDelete();
                $blueprint->foreignId('atualizado_por')
                    ->nullable()
                    ->after('criado_por')
                    ->constrained('users')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropConstrainedForeignId('criado_por');
                $blueprint->dropConstrainedForeignId('atualizado_por');
            });
        }
    }
};
