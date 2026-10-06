<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();
        // O `artisan test` sobe com o banco local já lido. Os testes ficam no banco separado.
        $app['config']->set('database.connections.pgsql.database', 'cliente_teste');
        $app['db']->purge('pgsql');

        return $app;
    }
}
