<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empresas', function (Blueprint $table) {
            $table->id();
            $table->char('cnpj', 14)->unique();
            $table->string('razao_social');
            $table->string('nome_fantasia')->nullable();
            $table->string('situacao_cadastral', 40);
            $table->json('dados_receita');
            $table->string('status', 32);
            $table->text('motivo')->nullable();
            $table->timestamp('criada_em')->useCurrent();
        });

        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->text('cpf_cifrado')->nullable();
            $table->string('cpf_hash', 64)->nullable()->unique();
            $table->string('email')->unique();
            $table->string('telefone', 20);
            $table->string('senha_hash');
            $table->timestamp('email_verificado_em')->nullable();
            $table->timestamp('criado_em')->useCurrent();
        });

        Schema::create('usuarios_trigger', function (Blueprint $table) {
            $table->id();
            $table->string('nome');
            $table->string('email')->unique();
            $table->string('senha_hash');
            $table->boolean('ativo')->default(true);
            $table->timestamp('criado_em')->useCurrent();
        });

        Schema::create('vinculos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('papel', 16);
            $table->string('status', 16);
            $table->timestamp('aceite_em')->nullable();
            $table->string('aceite_ip', 45)->nullable();
            $table->timestamp('criado_em')->useCurrent();
            $table->unique(['empresa_id', 'usuario_id']);
        });

        Schema::create('carteiras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->unique()->constrained('empresas')->restrictOnDelete();
            $table->bigInteger('creditado_centavos')->default(0);
            $table->bigInteger('reservado_centavos')->default(0);
            $table->bigInteger('consumido_centavos')->default(0);
            $table->bigInteger('disponivel_centavos')->default(0);
            $table->timestamp('atualizada_em')->useCurrent();
        });

        Schema::create('demandas', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 16)->unique();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('aberto_por')->constrained('usuarios')->restrictOnDelete();
            $table->string('titulo');
            $table->text('descricao');
            $table->text('objetivo');
            $table->string('sistema_atual');
            $table->string('tipo', 32);
            $table->string('prioridade', 16);
            $table->date('prazo_desejado')->nullable();
            $table->string('contato_tecnico');
            $table->text('observacoes')->nullable();
            $table->string('status', 32);
            $table->boolean('aguardando_cliente')->default(false);
            $table->text('motivo')->nullable();
            $table->timestamp('encerrada_em')->nullable();
            $table->timestamp('criada_em')->useCurrent();
            $table->index(['empresa_id', 'status']);
        });

        Schema::create('demanda_eventos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demanda_id')->constrained('demandas')->restrictOnDelete();
            $table->string('de_status', 32)->nullable();
            $table->string('para_status', 32);
            $table->string('ator_tipo', 16);
            $table->unsignedBigInteger('ator_id')->nullable();
            $table->text('motivo')->nullable();
            $table->timestamp('em')->useCurrent();
        });

        Schema::create('mensagens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demanda_id')->constrained('demandas')->restrictOnDelete();
            $table->string('autor_tipo', 16);
            $table->unsignedBigInteger('autor_id');
            $table->string('visibilidade', 16);
            $table->text('corpo');
            $table->timestamp('criada_em')->useCurrent();
            $table->index(['demanda_id', 'criada_em']);
        });

        Schema::create('demanda_anexos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demanda_id')->constrained('demandas')->restrictOnDelete();
            $table->foreignId('mensagem_id')->nullable()->constrained('mensagens')->restrictOnDelete();
            $table->string('nome_original');
            $table->string('caminho_interno');
            $table->unsignedInteger('tamanho');
            $table->string('mime', 120);
            $table->boolean('pacote')->default(false);
            $table->timestamp('criado_em')->useCurrent();
        });

        Schema::create('propostas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demanda_id')->constrained('demandas')->restrictOnDelete();
            $table->unsignedInteger('versao');
            $table->text('objetivo');
            $table->text('contexto');
            $table->text('descricao_funcional');
            $table->text('requisitos');
            $table->text('criterios_aceite');
            $table->text('premissas');
            $table->text('restricoes');
            $table->text('incluso');
            $table->text('nao_incluso');
            $table->unsignedInteger('prazo_dias_uteis');
            $table->unsignedInteger('horas_estimadas')->nullable();
            $table->unsignedBigInteger('valor_centavos');
            $table->text('observacao')->nullable();
            $table->timestamp('valida_ate');
            $table->string('status', 16);
            $table->timestamp('criada_em')->useCurrent();
            $table->unique(['demanda_id', 'versao']);
        });

        Schema::create('aprovacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proposta_id')->unique()->constrained('propostas')->restrictOnDelete();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->string('cpf_hash', 64);
            $table->unsignedBigInteger('valor_centavos');
            $table->json('escopo_snapshot');
            $table->string('ip', 45)->nullable();
            $table->string('provedor_assinatura')->nullable();
            $table->timestamp('em')->useCurrent();
        });

        Schema::create('marcos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demanda_id')->constrained('demandas')->restrictOnDelete();
            $table->text('texto');
            $table->boolean('visivel_ao_cliente')->default(true);
            $table->foreignId('criado_por')->constrained('usuarios_trigger')->restrictOnDelete();
            $table->timestamp('criado_em')->useCurrent();
        });

        Schema::create('apresentacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demanda_id')->unique()->constrained('demandas')->restrictOnDelete();
            $table->text('resumo');
            $table->timestamp('criada_em')->useCurrent();
        });

        Schema::create('faturas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('demanda_id')->unique()->constrained('demandas')->restrictOnDelete();
            $table->foreignId('proposta_id')->constrained('propostas')->restrictOnDelete();
            $table->unsignedBigInteger('valor_centavos');
            $table->unsignedBigInteger('abatido_reservado_centavos')->default(0);
            $table->unsignedBigInteger('abatido_disponivel_centavos')->default(0);
            $table->unsignedBigInteger('complemento_centavos')->default(0);
            $table->string('status', 16);
            $table->string('nfse_status', 16)->default('PLANEJADA');
            $table->timestamp('liquidada_em')->nullable();
            $table->timestamp('criada_em')->useCurrent();
        });

        Schema::create('nfse_documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fatura_id')->constrained('faturas')->restrictOnDelete();
            $table->string('status', 16)->default('PLANEJADA');
            $table->string('chave')->nullable();
            $table->string('numero')->nullable();
            $table->string('xml_caminho')->nullable();
            $table->text('erro')->nullable();
            $table->timestamp('atualizado_em')->useCurrent();
        });

        Schema::create('cobrancas_pix', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('finalidade', 32);
            $table->string('txid', 35)->unique();
            $table->unsignedBigInteger('valor_centavos');
            $table->string('status', 16);
            $table->timestamp('expira_em');
            $table->text('payload_copia_cola');
            $table->string('end_to_end_id', 40)->nullable()->unique();
            $table->foreignId('fatura_id')->nullable()->constrained('faturas')->restrictOnDelete();
            $table->timestamp('criada_em')->useCurrent();
            $table->index(['empresa_id', 'status']);
        });

        Schema::create('movimentos_saldo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('tipo', 32);
            $table->string('origem', 16);
            $table->unsignedBigInteger('valor_centavos');
            $table->bigInteger('saldo_disponivel_antes');
            $table->bigInteger('saldo_disponivel_depois');
            $table->foreignId('cobranca_id')->nullable()->constrained('cobrancas_pix')->restrictOnDelete();
            $table->foreignId('demanda_id')->nullable()->constrained('demandas')->restrictOnDelete();
            $table->foreignId('fatura_id')->nullable()->constrained('faturas')->restrictOnDelete();
            $table->string('ator_tipo', 16);
            $table->unsignedBigInteger('ator_id')->nullable();
            $table->text('observacao')->nullable();
            $table->string('chave_idempotencia')->unique();
            $table->timestamp('criado_em')->useCurrent();
            $table->index(['empresa_id', 'criado_em']);
        });

        Schema::create('notificacoes', function (Blueprint $table) {
            $table->id();
            $table->string('destinatario_tipo', 16);
            $table->unsignedBigInteger('destinatario_id');
            $table->foreignId('empresa_id')->nullable()->constrained('empresas')->restrictOnDelete();
            $table->string('tipo', 64);
            $table->string('titulo');
            $table->text('corpo');
            $table->timestamp('lida_em')->nullable();
            $table->timestamp('email_enviado_em')->nullable();
            $table->timestamp('criada_em')->useCurrent();
            $table->index(['destinatario_tipo', 'destinatario_id', 'lida_em']);
        });

        Schema::create('webhook_inbox', function (Blueprint $table) {
            $table->id();
            $table->string('provedor', 32);
            $table->string('entrega_id')->unique();
            $table->json('payload');
            $table->timestamp('recebido_em')->useCurrent();
            $table->timestamp('processado_em')->nullable();
            $table->text('erro')->nullable();
        });

        Schema::create('auditoria', function (Blueprint $table) {
            $table->id();
            $table->string('ator_tipo', 16);
            $table->unsignedBigInteger('ator_id')->nullable();
            $table->foreignId('empresa_id')->nullable()->constrained('empresas')->restrictOnDelete();
            $table->string('acao', 64);
            $table->string('entidade', 64);
            $table->unsignedBigInteger('entidade_id')->nullable();
            $table->json('antes')->nullable();
            $table->json('depois')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('em')->useCurrent();
            $table->index(['empresa_id', 'em']);
            $table->index(['entidade', 'entidade_id']);
        });

        Schema::create('parametros', function (Blueprint $table) {
            $table->string('chave')->primary();
            $table->string('valor');
            $table->timestamp('atualizado_em')->useCurrent();
        });

        Schema::create('papel_permissoes', function (Blueprint $table) {
            $table->id();
            $table->string('papel', 16);
            $table->string('permissao', 64);
            $table->unique(['papel', 'permissao']);
        });

        DB::statement('DROP SEQUENCE IF EXISTS demandas_codigo_seq');
        DB::statement('CREATE SEQUENCE demandas_codigo_seq START 1');

        DB::statement("CREATE UNIQUE INDEX vinculos_um_titular_ativo ON vinculos (empresa_id) WHERE papel = 'TITULAR' AND status = 'ATIVO'");
        DB::statement("CREATE UNIQUE INDEX demandas_uma_nao_terminal ON demandas (empresa_id) WHERE status NOT IN ('CONCLUIDA', 'RECUSADA_CLIENTE', 'RECUSADA_TRIGGER', 'EXPIRADA', 'CANCELADA')");
        DB::statement("CREATE UNIQUE INDEX propostas_uma_vigente ON propostas (demanda_id) WHERE status = 'VIGENTE'");
        DB::statement("CREATE UNIQUE INDEX cobrancas_uma_ativa ON cobrancas_pix (empresa_id, finalidade, COALESCE(fatura_id, 0)) WHERE status = 'ATIVA'");

        DB::statement('ALTER TABLE movimentos_saldo ADD CONSTRAINT movimentos_valor_positivo CHECK (valor_centavos > 0 AND saldo_disponivel_antes >= 0 AND saldo_disponivel_depois >= 0)');
        DB::statement('ALTER TABLE carteiras ADD CONSTRAINT carteiras_saldos_nao_negativos CHECK (creditado_centavos >= 0 AND reservado_centavos >= 0 AND consumido_centavos >= 0 AND disponivel_centavos >= 0)');

        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION impedir_mutacao_financeira() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'movimentos_saldo' THEN
    RAISE EXCEPTION 'movimento de saldo é imutável';
  ELSIF TG_TABLE_NAME = 'aprovacoes' THEN
    RAISE EXCEPTION 'aprovação é imutável';
  ELSIF TG_TABLE_NAME = 'auditoria' THEN
    RAISE EXCEPTION 'auditoria é imutável';
  ELSIF TG_TABLE_NAME = 'cobrancas_pix' AND OLD.status = 'PAGA' THEN
    RAISE EXCEPTION 'cobrança paga é imutável';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movimentos_imutavel BEFORE UPDATE OR DELETE ON movimentos_saldo
FOR EACH ROW EXECUTE FUNCTION impedir_mutacao_financeira();
CREATE TRIGGER aprovacoes_imutavel BEFORE UPDATE OR DELETE ON aprovacoes
FOR EACH ROW EXECUTE FUNCTION impedir_mutacao_financeira();
CREATE TRIGGER auditoria_imutavel BEFORE UPDATE OR DELETE ON auditoria
FOR EACH ROW EXECUTE FUNCTION impedir_mutacao_financeira();
CREATE TRIGGER cobrancas_pagas_imutavel BEFORE UPDATE OR DELETE ON cobrancas_pix
FOR EACH ROW EXECUTE FUNCTION impedir_mutacao_financeira();
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
DROP TRIGGER IF EXISTS cobrancas_pagas_imutavel ON cobrancas_pix;
DROP TRIGGER IF EXISTS auditoria_imutavel ON auditoria;
DROP TRIGGER IF EXISTS aprovacoes_imutavel ON aprovacoes;
DROP TRIGGER IF EXISTS movimentos_imutavel ON movimentos_saldo;
DROP FUNCTION IF EXISTS impedir_mutacao_financeira();
SQL);
        Schema::dropIfExists('papel_permissoes');
        Schema::dropIfExists('parametros');
        Schema::dropIfExists('auditoria');
        Schema::dropIfExists('webhook_inbox');
        Schema::dropIfExists('notificacoes');
        Schema::dropIfExists('movimentos_saldo');
        Schema::dropIfExists('cobrancas_pix');
        Schema::dropIfExists('nfse_documentos');
        Schema::dropIfExists('faturas');
        Schema::dropIfExists('apresentacoes');
        Schema::dropIfExists('marcos');
        Schema::dropIfExists('aprovacoes');
        Schema::dropIfExists('propostas');
        Schema::dropIfExists('demanda_anexos');
        Schema::dropIfExists('mensagens');
        Schema::dropIfExists('demanda_eventos');
        Schema::dropIfExists('demandas');
        Schema::dropIfExists('carteiras');
        Schema::dropIfExists('vinculos');
        Schema::dropIfExists('usuarios_trigger');
        Schema::dropIfExists('usuarios');
        Schema::dropIfExists('empresas');
        DB::statement('DROP SEQUENCE IF EXISTS demandas_codigo_seq');
    }
};
