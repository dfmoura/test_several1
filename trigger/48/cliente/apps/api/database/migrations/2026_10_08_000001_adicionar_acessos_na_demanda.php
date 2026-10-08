<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demandas', function (Blueprint $table) {
            $table->text('acessos')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('demandas', function (Blueprint $table) {
            $table->dropColumn('acessos');
        });
    }
};
