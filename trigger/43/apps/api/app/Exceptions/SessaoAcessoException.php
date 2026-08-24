<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Recusa de emissão de sessão (409) — sessão ocupada ou teto simultâneo.
 */
class SessaoAcessoException extends Exception
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public function __construct(
        string $message,
        public readonly string $codigo,
        int $status = 409,
        public readonly array $meta = [],
    ) {
        parent::__construct($message, $status);
    }

    public function report(): false
    {
        return false;
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'message' => $this->getMessage(),
            'code' => $this->codigo,
            ...$this->meta,
        ], $this->getCode() ?: 409);
    }
}
