<?php

namespace App\Services\Cadastros;

use RuntimeException;

class IncompleteAttrsException extends RuntimeException
{
    /** @param  list<string>  $faltando */
    public function __construct(
        string $message,
        public readonly array $faltando = [],
    ) {
        parent::__construct($message);
    }
}
