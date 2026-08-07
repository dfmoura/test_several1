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
        'licensee_product' => 'ERP RLP',
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
    | Relatórios IA — flags aditivas (rollback = desligar env)
    |--------------------------------------------------------------------------
    |
    | Spec v1 permanece válida sempre. Recursos novos degradam com segurança.
    | Ver docs/relatorios-ia-plano-profissional-trigger39.txt §12.
    |
    */

    'relatorio_ia_autocorrecao' => filter_var(env('RELATORIO_IA_AUTOCORRECAO', true), FILTER_VALIDATE_BOOLEAN),
    'relatorio_ia_json_mode' => filter_var(env('RELATORIO_IA_JSON_MODE', true), FILTER_VALIDATE_BOOLEAN),
    'relatorio_ia_log_prompt' => filter_var(env('RELATORIO_IA_LOG_PROMPT', false), FILTER_VALIDATE_BOOLEAN),
    'relatorio_ia_planejar_endpoint' => filter_var(env('RELATORIO_IA_PLANEJAR_ENDPOINT', true), FILTER_VALIDATE_BOOLEAN),
    'relatorio_ia_planejar_cache_sec' => (int) env('RELATORIO_IA_PLANEJAR_CACHE_SEC', 600),
    'relatorio_ia_rate_planejar' => env('RELATORIO_IA_RATE_PLANEJAR', '20,1'),
    'relatorio_ia_rate_gerar' => env('RELATORIO_IA_RATE_GERAR', '10,1'),

    // Guard-rail DomPDF: células = linhas × colunas (impacto §8-R4).
    'relatorio_celulas_max' => (int) env('RELATORIO_CELULAS_MAX', 8000),

    // Retenção operacional (impacto §7 / §8-R6). 0 = desliga aquele critério.
    'relatorio_pdf_retencao_dias' => (int) env('RELATORIO_PDF_RETENCAO_DIAS', 180),
    'relatorio_execucao_retencao_dias' => (int) env('RELATORIO_EXECUCAO_RETENCAO_DIAS', 90),

    // Timeout dedicado da narrativa (Fase 5) — independente do IA_HTTP_TIMEOUT_SEC.
    'relatorio_ia_narrativa_timeout_sec' => (float) env('RELATORIO_IA_NARRATIVA_TIMEOUT_SEC', 20),

    /*
    |--------------------------------------------------------------------------
    | Hubs fiscais (Focus NFe etc.)
    |--------------------------------------------------------------------------
    |
    | Tokens cifados com Laravel Crypt. Homolog ≠ produção (UC-INT-001).
    | Cliente mínimo: autenticação + teste; emissão NF é fase futura.
    |
    */

    'fiscal_hub_http_timeout_sec' => (float) env('FISCAL_HUB_HTTP_TIMEOUT_SEC', 20),

];
