<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-049 — FAT do PED + TIT/COB do saldo (ADR_FATURAMENTO_COBRANCA).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faturamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('pedido_id')->constrained('pedidos')->restrictOnDelete();
            $table->foreignId('orcamento_id')->nullable()->constrained('orcamentos')->nullOnDelete();
            $table->foreignId('parceiro_id')->constrained('parceiros')->restrictOnDelete();
            $table->string('status', 24)->default('CONFIRMADO'); // CONFIRMADO
            $table->string('nf_status', 24)->default('PENDENTE'); // PENDENTE|AUTORIZADA|REJEITADA|CANCELADA
            $table->decimal('valor_bruto', 15, 2);
            $table->decimal('valor_adiantamento', 15, 2)->default(0);
            $table->decimal('valor_a_cobrar', 15, 2)->default(0);
            $table->string('condicao_pagamento', 64)->nullable();
            $table->string('forma_pagamento', 32)->nullable();
            $table->foreignId('adiantamento_titulo_id')->nullable()->constrained('titulos')->nullOnDelete();
            $table->json('snapshot')->nullable();
            $table->text('observacao')->nullable();
            $table->timestamp('faturado_em')->nullable();
            $table->foreignId('faturado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->unique(['empresa_id', 'pedido_id']);
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'parceiro_id']);
        });

        Schema::create('faturamento_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('faturamento_id')->constrained('faturamentos')->cascadeOnDelete();
            $table->foreignId('pedido_item_id')->constrained('pedido_itens')->restrictOnDelete();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->string('descricao', 255);
            $table->string('unidade', 8)->nullable();
            $table->decimal('qtde', 15, 4);
            $table->decimal('preco_unitario', 19, 6)->nullable();
            $table->decimal('valor', 15, 2);
            $table->timestamps();

            $table->index(['faturamento_id', 'ordem']);
        });

        Schema::table('titulos', function (Blueprint $table) {
            $table->foreignId('pedido_id')
                ->nullable()
                ->after('orcamento_id')
                ->constrained('pedidos')
                ->nullOnDelete();
            $table->foreignId('faturamento_id')
                ->nullable()
                ->after('pedido_id')
                ->constrained('faturamentos')
                ->nullOnDelete();
            $table->index(['empresa_id', 'pedido_id']);
            $table->index(['empresa_id', 'faturamento_id']);
        });
    }

    public function down(): void
    {
        Schema::table('titulos', function (Blueprint $table) {
            $table->dropIndex(['empresa_id', 'faturamento_id']);
            $table->dropIndex(['empresa_id', 'pedido_id']);
            $table->dropConstrainedForeignId('faturamento_id');
            $table->dropConstrainedForeignId('pedido_id');
        });

        Schema::dropIfExists('faturamento_itens');
        Schema::dropIfExists('faturamentos');
    }
};
