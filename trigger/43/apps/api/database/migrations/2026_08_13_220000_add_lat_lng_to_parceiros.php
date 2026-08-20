<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parceiros', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('ibge');
            $table->decimal('longitude', 11, 7)->nullable()->after('latitude');
        });

        Schema::table('parceiro_enderecos_entrega', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('ibge');
            $table->decimal('longitude', 11, 7)->nullable()->after('latitude');
        });
    }

    public function down(): void
    {
        Schema::table('parceiros', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });

        Schema::table('parceiro_enderecos_entrega', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
};
