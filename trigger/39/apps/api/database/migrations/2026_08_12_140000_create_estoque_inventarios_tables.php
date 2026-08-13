<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-042 — Inventário profissional (INV) + extensão AJU (alçada / causa raiz / link INV).
 * Estudo 32: AJUSTE_ESTOQUE_INVENTARIO.txt — saldo só via MOV aprovado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_inventarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->string('tipo', 16); // ROTATIVO|GERAL|VIRADA
            $table->string('status', 16); // ABERTO|EM_CONTAGEM|CONFRONTADO|ENCERRADO|CANCELADO
            $table->timestamp('iniciado_em')->nullable();
            $table->timestamp('encerrado_em')->nullable();
            $table->decimal('acuracidade_pct', 8, 4)->nullable();
            $table->unsignedInteger('skus_contados')->nullable();
            $table->unsignedInteger('skus_ok')->nullable();
            $table->text('observacao')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'tipo']);
        });

        Schema::create('estoque_inventario_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventario_id')->constrained('estoque_inventarios')->cascadeOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->decimal('qtde_sistema_corte', 15, 4);
            $table->string('unidade', 8);
            $table->decimal('qtde_1', 15, 4)->nullable();
            $table->foreignId('contado_por_1')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('contado_em_1')->nullable();
            $table->decimal('qtde_2', 15, 4)->nullable();
            $table->foreignId('contado_por_2')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('contado_em_2')->nullable();
            $table->decimal('qtde_final', 15, 4)->nullable();
            $table->decimal('qtde_diferenca', 15, 4)->nullable();
            $table->string('status', 24); // PENDENTE|EM_CONTAGEM|CONTADO_1|DIVERGENTE|RECONTADO|OK|AJU_PENDENTE|AJU_GERADO
            $table->unsignedBigInteger('ajuste_id')->nullable();
            $table->boolean('checklist_confirmado')->default(false);
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->unique(['inventario_id', 'produto_id']);
            $table->index(['empresa_id', 'produto_id', 'status']);
            $table->index('ajuste_id');
        });

        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->foreignId('inventario_item_id')->nullable()->after('produto_id')
                ->constrained('estoque_inventario_itens')->nullOnDelete();
            $table->decimal('valor_ajuste', 15, 2)->nullable()->after('qtde_diferenca');
            $table->string('alcada', 24)->nullable()->after('valor_ajuste'); // LIDER|GESTOR|DIRECAO
            $table->text('causa_raiz')->nullable()->after('observacao');
            $table->boolean('ciencia_diretoria')->default(false)->after('causa_raiz');
            $table->boolean('ciencia_contabilidade')->default(false)->after('ciencia_diretoria');
            $table->boolean('divergencia_relevante')->default(false)->after('ciencia_contabilidade');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inventario_item_id');
            $table->dropColumn([
                'valor_ajuste',
                'alcada',
                'causa_raiz',
                'ciencia_diretoria',
                'ciencia_contabilidade',
                'divergencia_relevante',
            ]);
        });

        Schema::dropIfExists('estoque_inventario_itens');
        Schema::dropIfExists('estoque_inventarios');
    }
};
