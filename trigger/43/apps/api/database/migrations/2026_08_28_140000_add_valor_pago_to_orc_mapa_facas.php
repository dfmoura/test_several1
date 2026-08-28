<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Valor pago na aquisição/fabricação da faca — dado operacional da EMP (não geometria).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->decimal('valor_pago', 14, 2)->nullable()->after('fornecedor');
        });
    }

    public function down(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->dropColumn('valor_pago');
        });
    }
};
