<?php

namespace App\Http\Controllers;

use App\Domain\Cobranca\BaixaPix;
use App\Domain\Cobranca\CobrancaService;
use App\Domain\Empresa\EmpresaAtual;
use App\Http\Qr;
use App\Models\CobrancaPix;
use Illuminate\Support\Str;

class PixController extends Controller
{
    public function mostrar(string $txid, EmpresaAtual $atual)
    {
        $cobranca = $this->cobranca($txid, $atual);
        if ($cobranca->status === 'EXPIRADA') {
            $cobranca = app(CobrancaService::class)->emitir(
                $cobranca->empresa_id,
                $cobranca->finalidade,
                $cobranca->valor_centavos,
                $cobranca->fatura_id,
            );
        }

        return view('pix.mostrar', [
            'cobranca' => $cobranca,
            'qr' => Qr::svg($cobranca->payload_copia_cola),
            'simulado' => config('pix.driver') === 'fake',
        ]);
    }

    public function situacao(string $txid, EmpresaAtual $atual)
    {
        $cobranca = $this->cobranca($txid, $atual);

        return response()->json([
            'paga' => $cobranca->status === 'PAGA',
            'para' => route('inicio'),
        ]);
    }

    public function simular(string $txid, EmpresaAtual $atual, BaixaPix $baixa)
    {
        abort_unless(config('pix.driver') === 'fake', 404);
        $cobranca = $this->cobranca($txid, $atual);
        if ($cobranca->status !== 'PAGA') {
            $baixa->confirmar($cobranca->txid, 'E'.Str::upper(Str::random(31)), $cobranca->valor_centavos);
        }

        return redirect()->route('inicio')->with('ok', 'Pagamento simulado e saldo atualizado.');
    }

    private function cobranca(string $txid, EmpresaAtual $atual): CobrancaPix
    {
        return CobrancaPix::query()
            ->where('txid', $txid)
            ->where('empresa_id', $atual->empresa()->id)
            ->firstOrFail();
    }
}
