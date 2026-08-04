<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * CRT do emitente (grupo emit na NF-e):
 *  1 = Simples Nacional
 *  2 = Simples Nacional — excesso de sublimite de receita bruta
 *  3 = Regime Normal (Lucro Presumido / Lucro Real)
 *  4 = Simples Nacional — MEI
 *
 * Evidência no estudo (trigger/32): XMLs de venda com CRT=1; regime Simples hoje.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->unsignedTinyInteger('crt')->default(1)->after('regime');
        });

        $rows = DB::table('empresas')->select(['id', 'regime', 'cnpj', 'ie'])->get();
        foreach ($rows as $row) {
            $update = [
                'crt' => $this->crtFromRegime((string) ($row->regime ?? '')),
            ];

            // IE do emitente EMP-00001 evidenciada nos XMLs de venda (trigger/32).
            if (($row->cnpj ?? '') === '01423183000110' && ($row->ie === null || $row->ie === '')) {
                $update['ie'] = '7023251210034';
            }

            DB::table('empresas')->where('id', $row->id)->update($update);
        }
    }

    public function down(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->dropColumn('crt');
        });
    }

    private function crtFromRegime(string $regime): int
    {
        return match (mb_strtoupper(trim($regime), 'UTF-8')) {
            'MEI' => 4,
            'LUCRO_PRESUMIDO', 'PRESUMIDO', 'LUCRO_REAL', 'REAL' => 3,
            default => 1,
        };
    }
};
