<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cadastro global de provedores de IA (tokens cifrados).
 * Base para consumo futuro via cliente com rotação por prioridade.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ia_provedores', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 120);
            $table->string('provedor', 40)->default('openai');
            $table->string('base_url', 500)->nullable();
            $table->string('modelo', 120)->nullable();
            $table->text('api_key_criptografada');
            $table->string('api_key_mascara', 40)->default('');
            $table->unsignedSmallInteger('prioridade')->default(100);
            $table->boolean('ativo')->default(true);
            $table->timestamp('ultimo_teste_em')->nullable();
            $table->boolean('ultimo_teste_ok')->nullable();
            $table->string('ultimo_teste_msg', 300)->nullable();
            $table->timestamps();

            $table->index(['ativo', 'prioridade'], 'ia_provedores_ativo_prio_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ia_provedores');
    }
};
