<?php

namespace App\Providers;

use App\Services\Auth\SessaoAcessoService;
use App\Services\Fiscal\Dfe\DfeDistribuicaoClient;
use App\Services\Fiscal\Dfe\FakeDfeDistribuicaoClient;
use App\Services\Fiscal\Dfe\SefazNfeDistribuicaoClient;
use App\Services\Fiscal\Sefaz\FakeNfeSefazClient;
use App\Services\Fiscal\Sefaz\NfeSefazClient;
use App\Services\Fiscal\Sefaz\SefazNfeClient;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\Banking\Billing\BillingGateway::class, function ($app) {
            return $app->make(\App\Services\Banking\Billing\BillingGatewayResolver::class)->resolve();
        });

        $this->app->bind(DfeDistribuicaoClient::class, function ($app) {
            $driver = strtolower((string) config('erp.dfe.driver', 'sefaz'));

            return $driver === 'fake'
                ? $app->make(FakeDfeDistribuicaoClient::class)
                : $app->make(SefazNfeDistribuicaoClient::class);
        });

        $this->app->bind(NfeSefazClient::class, function ($app) {
            $driver = strtolower((string) config('erp.nfe.driver', 'sefaz'));

            return $driver === 'fake'
                ? $app->make(FakeNfeSefazClient::class)
                : $app->make(SefazNfeClient::class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Sanctum::authenticateAccessTokensUsing(function ($accessToken, bool $isValid) {
            if (! $isValid || ! $accessToken instanceof PersonalAccessToken) {
                return false;
            }

            return app(SessaoAcessoService::class)->recusarTokenSeInativo($accessToken);
        });

        // Limiters nomeados: chave inclui o nome → show/polling/decidir não compartilham balde
        // (o throttle:N,1 anônimo usa só domínio|IP e somava tudo).
        $this->configurePublicoOrcamentoRateLimiters();
    }

    private function configurePublicoOrcamentoRateLimiters(): void
    {
        RateLimiter::for('publico-orc-show', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        // Polling PIX (~8s + backoff); margem para 1–2 abas sem engolir o show.
        RateLimiter::for('publico-orc-adiantamento', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        RateLimiter::for('publico-orc-decidir', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('publico-orc-simular-pix', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('publico-orc-modelo', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });

        RateLimiter::for('publico-orc-arte', function (Request $request) {
            return Limit::perMinute(120)->by($request->ip());
        });
    }
}
