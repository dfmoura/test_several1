<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Plano de partida/refile na OP (ADR_PRODUCAO_PARTIDA_BOBINA).
 * JSON: lista de planos por volume pai baixado; fato oficial continua o MOV.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->json('partida_prevista')->nullable()->after('avaria_lotes');
        });
    }

    public function down(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->dropColumn('partida_prevista');
        });
    }
};
