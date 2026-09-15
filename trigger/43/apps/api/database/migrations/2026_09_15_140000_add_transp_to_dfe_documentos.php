<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Metadados do transportador (transp/transporta) na caixa DF-e —
 * lista leve sem reler XML a cada GET (ADR_CAIXA_DFE_NFE_DESTINADAS).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dfe_documentos', function (Blueprint $table) {
            $table->string('transp_cnpj', 14)->nullable()->after('emit_nome');
            $table->string('transp_nome', 120)->nullable()->after('transp_cnpj');
            $table->boolean('transp_extraido')->default(false)->after('transp_nome');
        });
    }

    public function down(): void
    {
        Schema::table('dfe_documentos', function (Blueprint $table) {
            $table->dropColumn(['transp_cnpj', 'transp_nome', 'transp_extraido']);
        });
    }
};
