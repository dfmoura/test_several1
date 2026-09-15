<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OC: modalidade CIF/FOB (mod_frete) + transportador (PAR).
 * Substitui o frete R$ comercial no cabeçalho — valor_frete permanece legado (0).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordens_compra', function (Blueprint $table) {
            $table->char('mod_frete', 1)->nullable()->after('valor_frete');
            $table->foreignId('transportador_id')
                ->nullable()
                ->after('fornecedor_id')
                ->constrained('parceiros')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ordens_compra', function (Blueprint $table) {
            $table->dropConstrainedForeignId('transportador_id');
            $table->dropColumn('mod_frete');
        });
    }
};
