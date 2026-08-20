<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contas financeiras da EMP (tesouraria) — base do M06 (BX → caixa) e BankProvider.
 * Distinto de parceiro_contas_bancarias (dados para pagar o PAR).
 *
 * Saldo: só campos de implantação aqui. Saldo corrente = abertura + movimentos (módulo futuro).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empresa_contas_financeiras', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->string('codigo', 16); // CFIN-00001
            $table->string('tipo', 16); // BANCO|CAIXA|APLICACAO
            $table->string('descricao');
            $table->string('banco_codigo', 8)->nullable();
            $table->string('banco_nome')->nullable();
            $table->string('agencia', 16)->nullable();
            $table->string('conta', 32)->nullable();
            $table->string('tipo_conta', 16)->nullable(); // CORRENTE|POUPANCA|PAGAMENTO
            $table->string('pix_chave')->nullable();
            $table->boolean('principal')->default(false);
            $table->boolean('ativa')->default(true);
            $table->unsignedSmallInteger('ordem')->default(0);
            // Implantação (estratégia_implantacao_ja) — sem ledger nesta entrega
            $table->decimal('saldo_abertura', 15, 2)->nullable();
            $table->date('saldo_abertura_em')->nullable();
            $table->string('observacao')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('codigo');
            $table->index(['empresa_id', 'principal']);
            $table->index(['empresa_id', 'ativa']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empresa_contas_financeiras');
    }
};
