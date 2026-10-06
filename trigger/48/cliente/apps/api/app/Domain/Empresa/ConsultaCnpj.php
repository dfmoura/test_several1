<?php

declare(strict_types=1);

namespace App\Domain\Empresa;

interface ConsultaCnpj
{
    public function consultar(string $cnpj): DadosReceita;
}
