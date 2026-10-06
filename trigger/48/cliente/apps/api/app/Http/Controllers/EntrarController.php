<?php

namespace App\Http\Controllers;

use App\Domain\Auditoria\AuditoriaService;
use App\Models\Vinculo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EntrarController extends Controller
{
    public function formulario()
    {
        return view('auth.entrar');
    }

    public function entrar(Request $request, AuditoriaService $auditoria)
    {
        $dados = $request->validate([
            'email' => ['required', 'email'],
            'senha' => ['required', 'string'],
        ]);
        $email = mb_strtolower($dados['email']);
        if (! Auth::guard('web')->attempt(['email' => $email, 'password' => $dados['senha']])) {
            $auditoria->registrar('login_falha', 'usuarios', null, null, null, ['email' => $email], 'SISTEMA', null);

            return back()->withInput($request->only('email'))->with('erro', 'E-mail ou senha incorretos.');
        }
        $usuario = Auth::guard('web')->user();
        $vinculo = Vinculo::query()
            ->where('usuario_id', $usuario->id)
            ->where('status', 'ATIVO')
            ->first();
        if (! $vinculo) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return back()->with('erro', 'E-mail ou senha incorretos.');
        }
        Auth::guard('operacao')->logout();
        $request->session()->regenerate();
        $request->session()->put('empresa_id', $vinculo->empresa_id);
        $request->session()->put('papel', $vinculo->papel);
        $request->session()->put('autenticado_em_web', now()->timestamp);
        $auditoria->registrar('login', 'usuarios', $usuario->id, $vinculo->empresa_id);

        return redirect()->route('inicio');
    }

    public function sair(Request $request, AuditoriaService $auditoria)
    {
        $auditoria->registrar('logout', 'usuarios', auth('web')->id(), (int) session('empresa_id') ?: null);
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('entrar');
    }
}
