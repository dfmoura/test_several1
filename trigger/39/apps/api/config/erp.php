<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Bootstrap / demo credentials (local & first deploy)
    |--------------------------------------------------------------------------
    |
    | Used by DatabaseSeeder. Prefer config('erp.*') over env() so values
    | remain available after `php artisan config:cache`.
    |
    */

    'admin_email' => env('ADMIN_EMAIL', 'admin@rlp.com.br'),
    'admin_password' => env('ADMIN_PASSWORD', 'Admin@123'),
    'demo_password' => env('DEMO_PASSWORD', 'Demo@123'),
    'default_empresa_codigo' => env('DEFAULT_EMPRESA_CODIGO', 'EMP-00001'),

    /*
    |--------------------------------------------------------------------------
    | IA providers (cadastro + cliente HTTP)
    |--------------------------------------------------------------------------
    |
    | API keys são cifradas com Laravel Crypt (APP_KEY). Não registre plaintext
    | em logs nem em auditoria — apenas a máscara.
    |
    */

    'ia_http_timeout_sec' => (float) env('IA_HTTP_TIMEOUT_SEC', 45),

];
