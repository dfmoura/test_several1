<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-066 — SAIDA_VENDA na NF-e Focus autorizada (liga MOV ao DFS).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->foreignId('faturamento_id')->nullable()->after('ordem_servico_id')
                ->constrained('faturamentos')->nullOnDelete();
            $table->foreignId('documento_fiscal_saida_id')->nullable()->after('faturamento_id')
                ->constrained('documento_fiscal_saidas')->nullOnDelete();

            $table->unique('documento_fiscal_saida_id', 'est_mov_dfs_unique');
            $table->index(['empresa_id', 'faturamento_id']);
        });
    }

    public function down(): void
    {
        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->dropUnique('est_mov_dfs_unique');
            $table->dropIndex(['empresa_id', 'faturamento_id']);
            $table->dropConstrainedForeignId('documento_fiscal_saida_id');
            $table->dropConstrainedForeignId('faturamento_id');
        });
    }
};
