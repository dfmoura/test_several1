<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fecho por modelo — evidência na OP (totais continuam em qtde_boa / qtde_refugo).
 * ADR_PRODUCAO_APONTAMENTO emenda 2026-11-03.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordens_producao', function (Blueprint $table) {
            $table->json('resultado_modelos')->nullable()->after('qtde_refugo');
        });
    }

    public function down(): void
    {
        Schema::table('ordens_producao', function (Blueprint $table) {
            $table->dropColumn('resultado_modelos');
        });
    }
};
