<?php

namespace App\Http\Controllers;

use App\Domain\Cobranca\CobrancaService;
use App\Domain\Empresa\EmpresaAtual;
use App\Models\Parametro;
use App\Suporte\CpfProtegido;
use App\Suporte\Dinheiro;
use App\Suporte\Documento;
use Illuminate\Http\Request;

class ContaController extends Controller
{
    public function mostrar(EmpresaAtual $atual)
    {
        $usuario = auth('web')->user();
        $cpf = CpfProtegido::ler($usuario->cpf_cifrado);

        return view('conta.mostrar', [
            'empresa' => $atual->empresa(),
            'cpfMascarado' => $cpf ? Documento::mascararCpf($cpf) : 'indisponível',
        ]);
    }

    public function recarga(EmpresaAtual $atual)
    {
        $atual->exigir('saldo.ver');

        return view('conta.recarga', [
            'minimo' => Parametro::inteiro('TICKET_ABERTURA'),
        ]);
    }

    public function emitirRecarga(Request $request, EmpresaAtual $atual, CobrancaService $cobrancas)
    {
        $atual->exigir('saldo.ver');
        $dados = $request->validate(['valor' => ['required', 'string', 'max:30']]);
        $centavos = Dinheiro::centavosDeTexto($dados['valor']);
        $minimo = Parametro::inteiro('TICKET_ABERTURA');
        if ($centavos < $minimo) {
            return back()->withInput()->with('erro', 'A recarga mínima é '.Dinheiro::reais($minimo).'.');
        }
        $cobranca = $cobrancas->emitir($atual->empresa()->id, 'RECARGA', $centavos);

        return redirect()->route('pix.mostrar', $cobranca->txid);
    }
}
