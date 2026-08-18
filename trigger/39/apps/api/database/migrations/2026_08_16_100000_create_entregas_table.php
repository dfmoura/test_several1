<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-060 — ENT- romaneio/entrega após FAT (ADR_ENTREGA_EXPEDICAO).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entregas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('pedido_id')->constrained('pedidos')->restrictOnDelete();
            $table->foreignId('faturamento_id')->constrained('faturamentos')->restrictOnDelete();
            $table->foreignId('parceiro_id')->constrained('parceiros')->restrictOnDelete();
            $table->string('modo', 16); // RETIRAR | ENTREGAR
            $table->string('tipo_saida', 24); // BALCAO | FROTA | TRANSPORTADORA | OUTRO
            $table->string('status', 24); // AGUARDA_RETIRADA | EM_TRANSITO | ENTREGUE | RECUSADA | CANCELADA
            $table->unsignedSmallInteger('volumes')->default(1);
            $table->decimal('peso_kg', 12, 3)->nullable();
            $table->decimal('qtde', 15, 4);
            $table->string('unidade', 8)->nullable();
            $table->foreignId('transportadora_id')->nullable()->constrained('parceiros')->nullOnDelete();
            $table->string('rastreio', 80)->nullable();
            $table->json('destino_snapshot')->nullable();
            $table->text('observacao')->nullable();
            $table->string('prova_tipo', 32)->nullable();
            $table->string('prova_nome', 120)->nullable();
            $table->string('prova_documento', 40)->nullable();
            $table->string('prova_obs', 255)->nullable();
            $table->timestamp('expedido_em')->nullable();
            $table->foreignId('expedido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmado_em')->nullable();
            $table->foreignId('confirmado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('recusado_em')->nullable();
            $table->foreignId('recusado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->string('motivo_recusa', 255)->nullable();
            $table->timestamp('cancelado_em')->nullable();
            $table->foreignId('cancelado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->string('motivo_cancelamento', 255)->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'pedido_id', 'status']);
            $table->index(['empresa_id', 'parceiro_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entregas');
    }
};
