<?php

namespace App\Http\Middleware;

use App\Models\Notificacao;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class OperacaoAutenticada
{
    public function handle(Request $request, Closure $next): Response
    {
        $operador = auth('operacao')->user();
        if (! $operador || ! $operador->ativo) {
            auth('operacao')->logout();

            return redirect()->route('operacao.entrar');
        }
        view()->share('avisosOperacao', Notificacao::query()
            ->where('destinatario_tipo', 'TRIGGER')
            ->where('destinatario_id', $operador->id)
            ->whereNull('lida_em')
            ->count());

        return $next($request);
    }
}
