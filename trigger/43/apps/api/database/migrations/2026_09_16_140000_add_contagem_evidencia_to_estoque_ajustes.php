<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Evidência de contagem por QR (volume + local) na solicitação de AJU avulsa.
 * Auditoria apenas — não alimenta Writer / lote_payload.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->json('contagem_evidencia')->nullable()->after('lote_payload');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->dropColumn('contagem_evidencia');
        });
    }
};
