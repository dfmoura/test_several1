<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bases editáveis do catálogo ORC (estudo 32 / TAB-*).
 * Demais parâmetros do motor continuam em catalog_oficial.json.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orc_catalogo_papeis', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 160)->unique();
            $table->decimal('preco_m2', 12, 4);
            $table->boolean('ativo')->default(true);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
        });

        Schema::create('orc_catalogo_acabamentos', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 160)->unique();
            $table->decimal('preco_m2', 12, 4);
            $table->decimal('perda_m2', 12, 4)->default(0);
            $table->boolean('ativo')->default(true);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
        });

        Schema::create('orc_catalogo_tipos_troca', function (Blueprint $table) {
            $table->id();
            $table->string('tipo', 160)->unique();
            $table->decimal('tempo_h', 16, 10);
            $table->boolean('ativo')->default(true);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
        });

        Schema::create('orc_catalogo_maquinas', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 80)->unique();
            $table->boolean('ativo')->default(true);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
        });

        Schema::create('orc_catalogo_hora_maquina', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maquina_id')
                ->constrained('orc_catalogo_maquinas')
                ->cascadeOnDelete();
            $table->string('cores', 16);
            $table->decimal('tarifa', 12, 4);
            $table->timestamps();
            $table->unique(['maquina_id', 'cores']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orc_catalogo_hora_maquina');
        Schema::dropIfExists('orc_catalogo_maquinas');
        Schema::dropIfExists('orc_catalogo_tipos_troca');
        Schema::dropIfExists('orc_catalogo_acabamentos');
        Schema::dropIfExists('orc_catalogo_papeis');
    }
};
