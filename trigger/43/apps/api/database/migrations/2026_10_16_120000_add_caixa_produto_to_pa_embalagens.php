<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Caixa física escolhida na OP concluída, antes do faturamento.
 * Não movimenta saldo. Orçamento antigo permanece sem este vínculo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pa_embalagens', function (Blueprint $table) {
            $table->foreignId('caixa_produto_id')->nullable()->after('caixa_medida')
                ->constrained('produtos')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pa_embalagens', function (Blueprint $table) {
            $table->dropConstrainedForeignId('caixa_produto_id');
        });
    }
};
