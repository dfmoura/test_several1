<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Papel e acabamento do catálogo ORC apontam um grupo de matéria-prima.
 * A linha da OP pode nascer sem SKU: a bobina é escolhida nesse grupo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orc_catalogo_papeis', function (Blueprint $table) {
            $table->foreignId('grupo_id')->nullable()->after('nome')
                ->constrained('produto_grupos')->nullOnDelete();
        });

        Schema::table('orc_catalogo_acabamentos', function (Blueprint $table) {
            $table->foreignId('grupo_id')->nullable()->after('nome')
                ->constrained('produto_grupos')->nullOnDelete();
        });

        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->foreignId('grupo_id')->nullable()->after('origem_texto')
                ->constrained('produto_grupos')->nullOnDelete();
        });

        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->dropForeign(['produto_id']);
        });

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE ordem_producao_materiais MODIFY produto_id BIGINT UNSIGNED NULL');
        } else {
            Schema::table('ordem_producao_materiais', function (Blueprint $table) {
                $table->unsignedBigInteger('produto_id')->nullable()->change();
            });
        }

        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->foreign('produto_id')->references('id')->on('produtos')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->dropForeign(['produto_id']);
        });

        DB::table('ordem_producao_materiais')->whereNull('produto_id')->delete();

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE ordem_producao_materiais MODIFY produto_id BIGINT UNSIGNED NOT NULL');
        } else {
            Schema::table('ordem_producao_materiais', function (Blueprint $table) {
                $table->unsignedBigInteger('produto_id')->nullable(false)->change();
            });
        }

        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->foreign('produto_id')->references('id')->on('produtos')->restrictOnDelete();
            $table->dropConstrainedForeignId('grupo_id');
        });

        Schema::table('orc_catalogo_acabamentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('grupo_id');
        });

        Schema::table('orc_catalogo_papeis', function (Blueprint $table) {
            $table->dropConstrainedForeignId('grupo_id');
        });
    }
};
