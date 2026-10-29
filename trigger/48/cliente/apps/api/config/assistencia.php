<?php

return [

    'habilitada' => filter_var(env('ASSISTENCIA_HABILITADA', false), FILTER_VALIDATE_BOOLEAN),

    'url' => rtrim((string) env('ASSISTENCIA_URL', ''), '/'),

    'api_key' => (string) env('ASSISTENCIA_API_KEY', ''),

    'timeout' => (int) env('ASSISTENCIA_TIMEOUT', 45),

];
