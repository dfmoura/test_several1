<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Posição de montagem da faca no cilindro (rv4 operacional — não entra no motor).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->string('posicao', 16)->nullable()->after('colunas_mapa');
        });
    }

    public function down(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->dropColumn('posicao');
        });
    }
};
