<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_ncms', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 8)->unique();
            $table->string('descricao', 500);
            $table->boolean('destaque_rlp')->default(false);
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['destaque_rlp', 'ativo']);
        });

        Schema::create('fiscal_cests', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 7)->unique();
            $table->string('descricao', 500);
            $table->string('segmento', 16)->nullable();
            $table->text('observacao')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        Schema::create('fiscal_ncm_cest', function (Blueprint $table) {
            $table->id();
            $table->string('ncm_codigo', 8);
            $table->string('cest_codigo', 7);
            $table->timestamps();

            $table->unique(['ncm_codigo', 'cest_codigo']);
            $table->index('cest_codigo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_ncm_cest');
        Schema::dropIfExists('fiscal_cests');
        Schema::dropIfExists('fiscal_ncms');
    }
};
