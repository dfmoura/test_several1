<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Evento do ADN reutiliza a chave da NFS-e. A identidade do lote é o NSU.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nfse_tomadas', function (Blueprint $table) {
            $table->dropUnique(['empresa_id', 'chave']);
            $table->index(['empresa_id', 'chave']);
        });
    }

    public function down(): void
    {
        Schema::table('nfse_tomadas', function (Blueprint $table) {
            $table->dropIndex(['empresa_id', 'chave']);
            $table->unique(['empresa_id', 'chave']);
        });
    }
};
