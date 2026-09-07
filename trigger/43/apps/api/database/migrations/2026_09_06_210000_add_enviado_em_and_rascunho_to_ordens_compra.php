<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR_OC_RASCUNHO_ENVIO — enviado_em + default create = RASCUNHO (app).
 * OCs legadas em ABERTA|PARCIAL|RECEBIDA permanecem; sem backfill de enviado_em.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordens_compra', function (Blueprint $table) {
            $table->timestamp('enviado_em')->nullable()->after('observacao');
        });
    }

    public function down(): void
    {
        Schema::table('ordens_compra', function (Blueprint $table) {
            $table->dropColumn('enviado_em');
        });
    }
};
