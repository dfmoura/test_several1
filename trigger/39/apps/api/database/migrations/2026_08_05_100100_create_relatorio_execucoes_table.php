<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relatorio_execucoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('relatorio_id')->nullable()->constrained('relatorios')->nullOnDelete();
            $table->foreignId('planejamento_id')->nullable()->index();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('usuario_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('etapa', 32); // planejar|narrar
            $table->foreignId('provedor_ia_id')->nullable()->constrained('ia_provedores')->nullOnDelete();
            $table->string('modelo', 120)->nullable();
            $table->unsignedTinyInteger('tentativa')->default(1);
            $table->string('prompt_hash', 64)->nullable();
            $table->text('prompt_texto')->nullable(); // só se relatorio_ia_log_prompt=true
            $table->unsignedInteger('prompt_tokens')->nullable();
            $table->unsignedInteger('completion_tokens')->nullable();
            $table->unsignedInteger('latencia_ms')->nullable();
            $table->boolean('sucesso')->default(false);
            $table->string('erro', 1000)->nullable();
            $table->json('spec_resultante')->nullable();
            $table->unsignedInteger('memory_peak_mb')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['empresa_id', 'etapa', 'created_at'], 'rel_exec_empresa_etapa_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relatorio_execucoes');
    }
};
