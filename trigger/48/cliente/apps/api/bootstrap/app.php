<?php

use App\Domain\RegraNegocio;
use App\Http\Middleware\CabecalhosSeguros;
use App\Http\Middleware\ClienteAutenticado;
use App\Http\Middleware\OperacaoAutenticada;
use App\Http\Middleware\SessaoAbsoluta;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('cliente:rotina')->everyMinute()->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');
        $middleware->append(CabecalhosSeguros::class);
        $middleware->alias([
            'cliente' => ClienteAutenticado::class,
            'operacao' => OperacaoAutenticada::class,
            'sessao.absoluta' => SessaoAbsoluta::class,
        ]);
        $middleware->validateCsrfTokens(except: [
            'webhooks/inter/pix',
        ]);
        $middleware->redirectUsersTo(function (Request $request) {
            return $request->is('operacao', 'operacao/*')
                ? route('operacao.fila')
                : route('inicio');
        });
        $middleware->redirectGuestsTo(function (Request $request) {
            return $request->is('operacao', 'operacao/*')
                ? route('operacao.entrar')
                : route('entrar');
        });
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (RegraNegocio $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            return back()->withInput()->with('erro', $e->getMessage());
        });
    })->create();
