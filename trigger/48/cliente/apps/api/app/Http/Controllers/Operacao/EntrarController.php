<?php

namespace App\Http\Controllers\Operacao;

use App\Domain\Auditoria\AuditoriaService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EntrarController extends Controller
{
    public function formulario()
    {
        return view('operacao.entrar');
    }

    public function entrar(Request $request, AuditoriaService $auditoria)
    {
        $dados = $request->validate([
            'email' => ['required', 'email'],
            'senha' => ['required', 'string'],
        ]);
        $email = mb_strtolower($dados['email']);
        if (! Auth::guard('operacao')->attempt(['email' => $email, 'password' => $dados['senha']])) {
            $auditoria->registrar('login_falha', 'usuarios_trigger', null, null, null, ['email' => $email], 'SISTEMA', null);

            return back()->withInput($request->only('email'))->with('erro', 'E-mail ou senha incorretos.');
        }
        if (! Auth::guard('operacao')->user()->ativo) {
            Auth::guard('operacao')->logout();

            return back()->with('erro', 'E-mail ou senha incorretos.');
        }
        Auth::guard('web')->logout();
        $request->session()->regenerate();
        $request->session()->put('autenticado_em_operacao', now()->timestamp);
        $auditoria->registrar('login', 'usuarios_trigger', Auth::guard('operacao')->id(), null, null, null, 'TRIGGER', Auth::guard('operacao')->id());

        return redirect()->route('operacao.fila');
    }

    public function sair(Request $request, AuditoriaService $auditoria)
    {
        $auditoria->registrar('logout', 'usuarios_trigger', auth('operacao')->id(), null, null, null, 'TRIGGER', auth('operacao')->id());
        Auth::guard('operacao')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('operacao.entrar');
    }
}
