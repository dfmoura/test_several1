<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contagem física INV — leituras QR volume + local referido (emenda ADR-039-EST-003).
 * Não escreve saldo; rollup alimenta contar1/contar2 do item SKU.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_inventario_leituras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventario_id')->constrained('estoque_inventarios')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->unsignedTinyInteger('rodada'); // 1|2
            $table->foreignId('lote_id')->nullable()->constrained('estoque_lotes')->restrictOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->foreignId('endereco_id_lido')->nullable()->constrained('estoque_enderecos')->nullOnDelete();
            $table->foreignId('endereco_id_esperado')->nullable()->constrained('estoque_enderecos')->nullOnDelete();
            $table->decimal('qtde_volume', 15, 4);
            $table->string('unidade', 8);
            // ENCONTRADO|LOCAL_ERRADO|FALTANTE|FORA_ESCOPO|ANULADA
            $table->string('resultado', 24);
            $table->foreignId('lido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('lido_em')->nullable();
            $table->timestamps();

            $table->index(['inventario_id', 'rodada', 'resultado']);
            $table->index(['empresa_id', 'produto_id']);
            $table->index(['inventario_id', 'rodada', 'lote_id'], 'inv_leitura_lote_rodada_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_inventario_leituras');
    }
};
