<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Patrimônio gerencial (estudo 32 / PATRIMONIO_CONTROLE).
 * Máquinas físicas = BEM; orc_catalogo_maquinas permanece só tarifas ORC.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bens_patrimoniais', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 16);
            $table->string('descricao', 200);
            $table->string('categoria', 32);
            $table->string('marca', 80)->nullable();
            $table->string('modelo', 120)->nullable();
            $table->string('numero_serie', 80)->nullable();
            $table->date('adquirido_em')->nullable();
            $table->decimal('valor_aquisicao', 14, 2)->nullable();
            $table->string('nf_numero', 40)->nullable();
            $table->foreignId('fornecedor_id')->nullable()->constrained('parceiros')->nullOnDelete();
            $table->string('local', 120)->nullable();
            $table->string('responsavel', 120)->nullable();
            $table->foreignId('responsavel_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 24)->default('ATIVO');
            $table->date('garantia_ate')->nullable();
            $table->string('placa', 16)->nullable();
            $table->string('renavam', 24)->nullable();
            $table->unsignedSmallInteger('vida_util_meses')->nullable();
            $table->foreignId('orc_catalogo_maquina_id')
                ->nullable()
                ->constrained('orc_catalogo_maquinas')
                ->nullOnDelete();
            $table->boolean('capitalizado')->default(false);
            $table->text('observacao')->nullable();
            $table->date('baixado_em')->nullable();
            $table->string('motivo_baixa', 240)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('codigo');
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'categoria']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bens_patrimoniais');
    }
};
