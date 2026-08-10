<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parceiro_enderecos_entrega', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parceiro_id')->constrained('parceiros')->cascadeOnDelete();
            $table->string('apelido')->nullable();
            $table->string('logradouro')->nullable();
            $table->string('numero', 32)->nullable();
            $table->string('complemento')->nullable();
            $table->string('bairro')->nullable();
            $table->string('municipio')->nullable();
            $table->string('uf', 2)->nullable();
            $table->string('cep', 8)->nullable();
            $table->string('ibge', 7)->nullable();
            $table->string('responsavel_nome');
            $table->string('responsavel_telefone', 32)->nullable();
            $table->string('responsavel_documento', 32)->nullable();
            $table->text('observacoes')->nullable();
            $table->boolean('principal')->default(false);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();

            $table->index(['parceiro_id', 'principal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parceiro_enderecos_entrega');
    }
};
