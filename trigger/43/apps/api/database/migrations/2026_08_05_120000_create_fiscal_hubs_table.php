<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hubs fiscais (integração com o fisco via Focus NFe etc.).
 * Credenciais por empresa_id; tokens homolog ≠ produção (domínio M09 / UC-INT-001).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_hubs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('codigo', 20);
            $table->string('nome', 120);
            $table->string('provedor', 40)->default('focusnfe');
            $table->string('ambiente_ativo', 20)->default('homologacao');
            $table->boolean('padrao')->default(false);
            $table->boolean('ativo')->default(true);
            $table->string('base_url_homologacao', 500)->nullable();
            $table->string('base_url_producao', 500)->nullable();
            $table->text('token_homologacao_criptografada')->nullable();
            $table->string('token_homologacao_mascara', 40)->default('');
            $table->text('token_producao_criptografada')->nullable();
            $table->string('token_producao_mascara', 40)->default('');
            $table->string('ultimo_teste_ambiente', 20)->nullable();
            $table->timestamp('ultimo_teste_em')->nullable();
            $table->boolean('ultimo_teste_ok')->nullable();
            $table->string('ultimo_teste_msg', 300)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['empresa_id', 'codigo'], 'fiscal_hubs_empresa_codigo_uq');
            $table->index(['empresa_id', 'ativo', 'padrao'], 'fiscal_hubs_empresa_ativo_padrao_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_hubs');
    }
};
