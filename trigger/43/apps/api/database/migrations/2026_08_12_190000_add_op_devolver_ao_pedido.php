<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-046 — OP sem saída pode voltar ao PED (CANCELADA com motivo).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordens_producao', function (Blueprint $table) {
            $table->string('motivo_cancelamento', 255)->nullable()->after('observacao');
            $table->timestamp('cancelada_em')->nullable()->after('motivo_cancelamento');
            $table->foreignId('cancelada_por')->nullable()->after('cancelada_em')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ordens_producao', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cancelada_por');
            $table->dropColumn(['motivo_cancelamento', 'cancelada_em']);
        });
    }
};
