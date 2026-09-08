<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OC comercial: IPI/ICMS estimados (alíquota × mercadoria) + frete informado.
 * Não altera MOV (custo = mercadoria) nem espelho fiscal da NF.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordens_compra', function (Blueprint $table) {
            $table->decimal('valor_frete', 15, 2)->default(0)->after('valor_total');
            $table->decimal('valor_ipi', 15, 2)->default(0)->after('valor_frete');
            $table->decimal('valor_icms', 15, 2)->default(0)->after('valor_ipi');
        });

        Schema::table('ordem_compra_itens', function (Blueprint $table) {
            $table->decimal('aliq_ipi', 12, 4)->nullable()->after('valor_total');
            $table->decimal('aliq_icms', 12, 4)->nullable()->after('aliq_ipi');
            $table->decimal('valor_ipi', 15, 2)->default(0)->after('aliq_icms');
            $table->decimal('valor_icms', 15, 2)->default(0)->after('valor_ipi');
        });
    }

    public function down(): void
    {
        Schema::table('ordem_compra_itens', function (Blueprint $table) {
            $table->dropColumn(['aliq_ipi', 'aliq_icms', 'valor_ipi', 'valor_icms']);
        });
        Schema::table('ordens_compra', function (Blueprint $table) {
            $table->dropColumn(['valor_frete', 'valor_ipi', 'valor_icms']);
        });
    }
};
