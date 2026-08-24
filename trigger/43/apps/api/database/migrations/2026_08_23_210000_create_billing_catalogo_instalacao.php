<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo comercial da mensalidade FLEXORC (singleton por instalação).
 * ADR: docs/ADR_BILLING_CATALOGO_INSTALACAO.md
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_catalogo_instalacao', function (Blueprint $table) {
            $table->id();
            $table->decimal('valor', 10, 2)->default(297.00);
            $table->string('ciclo', 24)->default('MONTHLY');
            $table->string('descricao', 255)->default('Mensalidade da conta FLEXORC');
            $table->timestamp('vigente_desde')->nullable();
            $table->foreignId('atualizado_por_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('billing_catalogo_instalacao');
    }
};
