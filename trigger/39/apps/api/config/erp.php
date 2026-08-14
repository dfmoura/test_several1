<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Estágio do caminho local → AWS (homolog → production)
    |--------------------------------------------------------------------------
    |
    | Norma operacional: docs/DEPLOY_LOCAL_AWS.md
    | Valores: local | homolog | production
    | Health expõe o stage (sem secrets) para validar a virada de chave.
    |
    */

    'stage' => env('ERP_STAGE', env('APP_ENV', 'local')),

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
    | Identidade TRIGGER × licenciado
    |--------------------------------------------------------------------------
    |
    | Norma: docs/IDENTIDADE_TRIGGER.md (modelo trigger/12).
    | UI front: apps/web/src/lib/brand.ts — manter strings alinhadas.
    | Atribuição permanente e não-herói: nunca omitir em PDF/ficha.
    |
    */

    'brand' => [
        'vendor_short' => 'TRIGGER',
        'vendor_full' => 'TRIGGER Data Intelligence',
        'vendor_url' => 'https://www.triggerti.com',
        'attribution_print' => 'Powered by TRIGGER',
        'licensee_product' => 'FLEXOERP',
    ],

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

    /*
    |--------------------------------------------------------------------------
    | Hubs fiscais (Focus NFe etc.)
    |--------------------------------------------------------------------------
    |
    | Tokens cifados com Laravel Crypt. Homolog ≠ produção (UC-INT-001).
    | Teste OK do ambiente ativo habilita emissão automática de NF-e/NFS-e.
    |
    */

    'fiscal_hub_http_timeout_sec' => (float) env('FISCAL_HUB_HTTP_TIMEOUT_SEC', 20),

    'fiscal_hub_emit_timeout_sec' => (float) env('FISCAL_HUB_EMIT_TIMEOUT_SEC', 40),

    /*
    |--------------------------------------------------------------------------
    | Orçamento — link público de aprovação
    |--------------------------------------------------------------------------
    |
    | Base absoluta do link Ctrl+C (sem barra final). Em produção aponta para o
    | subdomínio comercial, ex.: https://flexorc.triggerti.com
    | Local: deixa vazio para cair em APP_URL (http://localhost:8039).
    | Path fixo: /p/{token}  ·  ADR: docs/ADR_ORC_LINK_APROVACAO.md
    |
    */

    'orcamento_public_base_url' => env('ORCAMENTO_PUBLIC_BASE_URL', env('APP_URL', 'http://localhost:8039')),

    /*
    |--------------------------------------------------------------------------
    | BankProvider (boleto / BolePix / PIX)
    |--------------------------------------------------------------------------
    |
    | mock = local/CI (sem mTLS). inter = sandbox/prod Inter (credenciais EMP).
    | ADR: docs/ADR_ORC_ADIANTAMENTO_PIX.md
    |
    */

    'bank_provider' => env('BANK_PROVIDER', 'mock'),
    'bank_http_timeout_sec' => (float) env('BANK_HTTP_TIMEOUT_SEC', 30),

    /*
    |--------------------------------------------------------------------------
    | OpenRouteService (distância de carro EMP → PAR)
    |--------------------------------------------------------------------------
    |
    | Chave só no backend. Proibido router.project-osrm.org.
    | Cadência Tipo A (estudo 32): evento humano + cache. Nunca no browser.
    |
    */

    'ors' => [
        'key' => env('ORS_API_KEY', ''),
        'base' => env('ORS_BASE', 'https://api.openrouteservice.org'),
        'timeout_sec' => (float) env('ORS_HTTP_TIMEOUT_SEC', 8),
        'cache_ttl_days' => (int) env('ORS_CACHE_TTL_DAYS', 90),
    ],

];
