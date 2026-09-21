<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR_ORC_ITENS — fase 1 (paridade N=1).
 * Dual-write do job único; ORC flat continua fonte de verdade para UI/aprovação/PED.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orcamento_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('orcamento_id')->constrained('orcamentos')->cascadeOnDelete();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->string('rotulo', 120)->nullable();
            $table->json('input_snapshot')->nullable();
            $table->json('result_snapshot')->nullable();
            $table->timestamps();

            $table->unique(['orcamento_id', 'ordem']);
            $table->index(['empresa_id', 'orcamento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orcamento_itens');
    }
};
