<?php

return [

    'driver' => env('PIX_DRIVER', 'fake'),

    'inter' => [
        'base_url' => env('INTER_PIX_BASE_URL', 'https://cdpj.partners.bancointer.com.br'),
        'token_url' => env('INTER_TOKEN_URL', 'https://cdpj.partners.bancointer.com.br/oauth/v2/token'),
        'client_id' => env('INTER_CLIENT_ID'),
        'client_secret' => env('INTER_CLIENT_SECRET'),
        'cert' => env('INTER_CERT_PATH'),
        'key' => env('INTER_KEY_PATH'),
        'chave' => env('INTER_PIX_CHAVE'),
    ],

];
