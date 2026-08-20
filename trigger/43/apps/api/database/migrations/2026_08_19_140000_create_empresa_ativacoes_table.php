<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ativação self-service da EMP (conta FLEXORC + conferência operacional).
 * ADR: docs/ADR_ATIVACAO_EMPRESA.md
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empresa_ativacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->unique()->constrained('empresas')->restrictOnDelete();
            $table->string('billing_status', 24)->default('PENDENTE');
            $table->string('billing_provider', 32)->default('mock');
            $table->string('billing_customer_ref', 80)->nullable();
            $table->string('billing_subscription_ref', 80)->nullable();
            $table->string('billing_checkout_ref', 80)->nullable();
            $table->text('billing_checkout_url')->nullable();
            $table->timestamp('billing_metodo_em')->nullable();
            $table->timestamp('catalogo_conferido_em')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empresa_ativacoes');
    }
};
