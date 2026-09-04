<?php

namespace App\Services\Fiscal\Dfe;

/**
 * Um documento do lote DF-e já decodificado (gunzip).
 */
final class DfeDocZip
{
    public function __construct(
        public readonly string $nsu,
        public readonly string $schema,
        public readonly string $xml,
    ) {}
}
