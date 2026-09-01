<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contorno SVG opcional por faca (DESENHADA / irregular) — silhueta real no mapa.
 * Geometria operacional (medida, puxada, Z) permanece imutável.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->text('contorno_svg')->nullable()->after('colunas_mapa');
        });
    }

    public function down(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->dropColumn('contorno_svg');
        });
    }
};
