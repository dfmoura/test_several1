<?php

return [

    'driver' => 'argon2id',

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => true,
    ],

    'argon' => [
        'memory' => (int) env('ARGON_MEMORY', 19456),
        'threads' => 1,
        'time' => (int) env('ARGON_TIME', 2),
        'verify' => true,
    ],

    'rehash_on_login' => true,

];
