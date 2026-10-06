<?php

namespace App\Http\Controllers;

use App\Domain\Auditoria\AuditoriaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class SenhaController extends Controller
{
    public function formulario()
    {
        return view('auth.esqueci');
    }

    public function enviar(Request $request, AuditoriaService $auditoria)
    {
        $request->validate(['email' => ['required', 'email']]);
        Password::broker('usuarios')->sendResetLink(['email' => mb_strtolower($request->string('email')->toString())]);
        $auditoria->registrar('senha_recuperacao', 'usuarios');

        return back()->with('ok', 'Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha.');
    }

    public function redefinir(Request $request, string $token)
    {
        return view('auth.redefinir', ['token' => $token, 'email' => $request->query('email')]);
    }

    public function salvar(Request $request, AuditoriaService $auditoria)
    {
        $dados = $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'senha' => ['required', 'string', 'min:10', 'confirmed'],
        ]);
        $status = Password::broker('usuarios')->reset(
            [
                'email' => mb_strtolower($dados['email']),
                'password' => $dados['senha'],
                'password_confirmation' => $request->input('senha_confirmation'),
                'token' => $dados['token'],
            ],
            function ($usuario, $senha) {
                $usuario->forceFill(['senha_hash' => \Illuminate\Support\Facades\Hash::make($senha)])->save();
            }
        );
        if ($status !== Password::PASSWORD_RESET) {
            return back()->with('erro', 'Não foi possível redefinir a senha. Peça um novo link.');
        }
        $auditoria->registrar('senha_redefinida', 'usuarios');

        return redirect()->route('entrar')->with('ok', 'Senha redefinida. Entre com a nova senha.');
    }
}
