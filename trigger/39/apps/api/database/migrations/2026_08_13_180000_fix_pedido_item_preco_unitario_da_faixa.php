<?php

use App\Services\Comercial\PrecoTravadoPedido;
use App\Support\PadraoDecimal;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Corrige pedido_itens.preco_unitario gravado com o TOTAL da faixa (valor_etiqueta do motor).
 * O FAT estornado permanece como histórico; o próximo faturar usa o unitário certo.
 */
return new class extends Migration
{
    public function up(): void
    {
        $pedidos = DB::table('pedidos')->whereNotNull('snapshot')->get(['id', 'snapshot']);
        foreach ($pedidos as $pedido) {
            $snap = json_decode((string) $pedido->snapshot, true);
            if (! is_array($snap) || ! is_array($snap['faixa'] ?? null)) {
                continue;
            }
            $faixa = $snap['faixa'];
            if (! PrecoTravadoPedido::faixaUtil($faixa)) {
                continue;
            }
            $travado = PrecoTravadoPedido::daFaixa($faixa);
            $etiqueta = $travado['valor_etiqueta'];
            if (bccomp($travado['qtde_faixa'], '1', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }

            $itens = DB::table('pedido_itens')->where('pedido_id', $pedido->id)->get(['id', 'preco_unitario']);
            foreach ($itens as $item) {
                if ($item->preco_unitario === null) {
                    continue;
                }
                $stored = PadraoDecimal::roundHalfUp((string) $item->preco_unitario, PadraoDecimal::SCALE_UNIT_PRICE);
                if (bccomp($stored, $etiqueta, PadraoDecimal::SCALE_MONEY) !== 0) {
                    continue;
                }
                DB::table('pedido_itens')->where('id', $item->id)->update([
                    'preco_unitario' => $travado['preco_unitario'],
                ]);
            }
        }
    }

    public function down(): void
    {
        // Irreversível: o unitário contaminado não deve voltar.
    }
};
