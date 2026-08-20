<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo ORC e mapa de facas passam a ser por EMP.
 * Linhas com empresa_id nulo = template da instalação (seed / fallback).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orc_catalogo_papeis', function (Blueprint $table) {
            $table->foreignId('empresa_id')->nullable()->after('id')->constrained('empresas')->nullOnDelete();
            $table->dropUnique(['nome']);
            $table->unique(['empresa_id', 'nome']);
        });

        Schema::table('orc_catalogo_acabamentos', function (Blueprint $table) {
            $table->foreignId('empresa_id')->nullable()->after('id')->constrained('empresas')->nullOnDelete();
            $table->dropUnique(['nome']);
            $table->unique(['empresa_id', 'nome']);
        });

        Schema::table('orc_catalogo_tipos_troca', function (Blueprint $table) {
            $table->foreignId('empresa_id')->nullable()->after('id')->constrained('empresas')->nullOnDelete();
            $table->dropUnique(['tipo']);
            $table->unique(['empresa_id', 'tipo']);
        });

        Schema::table('orc_catalogo_maquinas', function (Blueprint $table) {
            $table->foreignId('empresa_id')->nullable()->after('id')->constrained('empresas')->nullOnDelete();
            $table->dropUnique(['nome']);
            $table->unique(['empresa_id', 'nome']);
        });

        Schema::table('orc_catalogo_parametros', function (Blueprint $table) {
            $table->foreignId('empresa_id')->nullable()->after('id')->constrained('empresas')->nullOnDelete();
            $table->dropUnique(['chave']);
            $table->unique(['empresa_id', 'chave']);
        });

        Schema::table('orc_catalogo_faixas_frete', function (Blueprint $table) {
            $table->foreignId('empresa_id')->nullable()->after('id')->constrained('empresas')->nullOnDelete();
            $table->index(['empresa_id', 'ativo', 'ordem']);
        });

        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->foreignId('empresa_id')->nullable()->after('id')->constrained('empresas')->nullOnDelete();
            $table->index(['empresa_id', 'ativo']);
        });
    }

    public function down(): void
    {
        Schema::table('orc_mapa_facas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('empresa_id');
        });
        Schema::table('orc_catalogo_faixas_frete', function (Blueprint $table) {
            $table->dropConstrainedForeignId('empresa_id');
        });
        Schema::table('orc_catalogo_parametros', function (Blueprint $table) {
            $table->dropUnique(['empresa_id', 'chave']);
            $table->dropConstrainedForeignId('empresa_id');
            $table->unique('chave');
        });
        Schema::table('orc_catalogo_maquinas', function (Blueprint $table) {
            $table->dropUnique(['empresa_id', 'nome']);
            $table->dropConstrainedForeignId('empresa_id');
            $table->unique('nome');
        });
        Schema::table('orc_catalogo_tipos_troca', function (Blueprint $table) {
            $table->dropUnique(['empresa_id', 'tipo']);
            $table->dropConstrainedForeignId('empresa_id');
            $table->unique('tipo');
        });
        Schema::table('orc_catalogo_acabamentos', function (Blueprint $table) {
            $table->dropUnique(['empresa_id', 'nome']);
            $table->dropConstrainedForeignId('empresa_id');
            $table->unique('nome');
        });
        Schema::table('orc_catalogo_papeis', function (Blueprint $table) {
            $table->dropUnique(['empresa_id', 'nome']);
            $table->dropConstrainedForeignId('empresa_id');
            $table->unique('nome');
        });
    }
};
