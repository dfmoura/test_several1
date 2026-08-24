<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bonificação TRIGGER: período cortesia na conta (sem fingir ASAAS).
 * ADR: docs/ADR_CONSOLE_PLATAFORMA.md
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conta_ativacoes', function (Blueprint $table) {
            $table->timestamp('cortesia_ate')->nullable()->after('billing_metodo_em');
            $table->string('cortesia_motivo', 255)->nullable()->after('cortesia_ate');
            $table->timestamp('cortesia_concedida_em')->nullable()->after('cortesia_motivo');
            $table->foreignId('cortesia_por_user_id')
                ->nullable()
                ->after('cortesia_concedida_em')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('conta_ativacoes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cortesia_por_user_id');
            $table->dropColumn(['cortesia_ate', 'cortesia_motivo', 'cortesia_concedida_em']);
        });
    }
};
