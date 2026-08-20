<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-038 — parcelas XML → multi-TIT + trilha fiscal mínima no MOV.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('titulos', function (Blueprint $table) {
            $table->unsignedSmallInteger('parcela')->nullable()->after('documento');
            $table->string('n_dup', 16)->nullable()->after('parcela');
            $table->index(['empresa_id', 'movimento_id']);
        });

        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->decimal('nf_valor', 15, 2)->nullable()->after('nf_data');
            $table->json('nf_totais')->nullable()->after('nf_valor');
        });
    }

    public function down(): void
    {
        Schema::table('titulos', function (Blueprint $table) {
            $table->dropIndex(['empresa_id', 'movimento_id']);
            $table->dropColumn(['parcela', 'n_dup']);
        });

        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->dropColumn(['nf_valor', 'nf_totais']);
        });
    }
};
