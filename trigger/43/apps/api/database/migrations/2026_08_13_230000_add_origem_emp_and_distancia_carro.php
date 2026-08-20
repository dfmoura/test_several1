<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->decimal('origem_latitude', 10, 7)->nullable()->after('ibge');
            $table->decimal('origem_longitude', 11, 7)->nullable()->after('origem_latitude');
        });

        Schema::table('parceiros', function (Blueprint $table) {
            $table->decimal('distancia_km', 8, 3)->nullable()->after('longitude');
            $table->string('distancia_fonte', 32)->nullable()->after('distancia_km');
            $table->timestamp('distancia_calculada_em')->nullable()->after('distancia_fonte');
            $table->foreignId('distancia_empresa_id')
                ->nullable()
                ->after('distancia_calculada_em')
                ->constrained('empresas')
                ->nullOnDelete();
        });

        Schema::table('parceiro_enderecos_entrega', function (Blueprint $table) {
            $table->decimal('distancia_km', 8, 3)->nullable()->after('longitude');
            $table->string('distancia_fonte', 32)->nullable()->after('distancia_km');
            $table->timestamp('distancia_calculada_em')->nullable()->after('distancia_fonte');
            $table->foreignId('distancia_empresa_id')
                ->nullable()
                ->after('distancia_calculada_em')
                ->constrained('empresas')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('parceiro_enderecos_entrega', function (Blueprint $table) {
            $table->dropConstrainedForeignId('distancia_empresa_id');
            $table->dropColumn(['distancia_km', 'distancia_fonte', 'distancia_calculada_em']);
        });

        Schema::table('parceiros', function (Blueprint $table) {
            $table->dropConstrainedForeignId('distancia_empresa_id');
            $table->dropColumn(['distancia_km', 'distancia_fonte', 'distancia_calculada_em']);
        });

        Schema::table('empresas', function (Blueprint $table) {
            $table->dropColumn(['origem_latitude', 'origem_longitude']);
        });
    }
};
