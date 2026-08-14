<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-048 — espelho fiscal de entrada (XML + snapshot). Não é escrituração.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nfe_entradas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('movimento_id')->nullable()->unique()->constrained('estoque_movimentos')->nullOnDelete();
            $table->foreignId('ordem_compra_id')->nullable()->constrained('ordens_compra')->nullOnDelete();
            $table->foreignId('fornecedor_id')->nullable()->constrained('parceiros')->nullOnDelete();
            $table->string('chave', 44);
            $table->string('modelo', 2)->nullable();
            $table->string('serie', 8)->nullable();
            $table->string('numero', 20)->nullable();
            $table->date('data_emissao')->nullable();
            $table->string('nat_op', 80)->nullable();
            $table->string('id_dest', 1)->nullable();
            $table->string('fin_nfe', 1)->nullable();
            $table->string('emit_cnpj', 14)->nullable();
            $table->string('emit_ie', 20)->nullable();
            $table->string('emit_uf', 2)->nullable();
            $table->string('emit_crt', 1)->nullable();
            $table->string('emit_nome', 120)->nullable();
            $table->string('dest_cnpj', 14)->nullable();
            $table->string('dest_ie', 20)->nullable();
            $table->string('dest_uf', 2)->nullable();
            $table->json('totais')->nullable();
            $table->string('xml_path', 240);
            $table->string('xml_sha256', 64);
            $table->string('protocolo', 20)->nullable();
            $table->string('c_stat', 8)->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['empresa_id', 'chave']);
            $table->index(['empresa_id', 'data_emissao']);
        });

        Schema::create('nfe_entrada_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nfe_entrada_id')->constrained('nfe_entradas')->cascadeOnDelete();
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->nullOnDelete();
            $table->unsignedSmallInteger('n_item');
            $table->string('c_prod', 60);
            $table->string('x_prod', 240)->nullable();
            $table->string('ncm', 8)->nullable();
            $table->string('cest', 7)->nullable();
            $table->string('cfop', 4)->nullable();
            $table->string('u_com', 8)->nullable();
            $table->string('q_com', 24)->nullable();
            $table->string('v_un_com', 24)->nullable();
            $table->string('v_prod', 24)->nullable();
            $table->string('u_trib', 8)->nullable();
            $table->string('q_trib', 24)->nullable();
            $table->string('orig', 1)->nullable();
            $table->string('cst_icms', 3)->nullable();
            $table->string('csosn', 4)->nullable();
            $table->string('v_bc', 24)->nullable();
            $table->string('p_icms', 12)->nullable();
            $table->string('v_icms', 24)->nullable();
            $table->string('v_bc_st', 24)->nullable();
            $table->string('v_icms_st', 24)->nullable();
            $table->string('cst_ipi', 3)->nullable();
            $table->string('p_ipi', 12)->nullable();
            $table->string('v_ipi', 24)->nullable();
            $table->string('cst_pis', 3)->nullable();
            $table->string('p_pis', 12)->nullable();
            $table->string('v_pis', 24)->nullable();
            $table->string('cst_cofins', 3)->nullable();
            $table->string('p_cofins', 12)->nullable();
            $table->string('v_cofins', 24)->nullable();
            $table->string('v_frete', 24)->nullable();
            $table->string('v_desc', 24)->nullable();
            $table->string('v_outro', 24)->nullable();
            $table->json('impostos')->nullable();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->timestamps();

            $table->index('nfe_entrada_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nfe_entrada_itens');
        Schema::dropIfExists('nfe_entradas');
    }
};
