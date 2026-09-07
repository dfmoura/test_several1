<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-048+ — xPed / nItemPed / nFCI no espelho de entrada (cópia fiel do XML).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nfe_entrada_itens', function (Blueprint $table) {
            $table->string('x_ped', 60)->nullable()->after('v_outro');
            $table->string('n_item_ped', 12)->nullable()->after('x_ped');
            $table->string('n_fci', 36)->nullable()->after('n_item_ped');
        });
    }

    public function down(): void
    {
        Schema::table('nfe_entrada_itens', function (Blueprint $table) {
            $table->dropColumn(['x_ped', 'n_item_ped', 'n_fci']);
        });
    }
};
