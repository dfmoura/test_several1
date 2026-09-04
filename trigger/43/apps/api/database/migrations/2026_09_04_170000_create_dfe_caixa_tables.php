<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-090 — Caixa DF-e local (metadados + cursor NSU). Sync SEFAZ = BL-091.
 * Norma: docs/ADR_CAIXA_DFE_NFE_DESTINADAS.md
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dfe_sync_estados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->unique()->constrained('empresas')->restrictOnDelete();
            $table->string('ultimo_nsu', 20)->default('0');
            $table->string('max_nsu', 20)->nullable();
            $table->string('sync_status', 16)->default('IDLE');
            $table->string('sync_mensagem', 500)->nullable();
            $table->timestamp('ultima_sync_em')->nullable();
            $table->boolean('primeira_hidratacao_completa')->default(false);
            $table->unsignedSmallInteger('ano_alvo_hidratacao')->nullable();
            $table->timestamps();
        });

        Schema::create('dfe_documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('nsu', 20);
            $table->string('schema_dfe', 40)->nullable();
            $table->string('chave', 44)->nullable();
            $table->string('modelo', 2)->nullable();
            $table->string('serie', 8)->nullable();
            $table->string('numero', 20)->nullable();
            $table->date('data_emissao')->nullable();
            $table->string('emit_cnpj', 14)->nullable();
            $table->string('emit_nome', 120)->nullable();
            $table->decimal('valor_total', 15, 2)->nullable();
            $table->string('situacao', 20)->default('NOVA');
            $table->foreignId('ordem_compra_id')->nullable()->constrained('ordens_compra')->nullOnDelete();
            $table->string('xml_path', 240)->nullable();
            $table->string('xml_sha256', 64)->nullable();
            $table->json('resumo')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'nsu']);
            $table->unique(['empresa_id', 'chave']);
            $table->index(['empresa_id', 'situacao']);
            $table->index(['empresa_id', 'data_emissao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dfe_documentos');
        Schema::dropIfExists('dfe_sync_estados');
    }
};
