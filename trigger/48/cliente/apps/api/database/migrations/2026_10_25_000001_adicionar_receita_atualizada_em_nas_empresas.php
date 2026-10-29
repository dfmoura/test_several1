<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->timestamp('receita_atualizada_em')->nullable()->after('dados_receita');
        });

        DB::table('empresas')
            ->whereNull('receita_atualizada_em')
            ->update(['receita_atualizada_em' => DB::raw('criada_em')]);
    }

    public function down(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->dropColumn('receita_atualizada_em');
        });
    }
};
