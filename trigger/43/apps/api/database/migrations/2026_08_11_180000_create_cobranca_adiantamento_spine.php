<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Spine M06 contas a receber + COB + BankProvider + adiantamento no ORC.
 * ADR: docs/ADR_ORC_ADIANTAMENTO_PIX.md · estudo 32 INTEGRACAO_BANCARIA / UC-COM-009.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('titulos', function (Blueprint $table) {
            $table->foreignId('orcamento_id')
                ->nullable()
                ->after('movimento_id')
                ->constrained('orcamentos')
                ->nullOnDelete();
            $table->string('origem', 32)->nullable()->after('orcamento_id'); // ADIANTAMENTO|FATURA|COMPRA
            $table->index(['empresa_id', 'orcamento_id']);
        });

        Schema::table('orcamentos', function (Blueprint $table) {
            $table->string('financeiro_status', 32)->nullable()->after('motivo_decisao');
            // LIBERADO | AGUARDA_ADIANTAMENTO
            $table->foreignId('adiantamento_titulo_id')
                ->nullable()
                ->after('financeiro_status')
                ->constrained('titulos')
                ->nullOnDelete();
        });

        Schema::create('empresa_bank_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('provider', 32); // mock|inter|sicoob
            $table->string('ambiente', 16)->default('SANDBOX'); // SANDBOX|PROD
            $table->foreignId('conta_financeira_id')
                ->nullable()
                ->constrained('empresa_contas_financeiras')
                ->nullOnDelete();
            $table->text('client_id_cipher')->nullable();
            $table->text('client_secret_cipher')->nullable();
            $table->string('cert_path')->nullable();
            $table->string('key_path')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->unique(['empresa_id', 'provider', 'ambiente'], 'emp_bank_cred_unique');
        });

        Schema::create('cobrancas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 24);
            $table->foreignId('titulo_id')->constrained('titulos')->restrictOnDelete();
            $table->foreignId('empresa_conta_financeira_id')
                ->nullable()
                ->constrained('empresa_contas_financeiras')
                ->nullOnDelete();
            $table->string('provider', 32);
            $table->string('provider_ref', 120)->nullable();
            $table->string('txid', 64)->nullable();
            $table->string('idempotency_key', 80);
            $table->text('pix_copia_cola')->nullable();
            $table->longText('pix_qr_base64')->nullable();
            $table->string('linha_digitavel', 80)->nullable();
            $table->string('pdf_url')->nullable();
            $table->date('vencimento')->nullable();
            $table->string('status', 24)->default('EMITIDA');
            // EMITIDA|REGISTRADA|PAGA|CANCELADA|VENCIDA|FALHA|ESTORNADA
            $table->json('provider_payload')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->unique(['empresa_id', 'idempotency_key']);
            $table->index(['empresa_id', 'provider_ref']);
            $table->index(['empresa_id', 'txid']);
            $table->index('titulo_id');
        });

        Schema::create('webhook_inbox', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->nullable()->constrained('empresas')->nullOnDelete();
            $table->string('provider', 32);
            $table->string('event_id', 120)->nullable();
            $table->string('payload_hash', 64);
            $table->json('payload');
            $table->string('resultado', 32)->nullable(); // PROCESSADO|IGNORADO|ERRO|DUPLICADO
            $table->text('mensagem')->nullable();
            $table->foreignId('cobranca_id')->nullable()->constrained('cobrancas')->nullOnDelete();
            $table->foreignId('titulo_baixa_id')->nullable()->constrained('titulo_baixas')->nullOnDelete();
            $table->timestamp('processado_em')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'payload_hash']);
            $table->index(['provider', 'event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_inbox');
        Schema::dropIfExists('cobrancas');
        Schema::dropIfExists('empresa_bank_credentials');

        Schema::table('orcamentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('adiantamento_titulo_id');
            $table->dropColumn('financeiro_status');
        });

        Schema::table('titulos', function (Blueprint $table) {
            $table->dropIndex(['empresa_id', 'orcamento_id']);
            $table->dropConstrainedForeignId('orcamento_id');
            $table->dropColumn('origem');
        });
    }
};
