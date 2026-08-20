<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-037 — de-para cProd fornecedor → SKU (assistência XML na entrada).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produto_fornecedor_codigos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('fornecedor_id')->constrained('parceiros')->restrictOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->string('c_prod', 60);
            $table->string('x_prod', 240)->nullable();
            $table->timestamps();

            $table->unique(['empresa_id', 'fornecedor_id', 'c_prod'], 'pfc_emp_forn_cprod_uq');
            $table->index(['empresa_id', 'produto_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produto_fornecedor_codigos');
    }
};
