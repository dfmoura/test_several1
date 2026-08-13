<?php

use App\Http\Middleware\SetEmpresaContext;
use App\Models\User;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            Route::bind('usuario', fn (string $value) => User::query()->findOrFail($value));
        },
    )
    ->withCommands([
        __DIR__.'/../app/Console/Commands',
    ])
    ->withMiddleware(function (Middleware $middleware) {
        // Auth por Bearer token (Sanctum personal access) — sem cookie/CSRF SPA.
        // Não usar statefulApi(): ele exige X-XSRF-TOKEN nas origens de SANCTUM_STATEFUL_DOMAINS.

        $middleware->alias([
            'empresa.context' => SetEmpresaContext::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
