<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * NFS-e Nacional — numeração DPS, caixa ADN e vínculo do título a pagar.
 * Norma: docs/ADR_NFSE_NACIONAL_E_CAIXA.md
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nfse_dps_controles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->unsignedSmallInteger('serie')->default(1);
            $table->unsignedInteger('ultimo_numero')->default(0);
            $table->timestamps();
            $table->unique(['empresa_id', 'serie']);
        });

        Schema::create('nfse_sync_estados', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->unique()->constrained('empresas')->restrictOnDelete();
            $table->string('ultimo_nsu', 20)->default('0');
            $table->string('max_nsu', 20)->nullable();
            $table->string('sync_status', 16)->default('IDLE');
            $table->string('sync_mensagem', 500)->nullable();
            $table->timestamp('ultima_sync_em')->nullable();
            $table->timestamps();
        });

        Schema::create('nfse_tomadas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('nsu', 20);
            $table->string('tipo_documento', 16)->default('NFSE');
            $table->string('chave', 50)->nullable();
            $table->string('numero', 20)->nullable();
            $table->date('data_emissao')->nullable();
            $table->string('emit_cnpj', 14)->nullable();
            $table->string('emit_nome', 160)->nullable();
            $table->decimal('valor_total', 15, 2)->nullable();
            $table->string('situacao', 20)->default('NA_CAIXA');
            $table->foreignId('parceiro_id')->nullable()->constrained('parceiros')->nullOnDelete();
            $table->longText('xml')->nullable();
            $table->timestamp('vinculado_em')->nullable();
            $table->timestamps();

            $table->unique(['empresa_id', 'nsu']);
            $table->unique(['empresa_id', 'chave']);
            $table->index(['empresa_id', 'situacao']);
            $table->index(['empresa_id', 'data_emissao']);
        });

        Schema::table('titulos', function (Blueprint $table) {
            $table->foreignId('nfse_tomada_id')
                ->nullable()
                ->after('faturamento_id')
                ->constrained('nfse_tomadas')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('titulos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('nfse_tomada_id');
        });
        Schema::dropIfExists('nfse_tomadas');
        Schema::dropIfExists('nfse_sync_estados');
        Schema::dropIfExists('nfse_dps_controles');
    }
};
