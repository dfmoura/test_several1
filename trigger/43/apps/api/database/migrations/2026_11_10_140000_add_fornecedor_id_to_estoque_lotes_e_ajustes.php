<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fornecedor opcional no volume (fonte física) e default/canônico no AJU.
 * ENTRADA_COMPRA continua documentada no MOV; AJU só atribui se o humano declarar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estoque_lotes', function (Blueprint $table) {
            $table->foreignId('fornecedor_id')
                ->nullable()
                ->after('endereco_id')
                ->constrained('parceiros')
                ->nullOnDelete();
        });

        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->foreignId('fornecedor_id')
                ->nullable()
                ->after('endereco_id')
                ->constrained('parceiros')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fornecedor_id');
        });

        Schema::table('estoque_lotes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fornecedor_id');
        });
    }
};
