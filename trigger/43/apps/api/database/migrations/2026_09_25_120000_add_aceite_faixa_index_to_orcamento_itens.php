<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR_ORC_ITENS — aceite da escada por posição.
 * Cabeçalho `orcamentos.aceite_faixa_index` permanece (N=1 / legado).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orcamento_itens', function (Blueprint $table) {
            $table->unsignedSmallInteger('aceite_faixa_index')->nullable()->after('result_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('orcamento_itens', function (Blueprint $table) {
            $table->dropColumn('aceite_faixa_index');
        });
    }
};
