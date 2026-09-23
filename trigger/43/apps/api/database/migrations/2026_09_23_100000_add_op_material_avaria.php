<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Avaria na separação (antes de produzir) — distinta da perda de processo na conclusão.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->decimal('qtde_avaria', 15, 4)->default(0)->after('qtde_requisitada');
            $table->string('motivo_avaria', 255)->nullable()->after('qtde_avaria');
            $table->timestamp('avaria_em')->nullable()->after('motivo_avaria');
            $table->unsignedBigInteger('avaria_por')->nullable()->after('avaria_em');
        });
    }

    public function down(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->dropColumn(['qtde_avaria', 'motivo_avaria', 'avaria_em', 'avaria_por']);
        });
    }
};
