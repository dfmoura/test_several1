<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sugestões configuráveis de condição de pagamento por EMP.
 * ADR: docs/ADR_CONDICOES_COMERCIAIS_PAR.md — texto livre no documento; isto é só autocomplete.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('condicao_pagamento_sugestoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('texto', 64);
            $table->unsignedSmallInteger('ordenacao')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['empresa_id', 'ativo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('condicao_pagamento_sugestoes');
    }
};
