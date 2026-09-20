<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contador atômico de série/nNF por EMP — emissão NF-e direta (BL-101).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nfe_series_controle', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->unsignedSmallInteger('serie')->default(1);
            $table->unsignedInteger('ultimo_numero')->default(0);
            $table->timestamps();
            $table->unique(['empresa_id', 'serie']);
        });

        Schema::create('documento_fiscal_saida_eventos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('documento_fiscal_saida_id')->constrained('documento_fiscal_saidas')->cascadeOnDelete();
            $table->string('tipo', 16); // CANCELAMENTO | CCE
            $table->string('tp_evento', 8); // 110111 | 110110
            $table->unsignedSmallInteger('n_seq_evento')->default(1);
            $table->string('status', 24); // PROCESSANDO | AUTORIZADO | REJEITADO | ERRO
            $table->string('protocolo', 64)->nullable();
            $table->string('mensagem', 500)->nullable();
            $table->text('justificativa')->nullable();
            $table->longText('xml_envio')->nullable();
            $table->longText('xml_retorno')->nullable();
            $table->json('response_json')->nullable();
            $table->timestamp('autorizado_em')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['empresa_id', 'documento_fiscal_saida_id'], 'dfs_evt_emp_doc_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documento_fiscal_saida_eventos');
        Schema::dropIfExists('nfe_series_controle');
    }
};
