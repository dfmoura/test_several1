<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Embalagem física do PA (bobina → caixa) — ADR_PA_EMBALAGEM_BOBINA_CAIXA.
 * Paralelo ao saldo: não altera estoque_lotes / ENTRADA_PA.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pa_embalagens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('codigo', 32);
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->foreignId('pedido_item_id')->constrained('pedido_itens')->cascadeOnDelete();
            $table->foreignId('ordem_producao_id')->constrained('ordens_producao')->cascadeOnDelete();
            $table->string('status', 16); // CONFIRMADA
            $table->decimal('qtde_etiquetas', 18, 4);
            $table->unsignedInteger('qtde_bobinas');
            $table->unsignedInteger('qtde_caixas');
            $table->unsignedInteger('etiq_por_rolo')->nullable();
            $table->unsignedInteger('rolos_por_caixa')->nullable();
            $table->string('tubete', 32)->nullable();
            $table->string('caixa_medida', 64)->nullable();
            $table->string('saida_etiqueta', 16)->nullable();
            $table->string('origem', 16)->default('SUGERIDA'); // SUGERIDA | MANUAL
            $table->text('observacao')->nullable();
            $table->timestamp('confirmada_em')->nullable();
            $table->foreignId('confirmada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['ordem_producao_id', 'status']);
            $table->index(['empresa_id', 'pedido_id']);
        });

        Schema::create('pa_embalagem_caixas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('embalagem_id')->constrained('pa_embalagens')->cascadeOnDelete();
            $table->unsignedInteger('sequencia');
            $table->string('codigo', 40);
            $table->unsignedInteger('qtde_bobinas');
            $table->decimal('qtde_etiquetas', 18, 4);
            $table->string('qr_token', 64)->nullable();
            $table->timestamps();

            $table->unique(['embalagem_id', 'sequencia']);
            $table->unique(['empresa_id', 'codigo']);
        });

        Schema::create('pa_embalagem_bobinas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('embalagem_id')->constrained('pa_embalagens')->cascadeOnDelete();
            $table->foreignId('caixa_id')->nullable()->constrained('pa_embalagem_caixas')->nullOnDelete();
            $table->unsignedInteger('sequencia');
            $table->string('codigo', 40);
            $table->decimal('qtde_etiquetas', 18, 4);
            $table->string('tubete', 32)->nullable();
            $table->string('qr_token', 64)->nullable();
            $table->timestamps();

            $table->unique(['embalagem_id', 'sequencia']);
            $table->unique(['empresa_id', 'codigo']);
            $table->index(['caixa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pa_embalagem_bobinas');
        Schema::dropIfExists('pa_embalagem_caixas');
        Schema::dropIfExists('pa_embalagens');
    }
};
