<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        // `php artisan test` herda DB_*=mysql do Compose; phpunit.xml force
        // sozinho não basta — precisa setar ANTES do boot da Application.
        $this->forceTestingDatabaseEnv();

        parent::setUp();

        $connection = (string) config('database.default');
        $database = (string) config("database.connections.{$connection}.database");

        // Evita RefreshDatabase destruir o MySQL compartilhado do Docker Compose.
        if ($connection !== 'sqlite' || $database !== ':memory:') {
            throw new RuntimeException(
                "Testes devem usar sqlite :memory: (atual: {$connection} / {$database}). ".
                'Confira phpunit.xml (force="true") e Tests\\TestCase::forceTestingDatabaseEnv().'
            );
        }
    }

    private function forceTestingDatabaseEnv(): void
    {
        $vars = [
            'APP_ENV' => 'testing',
            // Chave fixa só para testes (não usar em produção).
            'APP_KEY' => 'base64:2fl+KtvkdphvQyEfm5L2sY8b3V8z0xqG1nN9pQwErAs=',
            'DB_CONNECTION' => 'sqlite',
            'DB_DATABASE' => ':memory:',
            'CACHE_STORE' => 'array',
            'QUEUE_CONNECTION' => 'sync',
            'SESSION_DRIVER' => 'array',
        ];

        foreach ($vars as $key => $value) {
            putenv("{$key}={$value}");
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }
}
