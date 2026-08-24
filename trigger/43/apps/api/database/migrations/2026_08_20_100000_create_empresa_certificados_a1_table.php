<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cofre A1 (PKCS#12) por EMP — cifrado em repouso (APP_KEY).
 * Metadados públicos na API; PFX/senha nunca saem em plaintext.
 * Emissão NF continua via Focus; este cofre guarda o A1 da EMP de forma segura.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('empresa_certificados_a1', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->longText('pfx_cipher');
            $table->text('senha_cipher');
            $table->string('arquivo_nome', 255)->nullable();
            $table->unsignedInteger('tamanho_bytes')->nullable();
            $table->string('subject_cn', 255)->nullable();
            $table->string('issuer_cn', 255)->nullable();
            $table->string('serial', 128)->nullable();
            $table->string('fingerprint_sha256', 64)->nullable();
            $table->string('cnpj_certificado', 14)->nullable();
            $table->timestamp('valido_de')->nullable();
            $table->timestamp('valido_ate')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('uploaded_at')->nullable();
            $table->timestamps();

            $table->unique('empresa_id');
            $table->index(['empresa_id', 'valido_ate']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('empresa_certificados_a1');
    }
};
