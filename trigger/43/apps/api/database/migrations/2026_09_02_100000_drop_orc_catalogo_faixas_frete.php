<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Frete ORC deixa de usar catálogo de faixas kg × R$/km.
 * Modo de entrega + valor opcional (a definir) no fechamento — ADR_ORC_FRETE_ESTIMADO.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('orc_catalogo_faixas_frete');

        if (Schema::hasTable('orc_catalogo_parametros')) {
            DB::table('orc_catalogo_parametros')
                ->where('chave', 'peso_caixa_kg')
                ->delete();
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('orc_catalogo_faixas_frete')) {
            Schema::create('orc_catalogo_faixas_frete', function (Blueprint $table) {
                $table->id();
                $table->foreignId('empresa_id')->constrained('empresas');
                $table->decimal('kg_ate', 12, 3)->nullable();
                $table->decimal('preco_por_km', 14, 6)->nullable();
                $table->decimal('minimo_rs', 14, 2)->nullable();
                $table->boolean('ativo')->default(false);
                $table->unsignedInteger('ordem')->default(0);
                $table->timestamps();
                $table->index(['empresa_id', 'ativo']);
            });
        }
    }
};
