<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-036 — AJU (contagem avulsa) + extensão MOV tipo AJUSTE.
 * Estudo 32: AJUSTE_ESTOQUE_INVENTARIO.txt — saldo só via MOV aprovado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_ajustes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->string('origem', 24); // CONTAGEM_AVULSA|INV_ROTATIVO|INV_GERAL|VIRADA
            $table->string('motivo_codigo', 8); // A01..A11
            $table->string('motivo_complemento', 240)->nullable();
            $table->decimal('qtde_sistema', 15, 4);
            $table->decimal('qtde_contada', 15, 4);
            $table->decimal('qtde_diferenca', 15, 4); // contada - sistema (unidade_interna)
            $table->string('unidade', 8);
            $table->boolean('checklist_confirmado')->default(false);
            $table->string('status', 16); // PENDENTE|APROVADO|REJEITADO
            $table->foreignId('solicitado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            // movimento_id preenchido após aprovação (sem FK cruzada com estoque_movimentos.ajuste_id)
            $table->unsignedBigInteger('movimento_id')->nullable();
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'produto_id']);
            $table->index('movimento_id');
        });

        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->string('motivo_codigo', 8)->nullable()->after('observacao');
            $table->foreignId('ajuste_id')->nullable()->after('motivo_codigo')
                ->constrained('estoque_ajustes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('estoque_movimentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ajuste_id');
            $table->dropColumn('motivo_codigo');
        });

        Schema::dropIfExists('estoque_ajustes');
    }
};
