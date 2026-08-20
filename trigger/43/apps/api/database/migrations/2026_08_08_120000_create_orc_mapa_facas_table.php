<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mapa oficial de facas (estudo 32 §3.3 / GERACAO_ORCAMENTO).
 * Fonte operacional do FacaPicker e dos relatórios — não confundir com produto FAC-.
 * Soft-inativação: nunca apagar histórico.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orc_mapa_facas', function (Blueprint $table) {
            $table->id();
            $table->string('medida', 64);
            $table->string('tamanho_raw', 64)->nullable();
            $table->string('tamanho_tipo', 32)->nullable();
            $table->decimal('diametro_cm', 12, 4)->nullable();
            $table->string('formato', 64);
            $table->string('faca', 64)->nullable();
            $table->decimal('puxada', 16, 6)->nullable();
            $table->decimal('z', 16, 4)->nullable();
            $table->decimal('repeticao', 16, 10)->nullable();
            $table->string('maquina_catalogo', 64)->nullable();
            $table->string('maquina_origem', 64)->nullable();
            $table->decimal('largura_faca', 12, 4)->nullable();
            $table->unsignedInteger('n_facas')->nullable();
            $table->string('cilindro', 32)->nullable();
            $table->string('colunas_mapa', 64)->nullable();
            $table->string('conjugada', 160)->nullable();
            $table->string('fornecedor', 120)->nullable();
            $table->string('cliente_nota', 255)->nullable();
            $table->boolean('completa')->default(true);
            $table->string('label', 255)->nullable();
            $table->boolean('ativo')->default(true)->index();
            $table->timestamps();

            $table->index(['formato', 'maquina_catalogo']);
            $table->index('medida');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orc_mapa_facas');
    }
};
