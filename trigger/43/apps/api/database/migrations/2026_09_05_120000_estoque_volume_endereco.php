<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADR_CADASTRO_INSUMO_VOLUME F2–F4:
 * dimensão real do volume + endereço de almoxarifado (WMS leve).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque_enderecos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->string('codigo', 32);
            $table->unsignedTinyInteger('prateleira');
            $table->unsignedTinyInteger('coluna');
            $table->unsignedTinyInteger('vao');
            $table->decimal('largura_m', 8, 3)->default('1.500');
            $table->decimal('profundidade_m', 8, 3)->default('0.600');
            $table->decimal('altura_m', 8, 3)->default('1.000');
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->unique(['empresa_id', 'codigo']);
            $table->unique(['empresa_id', 'prateleira', 'coluna', 'vao'], 'estoque_enderecos_emp_pos_unique');
            $table->index(['empresa_id', 'ativo']);
        });

        Schema::table('estoque_lotes', function (Blueprint $table) {
            $table->decimal('largura_mm', 12, 4)->nullable()->after('observacao');
            $table->decimal('comprimento_m', 12, 4)->nullable()->after('largura_mm');
            $table->foreignId('endereco_id')->nullable()->after('comprimento_m')
                ->constrained('estoque_enderecos')->nullOnDelete();
            $table->string('qr_token', 64)->nullable()->unique()->after('endereco_id');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_lotes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('endereco_id');
            $table->dropColumn(['largura_mm', 'comprimento_m', 'qr_token']);
        });

        Schema::dropIfExists('estoque_enderecos');
    }
};
