<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $agora = now();
        foreach ([
            'ATIVACAO_CENTAVOS' => '100000',
            'TICKET_ABERTURA' => '100000',
            'RECARGA_MINIMA_CENTAVOS' => '100001',
        ] as $chave => $valor) {
            DB::table('parametros')->updateOrInsert(
                ['chave' => $chave],
                ['valor' => $valor, 'atualizado_em' => $agora],
            );
        }
    }

    public function down(): void
    {
        $agora = now();
        foreach ([
            'ATIVACAO_CENTAVOS' => '50000',
            'TICKET_ABERTURA' => '50000',
        ] as $chave => $valor) {
            DB::table('parametros')->where('chave', $chave)->update([
                'valor' => $valor,
                'atualizado_em' => $agora,
            ]);
        }
        DB::table('parametros')->where('chave', 'RECARGA_MINIMA_CENTAVOS')->delete();
    }
};
