<?php

namespace App\Http\Middleware;

use App\Support\PlatformRbac;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformOperator
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        if (! $user->hasRole(PlatformRbac::ROLE) && ! $user->can('plataforma.operar')) {
            abort(403, 'Acesso restrito à operação da plataforma.');
        }

        return $next($request);
    }
}
