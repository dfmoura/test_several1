<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parceiros', function (Blueprint $table) {
            $table->string('cnae', 16)->nullable()->after('regime_desde');
            $table->json('cnaes_secundarios')->nullable()->after('cnae');
        });
    }

    public function down(): void
    {
        Schema::table('parceiros', function (Blueprint $table) {
            $table->dropColumn(['cnae', 'cnaes_secundarios']);
        });
    }
};
