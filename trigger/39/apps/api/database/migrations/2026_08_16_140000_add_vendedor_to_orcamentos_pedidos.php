<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-061 — vendedor no ORC/PED (FK queryável; snapshot no JSON).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->foreignId('vendedor_parceiro_id')
                ->nullable()
                ->after('parceiro_id')
                ->constrained('parceiros')
                ->nullOnDelete();
            $table->index(['empresa_id', 'vendedor_parceiro_id']);
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->foreignId('vendedor_parceiro_id')
                ->nullable()
                ->after('parceiro_id')
                ->constrained('parceiros')
                ->nullOnDelete();
            $table->index(['empresa_id', 'vendedor_parceiro_id']);
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('vendedor_parceiro_id');
        });
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('vendedor_parceiro_id');
        });
    }
};
