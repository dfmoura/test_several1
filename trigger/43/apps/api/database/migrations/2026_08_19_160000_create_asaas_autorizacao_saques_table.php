<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Trilha de decisão da validação de saque ASAAS (conta da instalação, não EMP).
 * Não entra em erp:limpar-operacional — é evidência de segurança.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asaas_autorizacao_saques', function (Blueprint $table) {
            $table->id();
            $table->string('tipo', 40);
            $table->string('provedor_ref', 80)->nullable();
            $table->decimal('valor', 14, 2)->nullable();
            $table->string('decisao', 16);
            $table->string('motivo', 255)->nullable();
            $table->json('payload');
            $table->timestamps();

            $table->index(['tipo', 'provedor_ref']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asaas_autorizacao_saques');
    }
};
