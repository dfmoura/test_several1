<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Número da NF de aquisição da faca — metadado operacional (junto a fornecedor/valor_pago).
 * Mesmo vocabulário de patrimônio/estoque (`nf_numero`); não altera geometria.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->string('nf_numero', 40)->nullable()->after('valor_pago');
        });
    }

    public function down(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->dropColumn('nf_numero');
        });
    }
};
