<?php

namespace App\Services\Banking;

use InvalidArgumentException;

final class BankProviderResolver
{
    public function __construct(
        private readonly MockBankProvider $mock,
        private readonly InterBankProvider $inter,
    ) {}

    public function default(): BankProvider
    {
        return $this->resolve((string) config('erp.bank_provider', 'mock'));
    }

    public function resolve(string $provider): BankProvider
    {
        return match (strtolower(trim($provider))) {
            'mock' => $this->mock,
            'inter' => $this->inter,
            default => throw new InvalidArgumentException('BankProvider desconhecido: '.$provider),
        };
    }
}
