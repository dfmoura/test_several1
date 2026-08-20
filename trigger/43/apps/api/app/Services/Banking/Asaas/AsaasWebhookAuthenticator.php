<?php

namespace App\Services\Banking\Asaas;

use Illuminate\Http\Request;

/**
 * Token do painel ASAAS (header asaas-access-token). Comparação em tempo constante.
 */
final class AsaasWebhookAuthenticator
{
    public function tokenEventos(): string
    {
        return trim((string) config('erp.asaas.webhook_token', ''));
    }

    public function tokenSaque(): string
    {
        $dedicado = trim((string) config('erp.asaas.saque_webhook_token', ''));

        return $dedicado !== '' ? $dedicado : $this->tokenEventos();
    }

    public function headerConfere(Request $request, string $esperado): bool
    {
        if ($esperado === '') {
            return false;
        }

        $recebido = (string) $request->header('asaas-access-token', '');

        return hash_equals($esperado, $recebido);
    }
}
