<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo canônico de grupos de produto (domínio trigger/32).
 * Fonte: CADASTRO_PRODUTOS_COMPRA + CADASTRO_PRODUTOS_VENDA + CONTROLE_ESTOQUE_PROFISSIONAL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produto_grupos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 16)->unique(); // MP-PAP, PA-ETQ, REV-RIB…
            $table->string('nome');
            $table->string('familia', 8); // MP|EMB|REV|PA|SVC|FAC
            $table->string('natureza', 16); // COMPRA|VENDA|AMBOS
            $table->string('tipo_item_sped', 2); // 00|01|02|04|09|07
            $table->string('grupo_estoque_padrao', 2)->nullable(); // GG máscara bobina
            $table->json('grupos_estoque')->nullable(); // [{codigo,nome}] quando há linhas
            $table->string('ncm_padrao', 8)->nullable();
            $table->string('unidade_comercial_padrao', 8)->nullable();
            $table->string('unidade_interna_padrao', 8)->nullable();
            $table->string('cfop_entrada_padrao', 8)->nullable();
            $table->string('cfop_saida_padrao', 8)->nullable();
            $table->boolean('exige_dimensao_sku')->default(false);
            $table->boolean('ncm_confirmado')->default(true);
            $table->unsignedSmallInteger('ordenacao')->default(100);
            $table->string('situacao', 16)->default('ATIVO');
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->index(['familia', 'situacao']);
            $table->index(['natureza', 'situacao']);
        });

        Schema::table('produtos', function (Blueprint $table) {
            $table->foreignId('grupo_id')
                ->nullable()
                ->after('familia')
                ->constrained('produto_grupos')
                ->nullOnDelete();
            $table->index(['empresa_id', 'grupo_id']);
        });
    }

    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('grupo_id');
        });
        Schema::dropIfExists('produto_grupos');
    }
};
