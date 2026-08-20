<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Distingue autorização Focus (oficial) da autorização de teste (stub local).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documento_fiscal_saidas', function (Blueprint $table) {
            $table->string('autorizacao_origem', 8)->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('documento_fiscal_saidas', function (Blueprint $table) {
            $table->dropColumn('autorizacao_origem');
        });
    }
};
