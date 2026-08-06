<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Retenção Relatórios IA (impacto §8-R6). Requer `php artisan schedule:work`
// no host ou cron: * * * * * php artisan schedule:run
Schedule::command('relatorios:purgar')
    ->dailyAt('03:30')
    ->withoutOverlapping();
