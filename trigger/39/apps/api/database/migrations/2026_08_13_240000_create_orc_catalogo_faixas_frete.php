<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Faixas dinâmicas de frete estimado do ORC (BL-057).
 * R$/km e mínimo vazios = sob consulta. Último kg_ate nulo = “acima”.
 * Não entra no motor R1–R20.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orc_catalogo_faixas_frete', function (Blueprint $table) {
            $table->id();
            $table->decimal('kg_ate', 12, 3)->nullable();
            $table->decimal('preco_por_km', 19, 6)->nullable();
            $table->decimal('minimo_rs', 15, 2)->nullable();
            $table->boolean('ativo')->default(false);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
            $table->index(['ativo', 'ordem']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orc_catalogo_faixas_frete');
    }
};
