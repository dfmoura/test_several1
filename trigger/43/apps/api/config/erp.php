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
    | Identidade TRIGGER × produto FLEXOERP
    |--------------------------------------------------------------------------
    |
    | Norma: docs/IDENTIDADE_TRIGGER.md (SaaS: produto = herói; EMP = contexto).
    | Transição: docs/ADR_TRANSICAO_FLEXORC_FLEXOERP.md
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
    | Homolog/prod: https://flexoerp001.triggerti.com (ADR_HOST_INSTALACAO_FLEXOERP001).
    | Lab/ensaio: tunnel https://flexorc.triggerti.com → notebook.
    | Local: deixa vazio para cair em APP_URL (http://localhost:8043).
    | Path fixo: /p/{token}  ·  ADR: docs/ADR_ORC_LINK_APROVACAO.md
    |
    */

    'orcamento_public_base_url' => env('ORCAMENTO_PUBLIC_BASE_URL', env('APP_URL', 'http://localhost:8043')),

    /*
    |--------------------------------------------------------------------------
    | E-mail automático da proposta (ao enviar link)
    |--------------------------------------------------------------------------
    |
    | Motor = MAIL_* da instalação. Reply-To = empresas.email.
    | Destino = e-mail do contato/parceiro. Sem SMTP por EMP.
    | ADR: docs/ADR_ORC_EMAIL_PROPOSTA.md
    |
    */

    'orcamento_email_auto' => filter_var(env('ORCAMENTO_EMAIL_AUTO', true), FILTER_VALIDATE_BOOL),

    /*
    |--------------------------------------------------------------------------
    | WhatsApp automático da proposta (ViaZap)
    |--------------------------------------------------------------------------
    |
    | Motor = VIAZAP_* da instalação. Destino = WhatsApp do contato/parceiro.
    | Fail-soft; clipboard + wa.me permanecem. ADR: docs/ADR_ORC_WHATSAPP_VIAZAP.md
    |
    */

    'orcamento_whatsapp_auto' => filter_var(env('ORCAMENTO_WHATSAPP_AUTO', true), FILTER_VALIDATE_BOOL),

    'viazap' => [
        'base_url' => env('VIAZAP_BASE_URL', ''),
        'token' => env('VIAZAP_TOKEN', ''),
        'timeout_sec' => (int) env('VIAZAP_TIMEOUT_SEC', 10),
    ],

    /*
    |--------------------------------------------------------------------------
    | FLEXORC — fatia comercial desta instalação
    |--------------------------------------------------------------------------
    |
    | ate_envio_link=false (padrão 43): fatia completa — link + aceite + sinal PIX.
    | true = recorte “até envio do link” (sem sinal/menu financeiro); motor intacto.
    | ADR: docs/ADR_FATIA_COMERCIAL_SAAS.md · docs/ADR_ORC_ADIANTAMENTO_PIX.md
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Sessão de acesso (Sanctum PAT)
    |--------------------------------------------------------------------------
    |
    | Uma sessão viva por usuário; teto de usuários distintos simultâneos na
    | instalação; idle desliza pelo last_used_at. Operador PLATAFORMA não
    | consome assento. ADR: docs/ADR_SESSAO_ACESSO.md
    |
    */

    'auth' => [
        'idle_minutes' => (int) env('AUTH_IDLE_MINUTES', 30),
        'max_usuarios_simultaneos' => (int) env('AUTH_MAX_USUARIOS_SIMULTANEOS', 6),
        'token_name' => env('AUTH_SESSION_TOKEN_NAME', 'api'),
    ],

    'flexorc' => [
        'ate_envio_link' => filter_var(env('FLEXORC_ATE_ENVIO_LINK', false), FILTER_VALIDATE_BOOL),
        /*
         | Alta pública de conta master (POST /auth/registrar-conta|registrar-empresa).
         | Padrão false: login só acessa; master nasce via CLI (plataforma:criar-conta)
         | ou lab com flag true. Usuários da conta: só o ADMIN em /usuarios.
         | ADR: docs/ADR_ATIVACAO_EMPRESA.md
         */
        'public_conta_registration' => filter_var(
            env('FLEXORC_PUBLIC_CONTA_REGISTRATION', false),
            FILTER_VALIDATE_BOOL
        ),
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
        // mock | asaas (cartão recorrente) | inter (PIX BolePix por ciclo)
        'provider' => env('BILLING_PROVIDER', env('ASAAS_API_KEY') ? 'asaas' : 'mock'),
        'valor' => env('FLEXOERP_BILLING_VALUE', env('FLEXORC_BILLING_VALUE', '297.00')),
        'ciclo' => env('FLEXOERP_BILLING_CYCLE', env('FLEXORC_BILLING_CYCLE', 'MONTHLY')),
        'descricao' => env('FLEXOERP_BILLING_DESCRICAO', env('FLEXORC_BILLING_DESCRICAO', 'Mensalidade da conta FLEXOERP')),
        'max_empresas_conta' => (int) env('FLEXOERP_MAX_EMPRESAS_CONTA', env('FLEXORC_MAX_EMPRESAS_CONTA', 3)),
        // Cobrança sempre antecipada: 1ª fatura no fim da cortesia (ou hoje).
        'cobranca_antecipada' => (bool) env('FLEXOERP_BILLING_ANTECIPADA', env('FLEXORC_BILLING_ANTECIPADA', true)),
        // Aviso na UI / comando ops quando a cortesia está a N dias do fim sem meio autenticado.
        // Inter: mesma janela para oferecer renovação PIX.
        'alerta_cortesia_dias' => (int) env('FLEXOERP_ALERTA_CORTESIA_DIAS', env('FLEXORC_ALERTA_CORTESIA_DIAS', 7)),
        // TTL operacional do QR PIX Inter (horas). Também expira no dataVencimento da cobrança.
        'inter_pix_ttl_horas' => (int) env('FLEXOERP_INTER_PIX_TTL_HORAS', env('FLEXORC_INTER_PIX_TTL_HORAS', 3)),
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
    | Cofre A1 — identidade da EMP (não é emissão SEFAZ)
    |--------------------------------------------------------------------------
    |
    | Envio da proposta self-service exige A1 vigente com CNPJ idêntico.
    | No upload, produção recusa divergência; local/homolog/teste só avisam.
    | ADR: docs/ADR_CERTIFICADO_A1_EMPRESA.md · docs/ADR_ATIVACAO_EMPRESA.md
    |
    */

    'certificado_a1' => [
        'exige_cnpj_identico' => filter_var(
            env(
                'A1_EXIGE_CNPJ_IDENTICO',
                env('APP_ENV') === 'production' || env('ERP_STAGE') === 'production'
            ),
            FILTER_VALIDATE_BOOL
        ),
        // Soft alert (banner/UI) enquanto ainda vigente — espelha alerta_cortesia_dias.
        'alerta_dias' => max(1, (int) env('A1_ALERTA_DIAS', 30)),
    ],

    /*
    |--------------------------------------------------------------------------
    | Caixa DF-e — NFeDistribuicaoDFe (sem Focus)
    |--------------------------------------------------------------------------
    |
    | Sync só em homolog/production + A1 apto. UI enfileira; job fala com o AN.
    | driver=fake: testes / ensaio sem SEFAZ. Norma: ADR_CAIXA_DFE_NFE_DESTINADAS.
    |
    */

    'dfe' => [
        'driver' => env('DFE_DRIVER', 'sefaz'), // sefaz | fake
        'stages_permitidos' => ['homolog', 'production'],
        'timeout_sec' => (float) env('DFE_HTTP_TIMEOUT_SEC', 45),
        'max_lotes_por_corrida' => max(1, (int) env('DFE_MAX_LOTES_CORRIDA', 5)),
        'delay_entre_lotes_sec' => max(1, (int) env('DFE_DELAY_LOTES_SEC', 3)),
        'xml_disk' => 'local',
        'urls' => [
            // Ambiente Nacional — destinadas (não é o autorizador SEFAZ-MG).
            'homolog' => env(
                'DFE_URL_HOMOLOG',
                'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx'
            ),
            'production' => env(
                'DFE_URL_PRODUCTION',
                'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx'
            ),
        ],
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
