<?php

namespace App\Http\Middleware;

use App\Domain\Empresa\EmpresaAtual;
use App\Models\Notificacao;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ClienteAutenticado
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! auth('web')->check()) {
            return redirect()->route('entrar');
        }
        $empresa = app(EmpresaAtual::class)->empresa();
        $usuario = auth('web')->user();
        view()->share('empresaAtual', $empresa);
        view()->share('carteiraAtual', $empresa->carteira);
        view()->share('avisosNaoLidos', Notificacao::query()
            ->where('destinatario_tipo', 'CLIENTE')
            ->where('destinatario_id', $usuario->id)
            ->whereNull('lida_em')
            ->count());

        return $next($request);
    }
}
