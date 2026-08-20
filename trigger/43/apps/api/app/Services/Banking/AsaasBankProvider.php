<?php

namespace App\Services\Banking;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\EmpresaBankCredential;
use App\Models\Titulo;
use App\Services\Banking\Asaas\AsaasClient;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * BankProvider ASAAS — PIX do sinal (cliente da gráfica → EMP).
 * Contrato interno intacto (estudo 32). Credencial por EMP ou chave da instalação.
 */
final class AsaasBankProvider implements BankProvider
{
    public function __construct(
        private readonly AsaasClient $client,
    ) {}

    public function nome(): string
    {
        return 'asaas';
    }

    public function emitirCobranca(Empresa $empresa, Titulo $titulo, array $dados): CobrancaEmitidaDto
    {
        $this->assertHabilitado($empresa);

        $customerId = $this->garantirPagador($dados);
        $valor = (float) (PadraoDecimal::parseStrict((string) $dados['valor'], PadraoDecimal::SCALE_MONEY) ?? '0.00');
        $body = [
            'customer' => $customerId,
            'billingType' => 'PIX',
            'value' => $valor,
            'dueDate' => $dados['vencimento'],
            'description' => mb_substr((string) ($dados['descricao'] ?? $titulo->codigo), 0, 500),
            'externalReference' => (string) ($dados['idempotency_key'] ?? $titulo->codigo),
        ];

        $res = $this->client->post('payments', $body, (string) ($dados['idempotency_key'] ?? $titulo->id));
        $paymentId = (string) ($res['id'] ?? '');
        if ($paymentId === '') {
            throw new RuntimeException('ASAAS não devolveu o id da cobrança PIX.');
        }

        $pix = [];
        try {
            $pix = $this->client->get('payments/'.$paymentId.'/pixQrCode');
        } catch (\Throwable $e) {
            Log::warning('asaas.pix_qr.falha', ['payment' => $paymentId, 'msg' => $e->getMessage()]);
        }

        return new CobrancaEmitidaDto(
            providerRef: $paymentId,
            txid: isset($pix['payload']) ? substr(hash('sha256', (string) $pix['payload']), 0, 25) : ($res['pixTransaction'] ?? null ? (string) $res['pixTransaction'] : null),
            pixCopiaCola: isset($pix['payload']) ? (string) $pix['payload'] : null,
            pixQrBase64: $this->qrBase64($pix),
            linhaDigitavel: null,
            pdfUrl: isset($res['invoiceUrl']) ? (string) $res['invoiceUrl'] : null,
            status: Cobranca::STATUS_REGISTRADA,
            raw: ['payment' => $res, 'pix' => $pix],
        );
    }

    public function consultarCobranca(Empresa $empresa, string $providerRef): CobrancaEmitidaDto
    {
        $this->assertHabilitado($empresa);
        $res = $this->client->get('payments/'.$providerRef);
        $status = $this->statusCanonic((string) ($res['status'] ?? ''));

        return new CobrancaEmitidaDto(
            providerRef: $providerRef,
            txid: isset($res['pixTransaction']) ? (string) $res['pixTransaction'] : null,
            pixCopiaCola: null,
            pixQrBase64: null,
            linhaDigitavel: null,
            pdfUrl: isset($res['invoiceUrl']) ? (string) $res['invoiceUrl'] : null,
            status: $status,
            raw: $res,
        );
    }

    public function cancelarCobranca(Empresa $empresa, string $providerRef): CobrancaEmitidaDto
    {
        $this->assertHabilitado($empresa);
        $res = $this->client->post('payments/'.$providerRef.'/cancel', []);

        return new CobrancaEmitidaDto(
            providerRef: $providerRef,
            txid: null,
            pixCopiaCola: null,
            pixQrBase64: null,
            linhaDigitavel: null,
            pdfUrl: null,
            status: Cobranca::STATUS_CANCELADA,
            raw: $res,
        );
    }

    public function parseWebhook(array $payload): array
    {
        $payment = is_array($payload['payment'] ?? null) ? $payload['payment'] : $payload;
        $statusRaw = strtoupper((string) ($payment['status'] ?? $payload['event'] ?? ''));
        $status = $this->statusCanonic($statusRaw);
        if (str_contains($statusRaw, 'PAYMENT_RECEIVED') || str_contains($statusRaw, 'PAYMENT_CONFIRMED')) {
            $status = Cobranca::STATUS_PAGA;
        }

        $valor = $payment['value'] ?? $payment['netValue'] ?? null;
        $pagoEm = $payment['clientPaymentDate'] ?? $payment['confirmedDate'] ?? $payment['paymentDate'] ?? null;

        return [
            'event_id' => isset($payload['id'])
                ? (string) $payload['id']
                : (isset($payment['id']) ? (string) $payment['id'] : null),
            'provider_ref' => isset($payment['id']) ? (string) $payment['id'] : null,
            'txid' => isset($payment['pixTransaction']) ? (string) $payment['pixTransaction'] : null,
            'status' => $status,
            'valor_pago' => $valor !== null ? (string) $valor : null,
            'pago_em' => $pagoEm !== null ? substr((string) $pagoEm, 0, 10) : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $dados
     */
    private function garantirPagador(array $dados): string
    {
        $doc = preg_replace('/\D/', '', (string) ($dados['pagador_documento'] ?? '')) ?: '00000000000';
        $res = $this->client->post('customers', [
            'name' => (string) ($dados['pagador_nome'] ?? 'Cliente'),
            'cpfCnpj' => $doc,
            'notificationDisabled' => true,
        ], 'pagador-'.$doc);

        $id = (string) ($res['id'] ?? '');
        if ($id === '') {
            throw new RuntimeException('ASAAS não devolveu o pagador do PIX.');
        }

        return $id;
    }

    private function assertHabilitado(Empresa $empresa): void
    {
        if ($this->client->habilitado()) {
            return;
        }

        $cred = EmpresaBankCredential::query()
            ->where('empresa_id', $empresa->id)
            ->where('provider', 'asaas')
            ->where('ativo', true)
            ->first();

        if ($cred && $cred->client_secret_cipher) {
            return;
        }

        throw new RuntimeException(
            'ASAAS não configurado para esta empresa. Use BANK_PROVIDER=mock ou informe ASAAS_API_KEY.',
        );
    }

    private function statusCanonic(string $raw): string
    {
        $raw = strtoupper($raw);

        return match (true) {
            str_contains($raw, 'RECEIVED'), str_contains($raw, 'CONFIRMED'), str_contains($raw, 'PAID') => Cobranca::STATUS_PAGA,
            str_contains($raw, 'CANCEL') => Cobranca::STATUS_CANCELADA,
            str_contains($raw, 'OVERDUE') => Cobranca::STATUS_VENCIDA,
            default => Cobranca::STATUS_REGISTRADA,
        };
    }

    /**
     * @param  array<string, mixed>  $pix
     */
    private function qrBase64(array $pix): ?string
    {
        $img = $pix['encodedImage'] ?? null;
        if (! is_string($img) || $img === '') {
            return null;
        }

        return preg_replace('/^data:image\/[a-zA-Z]+;base64,/', '', $img) ?: $img;
    }
}
