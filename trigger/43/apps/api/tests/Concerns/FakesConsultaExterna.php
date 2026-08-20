<?php

namespace Tests\Concerns;

use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;

trait FakesConsultaExterna
{
    /**
     * Substitui o factory HTTP (Http::fake() acumula stubs; um '*' anterior ganha de todos).
     *
     * @param  array<string, mixed>  $stubs
     */
    protected function fakeConsultaExterna(array $stubs): void
    {
        Http::swap(new Factory);
        Http::fake($stubs);
    }

    /**
     * Impede HTTP real nas APIs livres (CNPJ, CEP, Nominatim).
     */
    protected function fakeConsultaExternaIndisponivel(): void
    {
        $this->fakeConsultaExterna([
            'nominatim.openstreetmap.org/*' => Http::response([], 200),
            'brasilapi.com.br/*' => Http::response(['message' => 'indisponivel'], 503),
            'viacep.com.br/*' => Http::response(['erro' => true], 200),
            'opencep.com/*' => Http::response(['message' => 'indisponivel'], 503),
        ]);
    }
}
