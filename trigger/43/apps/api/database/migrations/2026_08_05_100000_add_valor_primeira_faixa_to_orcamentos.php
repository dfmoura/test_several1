<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Materializa faixas.0.valor_etiqueta para ordenação/agregação SQL em Relatórios IA.
 * Não é lida pelo motor de orçamento — coluna derivada do snapshot.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->decimal('valor_primeira_faixa', 14, 4)->nullable()->after('valor_matriz');
            $table->index(['empresa_id', 'valor_primeira_faixa'], 'orcamentos_empresa_valor_faixa_idx');
        });

        // Backfill idempotente e com memória controlada (chunkById — ver impacto computacional §4).
        DB::table('orcamentos')
            ->select(['id', 'result_snapshot'])
            ->whereNull('valor_primeira_faixa')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    $valor = $this->extractValorPrimeiraFaixa($row->result_snapshot);
                    if ($valor === null) {
                        continue;
                    }
                    DB::table('orcamentos')
                        ->where('id', $row->id)
                        ->whereNull('valor_primeira_faixa')
                        ->update(['valor_primeira_faixa' => $valor]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('orcamentos', function (Blueprint $table) {
            $table->dropIndex('orcamentos_empresa_valor_faixa_idx');
            $table->dropColumn('valor_primeira_faixa');
        });
    }

    private function extractValorPrimeiraFaixa(mixed $snapshot): ?string
    {
        if ($snapshot === null || $snapshot === '') {
            return null;
        }
        $data = is_string($snapshot) ? json_decode($snapshot, true) : $snapshot;
        if (! is_array($data)) {
            return null;
        }
        $valor = data_get($data, 'faixas.0.valor_etiqueta');
        if ($valor === null || $valor === '' || ! is_numeric($valor)) {
            return null;
        }

        return number_format((float) $valor, 4, '.', '');
    }
};
