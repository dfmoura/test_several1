<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Âncora de TTL do PIX Inter (mensalidade) — expira QR ocioso e permite novo emit.
 * ADR: docs/ADR_INTER_BILLING_MENSALIDADE.md
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conta_ativacoes', function (Blueprint $table) {
            $table->timestamp('billing_pix_emitido_em')->nullable()->after('billing_charge_vencimento');
        });
    }

    public function down(): void
    {
        Schema::table('conta_ativacoes', function (Blueprint $table) {
            $table->dropColumn('billing_pix_emitido_em');
        });
    }
};
