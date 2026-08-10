<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Congela Relatórios IA no produto sem apagar o módulo.
 * Rollback: RELATORIO_IA_HABILITADO=true
 */
class EnsureRelatorioIaHabilitado
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('erp.relatorio_ia_habilitado', false)) {
            abort(404);
        }

        return $next($request);
    }
}
