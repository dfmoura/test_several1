<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parâmetros escalares do catálogo ORC (ex.: matriz_cm2).
 * Overlay híbrido: DB populado → motor usa DB; vazio → catalog_oficial.json.
 * Vigência temporal TAB (início/fim) fica para UC-PLT-005 — fora desta migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orc_catalogo_parametros', function (Blueprint $table) {
            $table->id();
            $table->string('chave', 64)->unique();
            $table->decimal('valor', 16, 6);
            $table->string('rotulo', 160);
            $table->string('unidade', 32)->nullable();
            $table->boolean('ativo')->default(true);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orc_catalogo_parametros');
    }
};
