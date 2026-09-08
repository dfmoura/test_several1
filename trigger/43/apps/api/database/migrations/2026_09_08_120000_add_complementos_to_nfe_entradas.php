<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-048+ — complementos do espelho de entrada (cópia fiel do XML).
 * infRespTec, infAdic, transp, pag, fat, ide_extra, dest nome/e-mail.
 * Não é escrituração; não altera MOV/TIT.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nfe_entradas', function (Blueprint $table) {
            $table->json('complementos')->nullable()->after('totais');
        });
    }

    public function down(): void
    {
        Schema::table('nfe_entradas', function (Blueprint $table) {
            $table->dropColumn('complementos');
        });
    }
};
