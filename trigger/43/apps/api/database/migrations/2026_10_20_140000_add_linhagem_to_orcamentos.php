<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Linhagem comercial ORC — ADR_ORC_LINHAGEM_COMERCIAL.
 * Novo | Repetição | Repetição c/ alteração; origem só via duplicar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->string('linhagem', 32)
                ->default('NOVO')
                ->after('versao');
            $table->foreignId('origem_orcamento_id')
                ->nullable()
                ->after('linhagem')
                ->constrained('orcamentos')
                ->nullOnDelete();
            $table->index(['empresa_id', 'linhagem']);
            $table->index(['empresa_id', 'origem_orcamento_id']);
        });
    }

    public function down(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('origem_orcamento_id');
            $table->dropIndex(['empresa_id', 'linhagem']);
            $table->dropColumn('linhagem');
        });
    }
};
