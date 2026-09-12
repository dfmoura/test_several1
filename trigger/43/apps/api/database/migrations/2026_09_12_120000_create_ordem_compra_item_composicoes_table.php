<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR_OC_RASCUNHO_ENVIO — composição do pedido (faixas L×qtd×C → m²).
 * 1 linha OC = 1 SKU; detalhe ao fornecedor; qtde_pedida = Σ area_m2.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordem_compra_item_composicoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ordem_compra_item_id')
                ->constrained('ordem_compra_itens')
                ->cascadeOnDelete();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->decimal('largura_mm', 12, 4);
            $table->decimal('quantidade', 15, 4);
            $table->decimal('comprimento_m', 12, 4);
            $table->decimal('area_m2', 15, 4);
            $table->timestamps();

            $table->index('ordem_compra_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordem_compra_item_composicoes');
    }
};
