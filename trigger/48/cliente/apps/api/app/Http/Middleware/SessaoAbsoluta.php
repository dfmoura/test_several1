<?php

namespace App\Http\Middleware;

use App\Models\Parametro;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SessaoAbsoluta
{
    public function handle(Request $request, Closure $next, string $guard = 'web'): Response
    {
        $chave = 'autenticado_em_'.$guard;
        $inicio = (int) $request->session()->get($chave, 0);
        $limite = Parametro::inteiro('SESSAO_ABSOLUTA_MINUTOS') * 60;
        if ($inicio > 0 && (now()->timestamp - $inicio) > $limite) {
            auth($guard)->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()
                ->route($guard === 'operacao' ? 'operacao.entrar' : 'entrar')
                ->with('erro', 'Sua sessão expirou. Entre novamente.');
        }

        return $next($request);
    }
}
