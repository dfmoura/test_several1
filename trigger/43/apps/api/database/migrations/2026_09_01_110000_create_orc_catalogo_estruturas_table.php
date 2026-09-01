<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Estruturas rv4 do catálogo ORC (matriz tinta, troca produto m², empacotamento).
 * Overlay híbrido: DB populado → motor usa DB; vazio → catalog_oficial.json.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orc_catalogo_estruturas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->nullable()->constrained('empresas')->nullOnDelete();
            $table->string('chave', 64);
            $table->json('payload');
            $table->timestamps();

            $table->unique(['empresa_id', 'chave']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orc_catalogo_estruturas');
    }
};
