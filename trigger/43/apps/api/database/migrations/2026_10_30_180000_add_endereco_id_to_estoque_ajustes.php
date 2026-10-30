<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Local físico obrigatório no AJU (binding Writer / saldo SKU sem volume).
 * ADR_ESTOQUE_REPOSICAO_AJUSTE · ADR_ESTOQUE_INVENTARIO_AJUSTE — emenda 2026-10-30.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->foreignId('endereco_id')
                ->nullable()
                ->after('produto_id')
                ->constrained('estoque_enderecos')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('endereco_id');
        });
    }
};
