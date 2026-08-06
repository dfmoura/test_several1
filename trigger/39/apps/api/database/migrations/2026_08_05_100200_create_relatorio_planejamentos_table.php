<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rascunhos assíncronos de planejamento (Fase 2 via fila — não bloqueia artisan serve).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relatorio_planejamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('users')->cascadeOnDelete();
            $table->text('prompt');
            $table->string('titulo', 200)->nullable();
            $table->string('orientacao', 16)->default('retrato');
            $table->string('status', 24)->default('PENDENTE'); // PENDENTE|PROCESSANDO|PRONTO|ERRO
            $table->json('programa_json')->nullable();
            $table->text('resumo_legivel')->nullable();
            $table->json('amostra_json')->nullable();
            $table->unsignedInteger('total_estimado')->nullable();
            $table->json('avisos_json')->nullable();
            $table->json('contexto_flags')->nullable();
            $table->foreignId('provedor_ia_id')->nullable()->constrained('ia_provedores')->nullOnDelete();
            $table->unsignedTinyInteger('tentativas')->default(0);
            $table->string('erro_mensagem', 2000)->nullable();
            $table->timestamps();

            $table->index(['empresa_id', 'status', 'id'], 'rel_plan_empresa_status_idx');
        });

        Schema::table('relatorio_execucoes', function (Blueprint $table) {
            $table->foreign('planejamento_id')
                ->references('id')
                ->on('relatorio_planejamentos')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('relatorio_execucoes', function (Blueprint $table) {
            $table->dropForeign(['planejamento_id']);
        });
        Schema::dropIfExists('relatorio_planejamentos');
    }
};
