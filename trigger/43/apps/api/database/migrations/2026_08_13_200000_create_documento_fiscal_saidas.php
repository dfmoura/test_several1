<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-051 — documentos fiscais de saída (NF-e / NFS-e) amarrados ao FAT.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->boolean('im_obrigatoria_nfse')->default(false)->after('im');
        });

        Schema::table('fiscal_hubs', function (Blueprint $table) {
            $table->boolean('emissao_habilitada')->default(false)->after('ativo');
            $table->timestamp('emissao_habilitada_em')->nullable()->after('emissao_habilitada');
        });

        Schema::table('faturamento_itens', function (Blueprint $table) {
            $table->string('familia_fiscal', 24)->nullable()->after('descricao');
        });

        Schema::create('documento_fiscal_saidas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 32);
            $table->foreignId('faturamento_id')->constrained('faturamentos')->restrictOnDelete();
            $table->foreignId('pedido_id')->constrained('pedidos')->restrictOnDelete();
            $table->foreignId('parceiro_id')->constrained('parceiros')->restrictOnDelete();
            $table->foreignId('fiscal_hub_id')->nullable()->constrained('fiscal_hubs')->nullOnDelete();
            $table->string('tipo', 8); // NFE | NFSE
            $table->string('modelo', 8)->default('55'); // 55 | NFSEN
            $table->string('status', 24)->default('PLANEJADO');
            $table->string('ambiente', 16)->nullable();
            $table->string('ref', 80);
            $table->unsignedInteger('serie')->nullable();
            $table->unsignedInteger('numero')->nullable();
            $table->string('chave', 60)->nullable();
            $table->string('protocolo', 60)->nullable();
            $table->string('mensagem', 500)->nullable();
            $table->decimal('valor', 15, 2)->default(0);
            $table->json('payload_json')->nullable();
            $table->json('response_json')->nullable();
            $table->timestamp('enviado_em')->nullable();
            $table->timestamp('autorizado_em')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['empresa_id', 'codigo']);
            $table->unique(['empresa_id', 'ref']);
            $table->unique(['faturamento_id', 'tipo']);
            $table->index(['empresa_id', 'pedido_id']);
            $table->index(['empresa_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documento_fiscal_saidas');

        Schema::table('faturamento_itens', function (Blueprint $table) {
            $table->dropColumn('familia_fiscal');
        });

        Schema::table('fiscal_hubs', function (Blueprint $table) {
            $table->dropColumn(['emissao_habilitada', 'emissao_habilitada_em']);
        });

        Schema::table('empresas', function (Blueprint $table) {
            $table->dropColumn('im_obrigatoria_nfse');
        });
    }
};
