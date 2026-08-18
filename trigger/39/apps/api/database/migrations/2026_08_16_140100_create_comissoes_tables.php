<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-061 — COM- apuração + CFE- fechamento (ADR_COMISSAO_VENDEDOR).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comissao_fechamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->string('status', 24); // ABERTO | TITULO_GERADO | PAGO | CANCELADO
            $table->date('periodo_inicio')->nullable();
            $table->date('periodo_fim')->nullable();
            $table->date('vencimento')->nullable();
            $table->decimal('valor_total', 15, 2)->default(0);
            $table->text('observacao')->nullable();
            $table->timestamp('liberado_em')->nullable();
            $table->foreignId('liberado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelado_em')->nullable();
            $table->foreignId('cancelado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->string('motivo_cancelamento', 255)->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
        });

        Schema::create('comissoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->string('idempotency_key', 64);
            $table->foreignId('vendedor_parceiro_id')->constrained('parceiros')->restrictOnDelete();
            $table->foreignId('orcamento_id')->nullable()->constrained('orcamentos')->nullOnDelete();
            $table->foreignId('pedido_id')->nullable()->constrained('pedidos')->nullOnDelete();
            $table->foreignId('faturamento_id')->nullable()->constrained('faturamentos')->nullOnDelete();
            $table->foreignId('titulo_id')->nullable()->constrained('titulos')->nullOnDelete();
            $table->foreignId('baixa_id')->nullable()->constrained('titulo_baixas')->nullOnDelete();
            $table->foreignId('fechamento_id')->nullable()->constrained('comissao_fechamentos')->nullOnDelete();
            $table->foreignId('titulo_pagar_id')->nullable()->constrained('titulos')->nullOnDelete();
            $table->string('origem_evento', 32); // BAIXA | APROPRIACAO_SINAL
            $table->string('status', 24); // PREVISTA | LIBERADA | PAGA | ESTORNADA
            $table->decimal('aliquota', 7, 4);
            $table->decimal('base_valor', 15, 2);
            $table->decimal('valor', 15, 2);
            $table->text('observacao')->nullable();
            $table->timestamp('estornada_em')->nullable();
            $table->foreignId('estornada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->unique(['empresa_id', 'idempotency_key']);
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'vendedor_parceiro_id', 'status']);
            $table->index(['empresa_id', 'pedido_id']);
            $table->index(['empresa_id', 'fechamento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comissoes');
        Schema::dropIfExists('comissao_fechamentos');
    }
};
