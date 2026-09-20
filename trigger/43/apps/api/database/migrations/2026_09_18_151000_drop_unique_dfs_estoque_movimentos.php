<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Permite SAIDA_VENDA + ESTORNO_SAIDA_VENDA no mesmo DFS (cancel SEFAZ).
 * MySQL: unique em FK não pode ser dropado sem recriar a FK.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->dropForeign(['documento_fiscal_saida_id']);
        });

        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->dropUnique('est_mov_dfs_unique');
        });

        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->foreign('documento_fiscal_saida_id')
                ->references('id')
                ->on('documento_fiscal_saidas')
                ->nullOnDelete();
            $table->index(['documento_fiscal_saida_id', 'tipo'], 'est_mov_dfs_tipo_idx');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->dropForeign(['documento_fiscal_saida_id']);
            $table->dropIndex('est_mov_dfs_tipo_idx');
        });

        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->unique('documento_fiscal_saida_id', 'est_mov_dfs_unique');
            $table->foreign('documento_fiscal_saida_id')
                ->references('id')
                ->on('documento_fiscal_saidas')
                ->nullOnDelete();
        });
    }
};
