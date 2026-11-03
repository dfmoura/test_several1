<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Etiqueta BOB = volume na mão: 1 bobina = 1 modelo (ADR_PA_EMBALAGEM_BOBINA_CAIXA).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pa_embalagem_bobinas', function (Blueprint $table) {
            $table->unsignedInteger('modelo_ordem')->nullable()->after('tubete');
            $table->string('modelo_nome', 120)->nullable()->after('modelo_ordem');
            $table->index(['embalagem_id', 'modelo_ordem']);
        });
    }

    public function down(): void
    {
        Schema::table('pa_embalagem_bobinas', function (Blueprint $table) {
            $table->dropIndex(['embalagem_id', 'modelo_ordem']);
            $table->dropColumn(['modelo_ordem', 'modelo_nome']);
        });
    }
};
