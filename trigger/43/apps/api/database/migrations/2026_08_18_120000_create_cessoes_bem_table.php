<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cessão de bem ao cliente (comodato / locação). Sem NF automática (ADR_OPERACOES_SAIDA).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cessoes_bem', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('bem_id')->constrained('bens_patrimoniais')->restrictOnDelete();
            $table->foreignId('parceiro_id')->constrained('parceiros')->restrictOnDelete();
            $table->string('tipo', 16);
            $table->string('status', 16)->default('VIGENTE');
            $table->date('iniciado_em');
            $table->date('encerra_previsto_em')->nullable();
            $table->date('encerrado_em')->nullable();
            $table->string('motivo_encerramento', 240)->nullable();
            $table->decimal('valor_mensal', 14, 2)->nullable();
            $table->string('documento_fiscal', 16)->default('NENHUM');
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
            $table->index(['bem_id', 'status']);
            $table->index(['parceiro_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cessoes_bem');
    }
};
