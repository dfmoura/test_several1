<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo canônico de naturezas gerenciais (estudo trigger/32).
 * Fonte: NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt — grupos 1–5 apenas.
 * ≠ produto_grupos.natureza · ≠ plano de contas contábil · ≠ CFIN.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('naturezas_gerenciais', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 32)->unique(); // 1.01.01
            $table->string('codigo_exibicao', 40)->unique(); // NAT-1.01.01
            $table->unsignedTinyInteger('grupo'); // 1–5
            $table->unsignedTinyInteger('nivel'); // 1 = raiz do grupo
            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('naturezas_gerenciais')
                ->nullOnDelete();
            $table->string('nome');
            $table->text('descricao')->nullable();
            $table->boolean('aceita_lancamento')->default(false);
            $table->boolean('ativo')->default(true);
            $table->unsignedSmallInteger('ordenacao')->default(100);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['grupo', 'codigo']);
            $table->index(['parent_id']);
            $table->index(['ativo', 'aceita_lancamento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('naturezas_gerenciais');
    }
};
