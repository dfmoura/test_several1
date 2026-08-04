<?php

namespace App\Http\Middleware;

use App\Models\Empresa;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetEmpresaContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $empresaId = $request->header('X-Empresa-Id');
        if ($empresaId === null || $empresaId === '') {
            $empresaId = $user->empresa_default_id;
        }

        if ($empresaId === null) {
            $empresaId = $user->empresas()->wherePivot('padrao', true)->value('empresas.id')
                ?? $user->empresas()->value('empresas.id');
        }

        if ($empresaId === null) {
            abort(403, 'Nenhuma empresa disponível para o usuário.');
        }

        if (! $user->hasEmpresaAccess((int) $empresaId)) {
            abort(403, 'Sem acesso à empresa informada.');
        }

        $empresa = Empresa::query()->find((int) $empresaId);
        if ($empresa === null) {
            abort(403, 'Empresa não encontrada.');
        }

        app()->instance('empresa', $empresa);
        $request->attributes->set('empresa', $empresa);
        $request->attributes->set('empresa_id', $empresa->id);

        return $next($request);
    }
}
