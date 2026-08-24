<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mensalidade FLEXORC via Banco Inter (BolePix) — credenciais da instalação.
 * ADR: docs/ADR_INTER_BILLING_MENSALIDADE.md
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_integracao_inter', function (Blueprint $table) {
            $table->id();
            $table->string('operador', 32)->nullable(); // conta corrente (x-conta-corrente)
            $table->text('client_id_cipher')->nullable();
            $table->text('client_secret_cipher')->nullable();
            $table->longText('cert_pem_cipher')->nullable();
            $table->longText('key_pem_cipher')->nullable();
            $table->string('ambiente', 16)->default('SANDBOX'); // SANDBOX|PROD
            $table->text('webhook_secret_cipher')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        Schema::table('conta_ativacoes', function (Blueprint $table) {
            $table->text('billing_pix_copia_cola')->nullable()->after('billing_checkout_url');
            $table->longText('billing_pix_qr_base64')->nullable()->after('billing_pix_copia_cola');
            $table->date('billing_charge_vencimento')->nullable()->after('billing_pix_qr_base64');
        });
    }

    public function down(): void
    {
        Schema::table('conta_ativacoes', function (Blueprint $table) {
            $table->dropColumn([
                'billing_pix_copia_cola',
                'billing_pix_qr_base64',
                'billing_charge_vencimento',
            ]);
        });

        Schema::dropIfExists('billing_integracao_inter');
    }
};
