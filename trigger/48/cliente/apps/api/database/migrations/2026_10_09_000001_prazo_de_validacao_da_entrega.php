<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demandas', function (Blueprint $table) {
            $table->unsignedTinyInteger('ajustes_usados')->default(0);
            $table->timestamp('validacao_ate')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('demandas', function (Blueprint $table) {
            $table->dropColumn(['ajustes_usados', 'validacao_ate']);
        });
    }
};
