<?php

namespace App\Providers;

use App\Domain\Cobranca\FalsoProvedorPix;
use App\Domain\Cobranca\InterProvedorPix;
use App\Domain\Cobranca\ProvedorPix;
use App\Domain\Empresa\BrasilApiConsultaCnpj;
use App\Domain\Empresa\ConsultaCnpj;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(ConsultaCnpj::class, BrasilApiConsultaCnpj::class);
        $this->app->bind(ProvedorPix::class, function () {
            return config('pix.driver') === 'inter'
                ? $this->app->make(InterProvedorPix::class)
                : $this->app->make(FalsoProvedorPix::class);
        });
    }

    public function boot(): void
    {
        if (! in_array('argon2id', password_algos(), true)) {
            throw new \RuntimeException('Este PHP não oferece Argon2id.');
        }

        Blade::directive('reais', function (string $expressao) {
            return "<?php echo e(\\App\\Suporte\\Dinheiro::reais((int) {$expressao})); ?>";
        });

        RateLimiter::for('entrar', function (Request $request) {
            return Limit::perMinute(5)->by(strtolower((string) $request->input('email')).'|'.$request->ip())
                ->response(fn () => back()->with('erro', 'Muitas tentativas. Espere um minuto e tente de novo.'));
        });
        RateLimiter::for('cadastro', function (Request $request) {
            return Limit::perHour(10)->by($request->ip())
                ->response(fn () => back()->with('erro', 'Muitas tentativas de cadastro. Tente mais tarde.'));
        });
        RateLimiter::for('senha', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip())
                ->response(fn () => back()->with('erro', 'Muitos pedidos de senha. Espere um minuto.'));
        });
        RateLimiter::for('pix', function (Request $request) {
            return Limit::perMinute(5)->by((string) $request->user('web')?->id ?: $request->ip())
                ->response(fn () => back()->with('erro', 'Muitos PIX emitidos agora. Espere um minuto.'));
        });
    }
}
