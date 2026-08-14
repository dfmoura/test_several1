<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-050 — estorno do FAT com NF pendente (1 vigente por PED; histórico preservado).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('faturamentos', function (Blueprint $table) {
            $table->dropUnique(['empresa_id', 'pedido_id']);
        });

        Schema::table('faturamentos', function (Blueprint $table) {
            $table->index(['empresa_id', 'pedido_id', 'status']);
            $table->string('motivo_estorno', 255)->nullable();
            $table->timestamp('estornado_em')->nullable();
            $table->foreignId('estornado_por')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('faturamentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('estornado_por');
            $table->dropColumn(['motivo_estorno', 'estornado_em']);
            $table->dropIndex(['empresa_id', 'pedido_id', 'status']);
        });

        Schema::table('faturamentos', function (Blueprint $table) {
            $table->unique(['empresa_id', 'pedido_id']);
        });
    }
};
