<?php

namespace App\Services\Comercial;

use App\Models\Empresa;
use App\Models\Parceiro;
use Illuminate\Validation\ValidationException;

/**
 * Vendedor = PAR papel_vendedor da EMP do contexto (estudo 32 / ADR_COMISSAO_VENDEDOR).
 */
final class VendedorResolver
{
    public function resolve(Empresa $empresa, mixed $id): ?Parceiro
    {
        if ($id === null || $id === '') {
            return null;
        }

        $vid = (int) $id;
        if ($vid <= 0) {
            return null;
        }

        $vendedor = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($vid)
            ->first();

        if ($vendedor === null) {
            throw ValidationException::withMessages([
                'vendedor_parceiro_id' => ['Vendedor deve pertencer à empresa do contexto.'],
            ]);
        }

        if (! $vendedor->papel_vendedor) {
            throw ValidationException::withMessages([
                'vendedor_parceiro_id' => ['Parceiro informado não tem classificação de vendedor.'],
            ]);
        }

        $situacao = strtoupper(trim((string) ($vendedor->situacao ?? '')));
        if ($situacao !== '' && $situacao !== 'ATIVO') {
            throw ValidationException::withMessages([
                'vendedor_parceiro_id' => ['Vendedor inativo — escolha outro ou reative o cadastro.'],
            ]);
        }

        return $vendedor;
    }
}
