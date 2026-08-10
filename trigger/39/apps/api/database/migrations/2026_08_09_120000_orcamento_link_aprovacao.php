<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Link de aprovação do cliente (estudo 32 APROVACAO_ORCAMENTO_CLIENTE + ADR_ORC_LINK_APROVACAO).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->timestamp('enviado_em')->nullable()->after('observacao');
            $table->timestamp('visualizado_em')->nullable()->after('enviado_em');
            $table->timestamp('decidido_em')->nullable()->after('visualizado_em');
            $table->string('canal_aprovacao', 32)->nullable()->after('decidido_em');
            $table->string('aceite_nome_cliente', 160)->nullable()->after('canal_aprovacao');
            $table->unsignedSmallInteger('aceite_faixa_index')->nullable()->after('aceite_nome_cliente');
            $table->string('aceite_ip', 45)->nullable()->after('aceite_faixa_index');
            $table->string('aceite_user_agent', 512)->nullable()->after('aceite_ip');
            $table->text('motivo_decisao')->nullable()->after('aceite_user_agent');
        });

        Schema::create('orcamento_links_aprovacao', function (Blueprint $table) {
            $table->id();
            $table->foreignId('orcamento_id')->unique()->constrained('orcamentos')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->boolean('ativo')->default(true);
            $table->timestamp('expira_em');
            $table->timestamp('enviado_em')->nullable();
            $table->string('canal_envio', 32)->nullable();
            $table->string('destino_envio', 255)->nullable();
            $table->unsignedInteger('visualizacoes')->default(0);
            $table->timestamp('usado_em')->nullable();
            $table->timestamps();

            $table->index(['ativo', 'expira_em']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orcamento_links_aprovacao');

        Schema::table('orcamentos', function (Blueprint $table) {
            $table->dropColumn([
                'enviado_em',
                'visualizado_em',
                'decidido_em',
                'canal_aprovacao',
                'aceite_nome_cliente',
                'aceite_faixa_index',
                'aceite_ip',
                'aceite_user_agent',
                'motivo_decisao',
            ]);
        });
    }
};
