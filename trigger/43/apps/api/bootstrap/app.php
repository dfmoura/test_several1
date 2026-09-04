<?php

use App\Http\Middleware\EnsurePlatformOperator;
use App\Http\Middleware\SetEmpresaContext;
use App\Models\User;
use App\Services\Auth\SessaoAcessoService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
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
    ->withSchedule(function (\Illuminate\Console\Scheduling\Schedule $schedule) {
        // Cobrança antecipada: alerta ops quando cortesia acaba sem meio ASAAS.
        $schedule->command('plataforma:avisar-cortesia-billing')->dailyAt('08:00');
        // Cofre A1: lista EMPs com certificado a vencer / vencido (valido_ate).
        $schedule->command('plataforma:avisar-certificado-a1')->dailyAt('08:05');
        // Caixa DF-e: delta NSU (fora do pico) — BL-093.
        $schedule->command('dfe:sync-delta')->dailyAt('06:15');
    })
    ->withMiddleware(function (Middleware $middleware) {
        // Auth por Bearer token (Sanctum personal access) — sem cookie/CSRF SPA.
        // Não usar statefulApi(): ele exige X-XSRF-TOKEN nas origens de SANCTUM_STATEFUL_DOMAINS.

        $middleware->alias([
            'empresa.context' => SetEmpresaContext::class,
            'plataforma.operador' => EnsurePlatformOperator::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->dontReport([
            \App\Exceptions\SessaoAcessoException::class,
        ]);

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $codigo = $request->attributes->get('auth_sessao_codigo');
            $mensagem = match ($codigo) {
                SessaoAcessoService::CODIGO_SESSAO_INATIVA => 'Sessão encerrada por inatividade. Entre novamente.',
                SessaoAcessoService::CODIGO_USUARIO_INATIVO => 'Usuário inativo.',
                // Token ausente/revogado (takeover, liberar sessão, logout noutro lugar).
                default => 'Sessão encerrada. Entre novamente.',
            };

            return response()->json([
                'message' => $mensagem,
                'code' => $codigo ?: 'NAO_AUTENTICADO',
            ], 401);
        });
    })->create();
