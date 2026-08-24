<?php

namespace App\Providers;

use App\Services\Auth\SessaoAcessoService;
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
