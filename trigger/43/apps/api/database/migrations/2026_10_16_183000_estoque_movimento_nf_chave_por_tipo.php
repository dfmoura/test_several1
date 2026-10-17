<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A mesma chave pode ter a saída da venda e o estorno do cancelamento.
 * Continua uma linha por tipo: a entrada de compra não duplica a chave.
 * Idempotente: instalações que já trocaram o índice não falham.
 */
return new class extends Migration
{
    public function up(): void
    {
        $nomes = collect(Schema::getIndexes('estoque_movimentos'))->pluck('name');
        $temAntigo = $nomes->contains('estoque_movimentos_empresa_id_nf_chave_unique');
        $temNovo = $nomes->contains('estoque_movimentos_empresa_id_tipo_nf_chave_unique');
        if (! $temAntigo && $temNovo) {
            return;
        }

        Schema::table('estoque_movimentos', function (Blueprint $table) use ($temAntigo, $temNovo) {
            if ($temAntigo) {
                $table->dropUnique(['empresa_id', 'nf_chave']);
            }
            if (! $temNovo) {
                $table->unique(['empresa_id', 'tipo', 'nf_chave']);
            }
        });
    }

    public function down(): void
    {
        $nomes = collect(Schema::getIndexes('estoque_movimentos'))->pluck('name');
        $temAntigo = $nomes->contains('estoque_movimentos_empresa_id_nf_chave_unique');
        $temNovo = $nomes->contains('estoque_movimentos_empresa_id_tipo_nf_chave_unique');
        if ($temAntigo && ! $temNovo) {
            return;
        }

        Schema::table('estoque_movimentos', function (Blueprint $table) use ($temAntigo, $temNovo) {
            if ($temNovo) {
                $table->dropUnique(['empresa_id', 'tipo', 'nf_chave']);
            }
            if (! $temAntigo) {
                $table->unique(['empresa_id', 'nf_chave']);
            }
        });
    }
};
