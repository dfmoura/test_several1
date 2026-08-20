<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reforma tributária (EC 132/23 · LC 214/2025) — parâmetros CBS no produto.
 *
 * Estudo trigger/32: 2026 é ano-teste de CBS/IBS; parametrizar no cadastro
 * desde já (como CST ICMS/PIS/COFINS para Lucro Real), sem alterar cálculo
 * operacional enquanto NFS/NF-e reforma não estiver no fluxo.
 *
 * Escalas: aliquota_cbs NUMERIC(7,4) — PADRAO_DECIMAL §2.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->string('cst_cbs', 8)->nullable()->after('cst_cofins');
            $table->string('cclass_trib', 16)->nullable()->after('cst_cbs');
            $table->decimal('aliquota_cbs', 7, 4)->nullable()->after('cclass_trib');
        });
    }

    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn(['cst_cbs', 'cclass_trib', 'aliquota_cbs']);
        });
    }
};
