<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-033 — Compras até estoque (ADR-039-CPR-001).
 * NEC → [COT] → OC → MOV entrada → TIT a pagar → BX.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compra_necessidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->decimal('qtde', 15, 4);
            $table->string('unidade', 8);
            $table->date('necessario_em')->nullable();
            $table->string('motivo', 240)->nullable();
            $table->string('prioridade', 16)->default('NORMAL'); // NORMAL|URGENTE
            $table->string('status', 16)->default('ABERTA'); // ABERTA|ATENDIDA|CANCELADA
            $table->foreignId('solicitante_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
        });

        Schema::create('cotacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->string('status', 16)->default('RASCUNHO'); // RASCUNHO|ABERTA|DECIDIDA|CANCELADA
            $table->foreignId('necessidade_id')->nullable()->constrained('compra_necessidades')->nullOnDelete();
            $table->date('prazo_resposta')->nullable();
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
        });

        Schema::create('cotacao_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cotacao_id')->constrained('cotacoes')->cascadeOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->decimal('qtde', 15, 4);
            $table->string('unidade', 8);
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->timestamps();

            $table->index('cotacao_id');
        });

        Schema::create('cotacao_propostas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cotacao_id')->constrained('cotacoes')->cascadeOnDelete();
            $table->foreignId('cotacao_item_id')->constrained('cotacao_itens')->cascadeOnDelete();
            $table->foreignId('fornecedor_id')->constrained('parceiros')->restrictOnDelete();
            $table->decimal('valor_unitario', 19, 6);
            $table->decimal('frete', 15, 2)->nullable();
            $table->unsignedSmallInteger('prazo_dias')->nullable();
            $table->date('validade')->nullable();
            $table->string('condicao_pagamento', 120)->nullable();
            $table->boolean('vencedora')->default(false);
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->index(['cotacao_id', 'fornecedor_id']);
        });

        Schema::create('ordens_compra', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('fornecedor_id')->constrained('parceiros')->restrictOnDelete();
            $table->foreignId('cotacao_id')->nullable()->constrained('cotacoes')->nullOnDelete();
            $table->foreignId('necessidade_id')->nullable()->constrained('compra_necessidades')->nullOnDelete();
            $table->string('origem', 16)->default('DIRETA'); // DIRETA|COTACAO
            $table->boolean('urgente')->default(false);
            $table->string('status', 16)->default('ABERTA'); // ABERTA|PARCIAL|RECEBIDA|CANCELADA
            $table->string('condicao_pagamento', 120)->nullable();
            $table->date('previsao_entrega')->nullable();
            $table->decimal('valor_total', 15, 2)->default(0);
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'fornecedor_id']);
        });

        Schema::create('ordem_compra_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ordem_compra_id')->constrained('ordens_compra')->cascadeOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->decimal('qtde_pedida', 15, 4);
            $table->decimal('qtde_recebida', 15, 4)->default(0);
            $table->string('unidade', 8);
            $table->decimal('valor_unitario', 19, 6);
            $table->decimal('valor_total', 15, 2);
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->timestamps();

            $table->index('ordem_compra_id');
        });

        Schema::create('estoque_movimentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->string('tipo', 24); // ENTRADA_COMPRA
            $table->foreignId('ordem_compra_id')->nullable()->constrained('ordens_compra')->nullOnDelete();
            $table->foreignId('fornecedor_id')->nullable()->constrained('parceiros')->nullOnDelete();
            $table->string('nf_chave', 44)->nullable();
            $table->string('nf_numero', 20)->nullable();
            $table->date('nf_data')->nullable();
            $table->timestamp('conferido_em');
            $table->foreignId('conferido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->unique(['empresa_id', 'nf_chave']);
            $table->index(['empresa_id', 'tipo']);
        });

        Schema::create('estoque_movimento_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('movimento_id')->constrained('estoque_movimentos')->cascadeOnDelete();
            $table->foreignId('ordem_compra_item_id')->nullable()->constrained('ordem_compra_itens')->nullOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->decimal('qtde', 15, 4); // unidade_interna
            $table->string('unidade', 8); // unidade_interna
            $table->decimal('valor_unitario', 19, 6); // R$ / unidade_interna
            $table->decimal('valor_total', 15, 2);
            $table->decimal('custo_medio_apos', 19, 6);
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->timestamps();

            $table->index('movimento_id');
        });

        Schema::create('estoque_saldos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->decimal('qtde', 15, 4)->default(0);
            $table->string('unidade', 8);
            $table->decimal('custo_medio', 19, 6)->default(0);
            $table->timestamps();

            $table->unique(['empresa_id', 'produto_id']);
        });

        Schema::create('titulos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->string('tipo', 8); // PAGAR|RECEBER
            $table->foreignId('parceiro_id')->constrained('parceiros')->restrictOnDelete();
            $table->foreignId('natureza_id')->constrained('naturezas_gerenciais')->restrictOnDelete();
            $table->foreignId('ordem_compra_id')->nullable()->constrained('ordens_compra')->nullOnDelete();
            $table->foreignId('movimento_id')->nullable()->constrained('estoque_movimentos')->nullOnDelete();
            $table->string('documento', 40)->nullable();
            $table->date('emissao');
            $table->date('vencimento');
            $table->decimal('valor', 15, 2);
            $table->decimal('saldo', 15, 2);
            $table->string('status', 16)->default('ABERTO'); // ABERTO|PARCIAL|QUITADO|CANCELADO
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'tipo', 'status']);
            $table->index(['empresa_id', 'vencimento']);
        });

        Schema::create('titulo_baixas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('titulo_id')->constrained('titulos')->restrictOnDelete();
            $table->foreignId('conta_financeira_id')->constrained('empresa_contas_financeiras')->restrictOnDelete();
            $table->decimal('valor', 15, 2);
            $table->date('pago_em');
            $table->string('forma', 32)->nullable();
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index('titulo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('titulo_baixas');
        Schema::dropIfExists('titulos');
        Schema::dropIfExists('estoque_saldos');
        Schema::dropIfExists('estoque_movimento_itens');
        Schema::dropIfExists('estoque_movimentos');
        Schema::dropIfExists('ordem_compra_itens');
        Schema::dropIfExists('ordens_compra');
        Schema::dropIfExists('cotacao_propostas');
        Schema::dropIfExists('cotacao_itens');
        Schema::dropIfExists('cotacoes');
        Schema::dropIfExists('compra_necessidades');
    }
};
