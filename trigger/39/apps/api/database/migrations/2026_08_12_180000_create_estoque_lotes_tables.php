<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-045 — Lote / entrada / validade (ADR-039-EST-003).
 * Custo médio permanece no SKU; lote é rastreio + FEFO.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->boolean('controla_lote')->default(false)->after('lead_time_dias');
            $table->boolean('controla_validade')->default(false)->after('controla_lote');
            $table->unsignedSmallInteger('prazo_validade_dias')->nullable()->after('controla_validade');
        });

        Schema::create('estoque_lotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->restrictOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->string('codigo', 60);
            $table->date('data_entrada');
            $table->date('data_fabricacao')->nullable();
            $table->date('data_validade')->nullable();
            $table->decimal('qtde', 15, 4)->default(0);
            $table->string('unidade', 8);
            $table->string('origem_tipo', 24);
            $table->unsignedBigInteger('origem_id')->nullable();
            $table->string('nf_numero', 20)->nullable();
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->unique(['empresa_id', 'produto_id', 'codigo']);
            $table->index(['empresa_id', 'produto_id']);
            $table->index(['empresa_id', 'data_validade']);
        });

        Schema::table('estoque_movimento_itens', function (Blueprint $table) {
            $table->foreignId('lote_id')->nullable()->after('produto_id')
                ->constrained('estoque_lotes')->restrictOnDelete();
        });

        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->foreignId('lote_id')->nullable()->after('produto_id')
                ->constrained('estoque_lotes')->nullOnDelete();
            $table->string('lote_codigo', 60)->nullable()->after('lote_id');
            $table->date('lote_data_entrada')->nullable()->after('lote_codigo');
            $table->date('lote_data_fabricacao')->nullable()->after('lote_data_entrada');
            $table->date('lote_data_validade')->nullable()->after('lote_data_fabricacao');
            $table->json('lote_payload')->nullable()->after('lote_data_validade');
        });
    }

    public function down(): void
    {
        Schema::table('estoque_ajustes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lote_id');
            $table->dropColumn([
                'lote_codigo',
                'lote_data_entrada',
                'lote_data_fabricacao',
                'lote_data_validade',
                'lote_payload',
            ]);
        });

        Schema::table('estoque_movimento_itens', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lote_id');
        });

        Schema::dropIfExists('estoque_lotes');

        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn(['controla_lote', 'controla_validade', 'prazo_validade_dias']);
        });
    }
};
