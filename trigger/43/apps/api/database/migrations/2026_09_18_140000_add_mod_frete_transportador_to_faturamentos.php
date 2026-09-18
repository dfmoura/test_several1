<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FAT: modalidade Focus (mod_frete) + transportador (PAR) para NF-e de saída.
 * ADR_NFE_TRANSPORTE_SAIDA.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faturamentos', function (Blueprint $table) {
            $table->char('mod_frete', 1)->nullable()->after('forma_pagamento');
            $table->foreignId('transportador_id')
                ->nullable()
                ->after('mod_frete')
                ->constrained('parceiros')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('faturamentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transportador_id');
            $table->dropColumn('mod_frete');
        });
    }
};
