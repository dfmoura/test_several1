<?php

namespace App\Services\Banking;

/**
 * Resultado canônico de emitir_cobranca (estudo 32 INTEGRACAO_BANCARIA).
 */
final class CobrancaEmitidaDto
{
    /**
     * @param  array<string, mixed>|null  $raw
     */
    public function __construct(
        public readonly string $providerRef,
        public readonly ?string $txid,
        public readonly ?string $pixCopiaCola,
        public readonly ?string $pixQrBase64,
        public readonly ?string $linhaDigitavel,
        public readonly ?string $pdfUrl,
        public readonly string $status,
        public readonly ?array $raw = null,
    ) {}
}
