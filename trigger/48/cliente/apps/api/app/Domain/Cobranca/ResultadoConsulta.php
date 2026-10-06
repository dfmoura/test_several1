<?php

declare(strict_types=1);

namespace App\Domain\Cobranca;

final class ResultadoConsulta
{
    public function __construct(
        public string $status,
        public ?string $endToEndId = null,
        public ?int $valorCentavos = null,
    ) {}
}
