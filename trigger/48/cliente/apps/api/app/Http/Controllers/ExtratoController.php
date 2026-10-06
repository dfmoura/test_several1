<?php

namespace App\Http\Controllers;

use App\Domain\Empresa\EmpresaAtual;
use App\Models\MovimentoSaldo;

class ExtratoController extends Controller
{
    public function __invoke(EmpresaAtual $atual)
    {
        $atual->exigir('extrato.ver');
        $empresa = $atual->empresa();

        return view('extrato.index', [
            'carteira' => $empresa->carteira,
            'movimentos' => MovimentoSaldo::query()
                ->where('empresa_id', $empresa->id)
                ->latest('id')
                ->paginate(20),
        ]);
    }
}
