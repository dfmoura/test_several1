<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('relatorios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas');
            $table->unsignedSmallInteger('ano');
            $table->unsignedInteger('numero');
            $table->string('codigo', 32);
            $table->string('titulo', 200)->nullable();
            $table->text('prompt');
            $table->string('orientacao', 16); // retrato | paisagem
            $table->string('status', 24)->default('PENDENTE');
            $table->json('programa_json')->nullable();
            $table->json('contexto_flags')->nullable();
            $table->text('erro_mensagem')->nullable();
            $table->string('arquivo_path', 500)->nullable();
            $table->foreignId('provedor_ia_id')->nullable()->constrained('ia_provedores')->nullOnDelete();
            $table->foreignId('criado_por')->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['empresa_id', 'codigo']);
            $table->index(['empresa_id', 'status']);
            $table->index(['empresa_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('relatorios');
    }
};
