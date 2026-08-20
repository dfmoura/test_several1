<?php

namespace App\Services\Banking;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\Titulo;
use App\Support\PadraoDecimal;

/**
 * Provider local/CI — gera EMV/copia-e-cola determinístico sem chamar banco.
 */
final class MockBankProvider implements BankProvider
{
    public function nome(): string
    {
        return 'mock';
    }

    public function emitirCobranca(Empresa $empresa, Titulo $titulo, array $dados): CobrancaEmitidaDto
    {
        $txid = $this->txidFromKey((string) $dados['idempotency_key']);
        $valor = PadraoDecimal::parseStrict($dados['valor'], PadraoDecimal::SCALE_MONEY) ?? '0.00';
        $nome = (string) ($dados['pagador_nome'] ?? $empresa->nome_fantasia ?? $empresa->razao_social ?? 'FLEXOERP');
        $emv = $this->buildEmvCopiaCola($txid, $valor, $nome);

        return new CobrancaEmitidaDto(
            providerRef: 'MOCK-'.$txid,
            txid: $txid,
            pixCopiaCola: $emv,
            pixQrBase64: $this->placeholderQrPng(),
            linhaDigitavel: null,
            pdfUrl: null,
            status: Cobranca::STATUS_REGISTRADA,
            raw: ['mock' => true, 'txid' => $txid],
        );
    }

    public function consultarCobranca(Empresa $empresa, string $providerRef): CobrancaEmitidaDto
    {
        return new CobrancaEmitidaDto(
            providerRef: $providerRef,
            txid: str_starts_with($providerRef, 'MOCK-') ? substr($providerRef, 5) : $providerRef,
            pixCopiaCola: null,
            pixQrBase64: null,
            linhaDigitavel: null,
            pdfUrl: null,
            status: Cobranca::STATUS_REGISTRADA,
        );
    }

    public function cancelarCobranca(Empresa $empresa, string $providerRef): CobrancaEmitidaDto
    {
        return new CobrancaEmitidaDto(
            providerRef: $providerRef,
            txid: null,
            pixCopiaCola: null,
            pixQrBase64: null,
            linhaDigitavel: null,
            pdfUrl: null,
            status: Cobranca::STATUS_CANCELADA,
        );
    }

    public function parseWebhook(array $payload): array
    {
        $statusRaw = strtoupper((string) ($payload['status'] ?? $payload['situacao'] ?? ''));
        $status = match ($statusRaw) {
            'PAGO', 'PAGA', 'RECEBIDO', 'CONCLUIDA', 'LIQUIDADO' => Cobranca::STATUS_PAGA,
            'CANCELADO', 'CANCELADA' => Cobranca::STATUS_CANCELADA,
            default => $statusRaw !== '' ? $statusRaw : null,
        };

        $valor = $payload['valor'] ?? $payload['valorPago'] ?? $payload['valor_pago'] ?? null;

        return [
            'event_id' => isset($payload['event_id'])
                ? (string) $payload['event_id']
                : (isset($payload['id']) ? (string) $payload['id'] : null),
            'provider_ref' => isset($payload['provider_ref'])
                ? (string) $payload['provider_ref']
                : (isset($payload['codigoSolicitacao']) ? (string) $payload['codigoSolicitacao'] : null),
            'txid' => isset($payload['txid']) ? (string) $payload['txid'] : null,
            'status' => $status,
            'valor_pago' => $valor !== null ? (string) $valor : null,
            'pago_em' => isset($payload['pago_em'])
                ? (string) $payload['pago_em']
                : (isset($payload['dataHoraSituacao']) ? substr((string) $payload['dataHoraSituacao'], 0, 10) : null),
        ];
    }

    private function txidFromKey(string $key): string
    {
        return 'M'.substr(hash('sha256', $key), 0, 26);
    }

    private function buildEmvCopiaCola(string $txid, string $valor, string $nome): string
    {
        $nome = mb_substr(preg_replace('/[^A-Za-z0-9 ]/', '', $nome) ?: 'RECEBEDOR', 0, 25);
        $cidade = 'BELO HORIZONTE';
        $txid = substr(preg_replace('/[^A-Za-z0-9]/', '', $txid) ?: 'TXID', 0, 25);

        $merchant = $this->tlv('00', 'BR.GOV.BCB.PIX').$this->tlv('01', 'flexoerp-mock@local');
        $add = $this->tlv('05', $txid);

        $payload = '000201'
            .$this->tlv('26', $merchant)
            .'52040000'
            .'5303986'
            .$this->tlv('54', $valor)
            .'5802BR'
            .$this->tlv('59', $nome)
            .$this->tlv('60', $cidade)
            .$this->tlv('62', $add)
            .'6304';

        return $payload.strtoupper(sprintf('%04X', $this->crc16($payload)));
    }

    private function tlv(string $id, string $value): string
    {
        return $id.str_pad((string) strlen($value), 2, '0', STR_PAD_LEFT).$value;
    }

    private function crc16(string $payload): int
    {
        $crc = 0xFFFF;
        $len = strlen($payload);
        for ($i = 0; $i < $len; $i++) {
            $crc ^= (ord($payload[$i]) << 8);
            for ($b = 0; $b < 8; $b++) {
                $crc = ($crc & 0x8000)
                    ? (($crc << 1) ^ 0x1021) & 0xFFFF
                    : ($crc << 1) & 0xFFFF;
            }
        }

        return $crc;
    }

    private function placeholderQrPng(): string
    {
        return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    }
}
