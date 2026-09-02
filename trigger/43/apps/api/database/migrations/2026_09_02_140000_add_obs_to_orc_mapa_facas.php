<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Observação operacional da faca — separada de cliente_nota (rótulo de cliente / PAR).
 * Dados legados em cliente_nota permanecem como Cliente; Obs. começa vazio.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->string('obs', 500)->nullable()->after('cliente_nota');
        });
    }

    public function down(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->dropColumn('obs');
        });
    }
};
