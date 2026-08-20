<?php

namespace App\Services\Banking\Asaas;

use App\Models\AsaasAutorizacaoSaque;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Autoriza saques ASAAS em fail-closed: só APPROVED se a instalação registrou a operação.
 * FLEXORC não origina transferência, boleto, QR de débito, recarga nem estorno.
 *
 * @see https://docs.asaas.com/docs/mecanismo-para-validacao-de-saque-via-webhooks
 */
final class AsaasAutorizacaoSaqueService
{
    private const OBJETOS = [
        'TRANSFER' => 'transfer',
        'BILL' => 'bill',
        'PIX_QR_CODE' => 'pixQrCode',
        'MOBILE_PHONE_RECHARGE' => 'mobilePhoneRecharge',
        'PIX_REFUND' => 'pixRefund',
    ];

    /**
     * @param  array<string, mixed>  $payload
     * @return array{status: string, refuseReason?: string}
     */
    public function decidir(array $payload): array
    {
        $tipo = strtoupper(trim((string) ($payload['type'] ?? '')));
        $objetoKey = self::OBJETOS[$tipo] ?? null;
        $objeto = is_array($payload[$objetoKey] ?? null) ? $payload[$objetoKey] : [];
        $ref = isset($objeto['id']) ? (string) $objeto['id'] : null;
        $valor = $this->valorNumerico($objeto['value'] ?? $objeto['netValue'] ?? null);

        $resposta = $this->avaliar($tipo, $ref, $valor);
        $this->registrar($tipo, $ref, $valor, $resposta, $payload);

        return $resposta;
    }

    /**
     * @return array{status: string, refuseReason?: string}
     */
    private function avaliar(string $tipo, ?string $ref, ?string $valor): array
    {
        if ($tipo === '' || ! isset(self::OBJETOS[$tipo])) {
            return $this->recusar('Tipo de operação de saída não reconhecido.');
        }

        if ($ref === null || $ref === '') {
            return $this->recusar('Operação sem identificador.');
        }

        if ($this->saqueRegistradoPelaInstalacao($tipo, $ref, $valor)) {
            return ['status' => 'APPROVED'];
        }

        return $this->recusar('Operação de saída não originada por esta instalação.');
    }

    /**
     * Ponto único para um futuro fluxo de tesouraria: gravar o saque ANTES do POST ASAAS
     * e reconhecer id + valor aqui. Hoje o produto não cria saques — permanece recusa.
     */
    private function saqueRegistradoPelaInstalacao(string $tipo, string $ref, ?string $valor): bool
    {
        unset($tipo, $ref, $valor);

        return false;
    }

    /**
     * @return array{status: string, refuseReason: string}
     */
    private function recusar(string $motivo): array
    {
        return [
            'status' => 'REFUSED',
            'refuseReason' => $motivo,
        ];
    }

    /**
     * @param  array{status: string, refuseReason?: string}  $resposta
     * @param  array<string, mixed>  $payload
     */
    private function registrar(string $tipo, ?string $ref, ?string $valor, array $resposta, array $payload): void
    {
        $decisao = (string) ($resposta['status'] ?? 'REFUSED');
        $motivo = isset($resposta['refuseReason']) ? (string) $resposta['refuseReason'] : null;

        Log::info('asaas.autorizacao_saque', [
            'tipo' => $tipo !== '' ? $tipo : 'DESCONHECIDO',
            'provedor_ref' => $ref,
            'valor' => $valor,
            'decisao' => $decisao,
            'motivo' => $motivo,
        ]);

        try {
            AsaasAutorizacaoSaque::query()->create([
                'tipo' => $tipo !== '' ? $tipo : 'DESCONHECIDO',
                'provedor_ref' => $ref,
                'valor' => $valor,
                'decisao' => $decisao,
                'motivo' => $motivo,
                'payload' => $payload,
            ]);
        } catch (Throwable $e) {
            Log::error('asaas.autorizacao_saque.audit_falhou', ['msg' => $e->getMessage()]);
        }
    }

    private function valorNumerico(mixed $raw): ?string
    {
        if (! is_numeric($raw)) {
            return null;
        }

        return number_format((float) $raw, 2, '.', '');
    }
}
