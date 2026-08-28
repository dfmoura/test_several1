<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Observação registrada no momento da conclusão do item de backlog.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('backlog_itens', function (Blueprint $table) {
            $table->string('observacao_conclusao', 500)->nullable()->after('concluido_em');
        });
    }

    public function down(): void
    {
        Schema::table('backlog_itens', function (Blueprint $table) {
            $table->dropColumn('observacao_conclusao');
        });
    }
};
