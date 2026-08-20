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
    | Identidade TRIGGER × produto FLEXORC
    |--------------------------------------------------------------------------
    |
    | Norma: docs/IDENTIDADE_TRIGGER.md (SaaS: produto = herói; EMP = contexto).
    | UI front: apps/web/src/lib/brand.ts — manter strings alinhadas.
    | Atribuição permanente e não-herói: nunca omitir em PDF/ficha.
    |
    */

    'brand' => [
        'vendor_short' => 'TRIGGER',
        'vendor_full' => 'TRIGGER Data Intelligence',
        'vendor_url' => 'https://www.triggerti.com',
        'attribution_print' => 'Powered by TRIGGER',
        'licensee_product' => 'FLEXORC',
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
    | fiscal_emissor: focus (padrão) | stub
    | stub = autorização sintética só em local/testing, e só se o hub NÃO estiver apto.
    | Homologação e produção ignoram stub (estudo 32: HML usa Focus homolog + A1).
    |
    */

    'fiscal_hub_http_timeout_sec' => (float) env('FISCAL_HUB_HTTP_TIMEOUT_SEC', 20),

    'fiscal_hub_emit_timeout_sec' => (float) env('FISCAL_HUB_EMIT_TIMEOUT_SEC', 40),

    'fiscal_emissor' => env('FISCAL_EMISSOR', 'focus'),

    /*
    |--------------------------------------------------------------------------
    | Orçamento — link público de aprovação
    |--------------------------------------------------------------------------
    |
    | Base absoluta do link Ctrl+C (sem barra final). Em produção aponta para o
    | subdomínio comercial, ex.: https://flexorc.triggerti.com
    | Local: deixa vazio para cair em APP_URL (http://localhost:8043).
    | Path fixo: /p/{token}  ·  ADR: docs/ADR_ORC_LINK_APROVACAO.md
    |
    */

    'orcamento_public_base_url' => env('ORCAMENTO_PUBLIC_BASE_URL', env('APP_URL', 'http://localhost:8043')),

    /*
    |--------------------------------------------------------------------------
    | FLEXORC — fatia comercial desta instalação
    |--------------------------------------------------------------------------
    |
    | ate_envio_link=true (padrão 43): ORC até enviar link aprovar/reprovar.
    | Esqueleto de sinal/financeiro permanece no motor; não expõe na UX nem
    | dispara PIX no aceite. ADR: docs/ADR_FATIA_COMERCIAL_SAAS.md
    |
    */

    'flexorc' => [
        'ate_envio_link' => filter_var(env('FLEXORC_ATE_ENVIO_LINK', true), FILTER_VALIDATE_BOOL),
    ],

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
    | Conta FLEXORC (ASAAS) — forma de pagamento da EMP, não o sinal do ORC
    |--------------------------------------------------------------------------
    |
    | PCI fica no ASAAS. Sem chave = mock (local/CI). Webhook e Checkout
    | autenticam o meio; o ERP só guarda referências. ADR_ATIVACAO_EMPRESA.
    |
    */

    'billing' => [
        'provider' => env('BILLING_PROVIDER', env('ASAAS_API_KEY') ? 'asaas' : 'mock'),
        'valor' => env('FLEXORC_BILLING_VALUE', '297.00'),
        'ciclo' => env('FLEXORC_BILLING_CYCLE', 'MONTHLY'),
        'descricao' => env('FLEXORC_BILLING_DESCRICAO', 'Mensalidade da conta FLEXORC'),
        'max_empresas_conta' => (int) env('FLEXORC_MAX_EMPRESAS_CONTA', 3),
    ],

    'asaas' => [
        'api_key' => env('ASAAS_API_KEY', ''),
        'env' => env('ASAAS_ENV', 'sandbox'),
        'base_url' => env('ASAAS_BASE_URL', ''),
        'webhook_token' => env('ASAAS_WEBHOOK_TOKEN', ''),
        'saque_webhook_token' => env('ASAAS_SAQUE_WEBHOOK_TOKEN', ''),
        'http_timeout_sec' => (float) env('ASAAS_HTTP_TIMEOUT_SEC', 20),
    ],

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
        'osm_routing_base' => env('OSM_ROUTING_BASE', 'https://routing.openstreetmap.de/routed-car'),
    ],

    'nominatim' => [
        'base' => env('NOMINATIM_BASE', 'https://nominatim.openstreetmap.org'),
        'timeout_sec' => (float) env('NOMINATIM_HTTP_TIMEOUT_SEC', 8),
    ],

    /*
    |--------------------------------------------------------------------------
    | CEP (endereço NF-e)
    |--------------------------------------------------------------------------
    |
    | ViaCEP é o contrato (logradouro/IBGE). BrasilAPI CEP v1 e OpenCEP só
    | completam campo vazio ou entram se a primária cair. Estudo 32 §3.2 / §6.3.
    | Geo (lat/lng) continua em getCepGeo — não mistura aqui.
    |
    */

    'cep' => [
        'timeout_sec' => (float) env('CEP_HTTP_TIMEOUT_SEC', 5),
        'cache_ttl_days' => (int) env('CEP_CACHE_TTL_DAYS', 90),
        'viacep_base' => env('VIACEP_BASE', 'https://viacep.com.br/ws'),
        'brasilapi_base' => env('BRASILAPI_BASE', 'https://brasilapi.com.br/api'),
        'opencep_base' => env('OPENCEP_BASE', 'https://opencep.com/v1'),
    ],

];
