<?php

namespace App\Services\Plataforma;

use Illuminate\Validation\ValidationException;

/**
 * Segregação de funções (SoD) — ORGANIZACAO_USUARIOS_PERFIS_ACESSO.txt §4.
 * Impede acumular pares incompatíveis no mesmo usuário.
 */
class RoleSodValidator
{
    /** @var list<array{0: string, 1: string, 2: string}> */
    private const INCOMPATIBLE_PAIRS = [
        ['ADMIN', 'FINANCEIRO', 'ADMIN não deve operar rotina financeira — use um segundo usuário operacional.'],
        ['ADMIN', 'FISCAL', 'ADMIN não deve operar rotina fiscal — use um segundo usuário operacional.'],
        ['ADMIN', 'COMERCIAL', 'ADMIN não deve operar rotina comercial — use um segundo usuário operacional.'],
        ['ADMIN', 'COMPRAS', 'ADMIN não deve operar rotina de compras — use um segundo usuário operacional.'],
        ['ADMIN', 'PRODUCAO', 'ADMIN não deve operar rotina de produção — use um segundo usuário operacional.'],
        ['ADMIN', 'EXPEDICAO', 'ADMIN não deve operar rotina de expedição — use um segundo usuário operacional.'],
        ['COMERCIAL', 'FINANCEIRO', 'Quem emite pedido de venda não pode alterar limite de crédito (mesmo usuário).'],
        ['COMPRAS', 'FINANCEIRO', 'Quem cadastra fornecedor não deve acumular liberação financeira no mesmo login.'],
    ];

    /**
     * @param  list<string>  $roles
     */
    public function assertCompatible(array $roles): void
    {
        $normalized = array_values(array_unique(array_map('strval', $roles)));

        if ($normalized === []) {
            throw ValidationException::withMessages([
                'roles' => ['Selecione ao menos um perfil de acesso.'],
            ]);
        }

        $set = array_fill_keys($normalized, true);

        if (isset($set['PLATAFORMA']) && count($normalized) > 1) {
            throw ValidationException::withMessages([
                'roles' => ['Segregação de funções: PLATAFORMA não combina com perfis da conta FLEXORC.'],
            ]);
        }

        foreach (self::INCOMPATIBLE_PAIRS as [$a, $b, $message]) {
            if (isset($set[$a], $set[$b])) {
                throw ValidationException::withMessages([
                    'roles' => ["Segregação de funções: {$message}"],
                ]);
            }
        }
    }
}
