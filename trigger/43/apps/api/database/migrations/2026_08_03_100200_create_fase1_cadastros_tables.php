<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 1.a–1.d — Plataforma + Cadastros (M01/M11)
 * Domínio: DOMINIO_SISTEMA_ERP_RLP + CODIFICACAO + CADASTRO_*
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empresas', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 16)->unique(); // EMP-00001
            $table->string('cnpj', 14)->unique();
            $table->string('razao_social');
            $table->string('nome_fantasia')->nullable();
            $table->string('ie', 32)->nullable();
            $table->string('im', 32)->nullable();
            $table->string('regime', 32)->default('SIMPLES_NACIONAL');
            $table->string('cnae', 16)->nullable();
            $table->string('email')->nullable();
            $table->string('telefone', 32)->nullable();
            $table->string('logradouro')->nullable();
            $table->string('numero', 32)->nullable();
            $table->string('complemento')->nullable();
            $table->string('bairro')->nullable();
            $table->string('municipio')->nullable();
            $table->string('uf', 2)->nullable();
            $table->string('cep', 8)->nullable();
            $table->string('ibge', 7)->nullable();
            $table->boolean('venda_ativa')->default(true);
            $table->boolean('estoque_ativo')->default(true);
            $table->string('logo_path')->nullable();
            $table->string('situacao', 16)->default('ATIVA');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('parametros_empresa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas');
            $table->string('chave', 80);
            $table->text('valor')->nullable();
            $table->string('status', 32)->default('PENDENTE_RATIFICACAO');
            $table->unsignedInteger('versao')->default(1);
            $table->foreignId('alterado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['empresa_id', 'chave']);
        });

        Schema::create('parceiros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas');
            $table->string('codigo', 16); // PAR-00001
            $table->string('tipo_pessoa', 16)->default('PJ'); // PJ|PF|ESTRANGEIRO
            $table->string('cnpj_cpf', 14)->nullable();
            $table->string('razao_social');
            $table->string('nome_fantasia')->nullable();
            $table->string('ie', 32)->nullable();
            $table->string('im', 32)->nullable();
            $table->unsignedTinyInteger('ind_ie_dest')->nullable(); // 1|2|9
            $table->boolean('consumidor_final')->default(false);
            $table->string('regime', 32)->nullable();
            $table->string('situacao', 16)->default('ATIVO');
            $table->string('motivo_bloqueio')->nullable();
            $table->timestamp('bloqueado_em')->nullable();
            $table->boolean('cadastro_fiscal_completo')->default(false);
            $table->boolean('is_prospect')->default(false);
            // papéis (flags)
            $table->boolean('papel_cliente')->default(false);
            $table->boolean('papel_fornecedor')->default(false);
            $table->boolean('papel_colaborador')->default(false);
            $table->boolean('papel_transportadora')->default(false);
            $table->boolean('papel_banco')->default(false);
            $table->boolean('papel_entidade')->default(false);
            $table->boolean('papel_vendedor')->default(false);
            $table->boolean('papel_contador')->default(false);
            // endereço fiscal
            $table->string('logradouro')->nullable();
            $table->string('numero', 32)->nullable();
            $table->string('complemento')->nullable();
            $table->string('bairro')->nullable();
            $table->string('municipio')->nullable();
            $table->string('uf', 2)->nullable();
            $table->string('cep', 8)->nullable();
            $table->string('ibge', 7)->nullable();
            // contatos
            $table->string('telefone', 32)->nullable();
            $table->string('whatsapp', 32)->nullable();
            $table->string('email')->nullable();
            $table->string('email_xml')->nullable();
            $table->string('contato_nome')->nullable();
            $table->string('contato_funcao')->nullable();
            // financeiro cliente
            $table->decimal('limite_credito', 15, 2)->default(0);
            $table->decimal('credito_utilizado', 15, 2)->default(0);
            $table->string('condicao_pagamento', 64)->nullable();
            $table->string('forma_pagamento', 32)->nullable();
            $table->unsignedBigInteger('vendedor_parceiro_id')->nullable();
            $table->decimal('comissao_percentual', 7, 4)->nullable(); // alíquota §2
            // fornecedor
            $table->string('tipo_fornecimento', 32)->nullable();
            $table->string('cfop_entrada_padrao', 8)->nullable();
            // colaborador
            $table->string('vinculo', 32)->nullable(); // CLT|SOCIO|ESTAGIARIO|AUTONOMO|PJ
            $table->string('cargo')->nullable();
            $table->string('departamento', 64)->nullable();
            $table->date('admissao_em')->nullable();
            $table->date('desligamento_em')->nullable();
            // bancário (SoD: só FINANCEIRO)
            $table->string('banco_codigo', 8)->nullable();
            $table->string('banco_nome')->nullable();
            $table->string('agencia', 16)->nullable();
            $table->string('conta', 32)->nullable();
            $table->string('pix_chave')->nullable();
            $table->json('consulta_snapshot')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->unique(['empresa_id', 'cnpj_cpf']);
            $table->index(['empresa_id', 'razao_social']);
            $table->index(['empresa_id', 'papel_cliente']);
            $table->index(['empresa_id', 'papel_colaborador']);
        });

        Schema::table('parceiros', function (Blueprint $table) {
            $table->foreign('vendedor_parceiro_id')->references('id')->on('parceiros')->nullOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('codigo', 16)->nullable()->unique()->after('id'); // USR-00001
            $table->boolean('ativo')->default(true)->after('password');
            $table->foreignId('empresa_default_id')->nullable()->after('ativo')->constrained('empresas')->nullOnDelete();
            $table->foreignId('parceiro_id')->nullable()->after('empresa_default_id')->constrained('parceiros')->nullOnDelete();
            $table->timestamp('ultimo_login_em')->nullable()->after('parceiro_id');
            $table->date('vigencia_ate')->nullable()->after('ultimo_login_em');
            $table->softDeletes();
        });

        Schema::create('empresa_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('padrao')->default(false);
            $table->timestamps();
            $table->unique(['empresa_id', 'user_id']);
        });

        Schema::create('produtos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas');
            $table->string('codigo', 32); // MP-… / PA-ETQ-… / SVC-…
            $table->string('familia', 8); // MP|EMB|REV|PA|SVC|FAC
            $table->string('descricao_fiscal');
            $table->string('descricao_comercial')->nullable();
            $table->string('grupo', 64)->nullable();
            $table->string('ncm', 8)->nullable();
            $table->string('cest', 16)->nullable();
            $table->unsignedTinyInteger('origem')->default(0);
            $table->string('tipo_item_sped', 2)->nullable(); // 00,04,09…
            $table->string('unidade_comercial', 8)->default('UN');
            $table->string('unidade_interna', 8)->nullable();
            // Escalas oficiais — PADRAO_DECIMAL_CALCULOS §2
            $table->decimal('fator_conversao', 19, 10)->default(1);
            $table->string('cfop_saida_padrao', 8)->nullable();
            $table->string('cfop_entrada_padrao', 8)->nullable();
            $table->string('csosn', 8)->nullable();
            $table->string('cst_icms', 8)->nullable();
            $table->string('cst_pis', 8)->nullable();
            $table->string('cst_cofins', 8)->nullable();
            $table->decimal('preco_tabela', 19, 6)->nullable();
            $table->decimal('custo_medio', 19, 6)->default(0);
            $table->decimal('estoque_minimo', 15, 4)->nullable();
            $table->unsignedSmallInteger('lead_time_dias')->nullable();
            $table->string('gtin', 32)->nullable();
            $table->string('situacao', 16)->default('ATIVO');
            $table->json('atributos')->nullable(); // máscara bobina etc.
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'familia']);
            $table->index(['empresa_id', 'ncm']);
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->nullable()->constrained('empresas')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('acao', 64);
            $table->string('entidade', 64)->nullable();
            $table->unsignedBigInteger('entidade_id')->nullable();
            $table->json('de')->nullable();
            $table->json('para')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
            $table->index(['entidade', 'entidade_id']);
        });

        Schema::create('api_cache', function (Blueprint $table) {
            $table->id();
            $table->string('chave', 190)->unique();
            $table->string('fonte', 64);
            $table->json('payload');
            $table->timestamp('expires_at');
            $table->timestamps();
            $table->index('expires_at');
        });

        Schema::create('codigo_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->nullable()->constrained('empresas')->nullOnDelete();
            $table->string('prefixo', 16);
            $table->unsignedBigInteger('proximo')->default(1);
            $table->timestamps();
            $table->unique(['empresa_id', 'prefixo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('codigo_sequences');
        Schema::dropIfExists('api_cache');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('produtos');
        Schema::dropIfExists('empresa_user');
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parceiro_id');
            $table->dropConstrainedForeignId('empresa_default_id');
            $table->dropColumn(['codigo', 'ativo', 'ultimo_login_em', 'vigencia_ate', 'deleted_at']);
        });
        Schema::dropIfExists('parceiros');
        Schema::dropIfExists('parametros_empresa');
        Schema::dropIfExists('empresas');
    }
};
