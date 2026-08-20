<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-044 — PED → OP/OS → MOV produção (estudo 32 / ADR_PRODUCAO_PED_OP_ESTOQUE).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('orcamento_id')->constrained('orcamentos')->restrictOnDelete();
            $table->foreignId('parceiro_id')->constrained('parceiros')->restrictOnDelete();
            $table->string('status', 32); // LIBERADO|EM_PRODUCAO|PRODUZIDO|CANCELADO
            $table->unsignedTinyInteger('faixa_index')->default(0);
            $table->decimal('tolerancia_qtd_pct', 7, 4)->default(20);
            $table->unsignedSmallInteger('prazo_entrega_dias')->nullable();
            $table->json('snapshot')->nullable(); // fotografia comercial/técnica
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->unique(['empresa_id', 'orcamento_id']);
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'parceiro_id']);
        });

        Schema::create('pedido_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->string('necessidade', 16); // PRODUCAO|SERVICO|REVENDA
            $table->string('familia_fiscal', 16)->nullable(); // PA-ETQ|SVC|REV
            $table->string('descricao', 255);
            $table->json('especificacao')->nullable();
            $table->decimal('qtde_pedida', 15, 4);
            $table->decimal('qtde_produzida', 15, 4)->default(0);
            $table->decimal('qtde_faturavel', 15, 4)->default(0);
            $table->string('unidade', 8)->default('MIL');
            $table->decimal('preco_unitario', 19, 6)->nullable();
            $table->decimal('valor_total', 15, 2)->nullable();
            $table->string('status', 24)->default('PENDENTE'); // PENDENTE|EM_PRODUCAO|PRODUZIDO|CANCELADO
            $table->foreignId('produto_pa_id')->nullable()->constrained('produtos')->nullOnDelete();
            $table->timestamps();

            $table->index(['pedido_id', 'ordem']);
            $table->index(['empresa_id', 'necessidade']);
        });

        Schema::create('ordens_producao', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('pedido_id')->constrained('pedidos')->restrictOnDelete();
            $table->foreignId('pedido_item_id')->constrained('pedido_itens')->restrictOnDelete();
            $table->string('status', 24); // ABERTA|EM_ANDAMENTO|CONCLUIDA|CANCELADA
            $table->decimal('qtde_planejada', 15, 4);
            $table->decimal('qtde_boa', 15, 4)->nullable();
            $table->decimal('qtde_refugo', 15, 4)->default(0);
            $table->boolean('fora_tolerancia')->default(false);
            $table->string('motivo_fora_tolerancia', 255)->nullable();
            $table->decimal('custo_materiais', 15, 2)->nullable();
            $table->foreignId('pa_movimento_id')->nullable()->constrained('estoque_movimentos')->nullOnDelete();
            $table->timestamp('iniciada_em')->nullable();
            $table->timestamp('concluida_em')->nullable();
            $table->foreignId('concluida_por')->nullable()->constrained('users')->nullOnDelete();
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
            $table->index(['pedido_id']);
        });

        Schema::create('ordem_producao_materiais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('ordem_producao_id')->constrained('ordens_producao')->cascadeOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->decimal('qtde_requisitada', 15, 4)->default(0);
            $table->decimal('qtde_consumida', 15, 4)->default(0);
            $table->decimal('qtde_retorno', 15, 4)->default(0);
            $table->decimal('qtde_perda', 15, 4)->default(0);
            $table->string('unidade', 8);
            $table->foreignId('saida_movimento_id')->nullable()->constrained('estoque_movimentos')->nullOnDelete();
            $table->foreignId('retorno_movimento_id')->nullable()->constrained('estoque_movimentos')->nullOnDelete();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->timestamps();

            $table->index(['ordem_producao_id']);
            $table->unique(['ordem_producao_id', 'produto_id'], 'op_mat_op_produto_unique');
        });

        Schema::create('ordens_servico', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('pedido_id')->constrained('pedidos')->restrictOnDelete();
            $table->foreignId('pedido_item_id')->constrained('pedido_itens')->restrictOnDelete();
            $table->string('status', 24); // ABERTA|EM_ANDAMENTO|CONCLUIDA|CANCELADA
            $table->decimal('qtde_planejada', 15, 4);
            $table->decimal('qtde_executada', 15, 4)->nullable();
            $table->boolean('fora_tolerancia')->default(false);
            $table->string('motivo_fora_tolerancia', 255)->nullable();
            $table->timestamp('iniciada_em')->nullable();
            $table->timestamp('concluida_em')->nullable();
            $table->foreignId('concluida_por')->nullable()->constrained('users')->nullOnDelete();
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
            $table->index(['pedido_id']);
        });

        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->foreignId('pedido_id')->nullable()->after('ajuste_id')->constrained('pedidos')->nullOnDelete();
            $table->foreignId('ordem_producao_id')->nullable()->after('pedido_id')->constrained('ordens_producao')->nullOnDelete();
            $table->foreignId('ordem_servico_id')->nullable()->after('ordem_producao_id')->constrained('ordens_servico')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ordem_servico_id');
            $table->dropConstrainedForeignId('ordem_producao_id');
            $table->dropConstrainedForeignId('pedido_id');
        });

        Schema::dropIfExists('ordens_servico');
        Schema::dropIfExists('ordem_producao_materiais');
        Schema::dropIfExists('ordens_producao');
        Schema::dropIfExists('pedido_itens');
        Schema::dropIfExists('pedidos');
    }
};
