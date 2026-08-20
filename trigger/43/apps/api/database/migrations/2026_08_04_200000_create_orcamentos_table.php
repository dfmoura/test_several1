<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orcamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas');
            $table->unsignedSmallInteger('ano');
            $table->unsignedInteger('numero');
            $table->string('codigo', 32);
            $table->unsignedInteger('versao')->default(1);
            $table->foreignId('parceiro_id')->constrained('parceiros');
            $table->string('cliente_nome', 255);
            $table->string('status', 20)->default('RASCUNHO');
            $table->json('input_snapshot')->nullable();
            $table->json('result_snapshot')->nullable();
            $table->string('chave_matriz', 64)->nullable();
            $table->boolean('cobra_matriz')->default(false);
            $table->decimal('valor_matriz', 15, 2)->default(0);
            $table->unsignedInteger('prazo_entrega_dias')->default(12);
            $table->unsignedInteger('validade_dias')->default(7);
            $table->decimal('tolerancia_qtd_pct', 7, 4)->default(20);
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->unique(['empresa_id', 'ano', 'numero']);
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'parceiro_id']);
        });

        Schema::create('matriz_cobradas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas');
            $table->string('chave_matriz', 64);
            $table->string('cliente', 255);
            $table->foreignId('orcamento_id')->nullable()->constrained('orcamentos')->nullOnDelete();
            $table->decimal('valor', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['empresa_id', 'chave_matriz']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('matriz_cobradas');
        Schema::dropIfExists('orcamentos');
    }
};
