<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Handoff da coleta dirigida — material retirado entregue na produção (Fase C).
 * Não é segundo estoque: o MOV continua o fato oficial.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordens_producao', function (Blueprint $table) {
            $table->timestamp('insumos_entregues_em')->nullable()->after('iniciada_em');
            $table->unsignedBigInteger('insumos_entregues_por')->nullable()->after('insumos_entregues_em');
            $table->string('insumos_recebidos_nome', 120)->nullable()->after('insumos_entregues_por');
        });
    }

    public function down(): void
    {
        Schema::table('ordens_producao', function (Blueprint $table) {
            $table->dropColumn([
                'insumos_entregues_em',
                'insumos_entregues_por',
                'insumos_recebidos_nome',
            ]);
        });
    }
};
