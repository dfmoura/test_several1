<?php

declare(strict_types=1);

namespace App\Domain\Empresa;

final class DadosReceita
{
    /**
     * @param  array<string, mixed>  $bruto
     */
    public function __construct(
        public string $cnpj,
        public string $razaoSocial,
        public ?string $nomeFantasia,
        public string $situacao,
        public bool $ativa,
        public array $bruto,
    ) {}
}
