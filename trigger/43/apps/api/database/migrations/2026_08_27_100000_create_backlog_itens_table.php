<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Registro de backlog por EMP (ADR_BACKLOG.md).
 * Tarefa + lançamento automático (created_at) + conclusão automática (concluido_em).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backlog_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 16);
            $table->string('tarefa', 500);
            $table->timestamp('concluido_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'concluido_em']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backlog_itens');
    }
};
