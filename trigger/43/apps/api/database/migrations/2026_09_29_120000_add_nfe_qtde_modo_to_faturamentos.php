<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modalidade da quantidade na NF-e de venda (rolo × etiqueta).
 * Comercial/FAT/estoque continuam em etiquetas — só o documento fiscal.
 *
 * @see docs/ADR_PA_EMBALAGEM_BOBINA_CAIXA.md (emenda 2026-09-29)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faturamentos', function (Blueprint $table) {
            $table->string('nfe_qtde_modo', 16)->nullable()->after('transportador_id');
        });
    }

    public function down(): void
    {
        Schema::table('faturamentos', function (Blueprint $table) {
            $table->dropColumn('nfe_qtde_modo');
        });
    }
};
