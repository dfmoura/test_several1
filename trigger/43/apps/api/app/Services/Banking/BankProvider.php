<?php

namespace App\Services\Banking;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\Titulo;

/**
 * Contrato interno multi-provider (estudo 32 INTEGRACAO_BANCARIA_MULTI_PROVIDER).
 * Inter = referência de homologação; Sicoob = produção futura.
 */
interface BankProvider
{
    public function nome(): string;

    /**
     * @param  array{
     *   valor: string,
     *   vencimento: string,
     *   pagador_nome?: string|null,
     *   pagador_documento?: string|null,
     *   descricao?: string|null,
     *   idempotency_key: string,
     *   seu_numero?: string|null,
     * }  $dados
     */
    public function emitirCobranca(Empresa $empresa, Titulo $titulo, array $dados): CobrancaEmitidaDto;

    public function consultarCobranca(Empresa $empresa, string $providerRef): CobrancaEmitidaDto;

    public function cancelarCobranca(Empresa $empresa, string $providerRef): CobrancaEmitidaDto;

    /**
     * Normaliza payload do banco → chaves canônicas para baixa.
     *
     * @param  array<string, mixed>  $payload
     * @return array{
     *   event_id: string|null,
     *   provider_ref: string|null,
     *   txid: string|null,
     *   status: string|null,
     *   valor_pago: string|null,
     *   pago_em: string|null,
     * }
     */
    public function parseWebhook(array $payload): array;
}
