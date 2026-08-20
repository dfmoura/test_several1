<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parceiros', function (Blueprint $table) {
            $table->string('origem_lead', 32)->nullable()->after('is_prospect');
            $table->index(['empresa_id', 'origem_lead']);
        });
    }

    public function down(): void
    {
        Schema::table('parceiros', function (Blueprint $table) {
            $table->dropIndex(['empresa_id', 'origem_lead']);
            $table->dropColumn('origem_lead');
        });
    }
};
