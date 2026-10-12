<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Motivo quando a OP usa bobina de um grupo diferente do catálogo do orçamento.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->string('motivo_grupo', 255)->nullable()->after('grupo_id');
        });
    }

    public function down(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->dropColumn('motivo_grupo');
        });
    }
};
