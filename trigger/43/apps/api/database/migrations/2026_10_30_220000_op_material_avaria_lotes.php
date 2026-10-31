<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Avaria da separação por volume (lote) — OP aponta qual bobina estragou.
 * qtde_avaria continua o total; avaria_lotes[] amarra o registro físico.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->json('avaria_lotes')->nullable()->after('avaria_por');
        });
    }

    public function down(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->dropColumn('avaria_lotes');
        });
    }
};
