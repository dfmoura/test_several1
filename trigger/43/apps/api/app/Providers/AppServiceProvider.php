<?php

namespace App\Providers;

use App\Services\Auth\SessaoAcessoService;
use App\Services\Fiscal\Dfe\DfeDistribuicaoClient;
use App\Services\Fiscal\Dfe\FakeDfeDistribuicaoClient;
use App\Services\Fiscal\Dfe\SefazNfeDistribuicaoClient;
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
    }
}
