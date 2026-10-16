<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Local do almoxarifado passa a ser só L######## (ADR_CADASTRO_INSUMO_VOLUME, emenda 2026-10-16).
 * P######## no mesmo número vira L. Prateleira, coluna e vão deixam de identificar o local.
 * O vínculo do volume continua em endereco_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        $rows = DB::table('estoque_enderecos')
            ->orderBy('empresa_id')
            ->orderBy('id')
            ->get(['id', 'empresa_id', 'codigo']);

        $maxPorEmpresa = [];
        foreach ($rows as $row) {
            if (preg_match('/^[LP](\d{8})$/', (string) $row->codigo, $m) === 1) {
                $n = (int) $m[1];
                $maxPorEmpresa[$row->empresa_id] = max($maxPorEmpresa[$row->empresa_id] ?? 0, $n);
            }
        }

        foreach ($rows as $row) {
            $codigo = (string) $row->codigo;
            $novo = null;

            if (preg_match('/^P(\d{8})$/', $codigo, $m) === 1) {
                $novo = 'L'.$m[1];
            } elseif (preg_match('/^L\d{8}$/', $codigo) !== 1) {
                $proximo = ($maxPorEmpresa[$row->empresa_id] ?? 0) + 1;
                $maxPorEmpresa[$row->empresa_id] = $proximo;
                $novo = 'L'.str_pad((string) $proximo, 8, '0', STR_PAD_LEFT);
            }

            if ($novo !== null && $novo !== $codigo) {
                $ocupado = DB::table('estoque_enderecos')
                    ->where('empresa_id', $row->empresa_id)
                    ->where('codigo', $novo)
                    ->where('id', '!=', $row->id)
                    ->value('id');

                if ($ocupado !== null) {
                    DB::table('estoque_lotes')->where('endereco_id', $row->id)->update(['endereco_id' => $ocupado]);
                    if (Schema::hasColumn('estoque_saldos', 'endereco_id')) {
                        DB::table('estoque_saldos')->where('endereco_id', $row->id)->update(['endereco_id' => $ocupado]);
                    }
                    DB::table('estoque_enderecos')->where('id', $row->id)->update([
                        'codigo' => 'LEG-'.$row->id,
                        'ativo' => false,
                        'prateleira' => null,
                        'coluna' => null,
                        'vao' => null,
                    ]);

                    continue;
                }

                $codigo = $novo;
            }

            DB::table('estoque_enderecos')->where('id', $row->id)->update([
                'codigo' => $codigo,
                'prateleira' => null,
                'coluna' => null,
                'vao' => null,
            ]);
        }

        Schema::table('estoque_enderecos', function (Blueprint $table) {
            $table->dropUnique('estoque_enderecos_emp_pos_unique');
        });
    }

    public function down(): void
    {
        $rows = DB::table('estoque_enderecos')->orderBy('id')->get(['id', 'codigo']);
        foreach ($rows as $row) {
            if (preg_match('/^L(\d{8})$/', (string) $row->codigo, $m) === 1) {
                DB::table('estoque_enderecos')->where('id', $row->id)->update([
                    'codigo' => 'P'.$m[1],
                ]);
            }
        }

        Schema::table('estoque_enderecos', function (Blueprint $table) {
            $table->unique(['empresa_id', 'prateleira', 'coluna', 'vao'], 'estoque_enderecos_emp_pos_unique');
        });
    }
};
