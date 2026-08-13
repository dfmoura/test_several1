<?php

namespace App\Services\Financeiro;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Titulo;
use App\Models\WebhookInbox;
use App\Services\Banking\BankProviderResolver;
use Illuminate\Validation\ValidationException;

/**
 * Inbox idempotente de webhooks bancários → BX (UC-FIN-003).
 */
class WebhookBancarioService
{
    public function __construct(
        private readonly BankProviderResolver $banks,
        private readonly TituloService $titulos,
        private readonly AdiantamentoService $adiantamento,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function ingest(string $provider, array $payload, ?int $empresaIdHint = null): array
    {
        $provider = strtolower(trim($provider));
        $hash = hash('sha256', $provider.'|'.json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        $existing = WebhookInbox::query()
            ->where('provider', $provider)
            ->where('payload_hash', $hash)
            ->first();

        if ($existing !== null) {
            return [
                'resultado' => 'DUPLICADO',
                'mensagem' => 'Webhook já processado.',
                'inbox_id' => $existing->id,
                'titulo_baixa_id' => $existing->titulo_baixa_id,
            ];
        }

        $bank = $this->banks->resolve($provider === 'inter' ? 'inter' : ($provider === 'mock' ? 'mock' : $provider));
        $parsed = $bank->parseWebhook($payload);

        $inbox = WebhookInbox::query()->create([
            'empresa_id' => $empresaIdHint,
            'provider' => $provider,
            'event_id' => $parsed['event_id'],
            'payload_hash' => $hash,
            'payload' => $payload,
            'resultado' => null,
        ]);

        try {
            if (($parsed['status'] ?? null) !== Cobranca::STATUS_PAGA) {
                $inbox->update([
                    'resultado' => 'IGNORADO',
                    'mensagem' => 'Evento sem status PAGA.',
                    'processado_em' => now(),
                ]);

                return ['resultado' => 'IGNORADO', 'inbox_id' => $inbox->id];
            }

            $cob = $this->findCobranca($provider, $parsed, $empresaIdHint);
            if ($cob === null) {
                $inbox->update([
                    'resultado' => 'ERRO',
                    'mensagem' => 'Cobrança não encontrada para o webhook.',
                    'processado_em' => now(),
                ]);

                return ['resultado' => 'ERRO', 'mensagem' => 'Cobrança não encontrada.', 'inbox_id' => $inbox->id];
            }

            $titulo = $cob->titulo;
            $empresa = Empresa::query()->findOrFail($cob->empresa_id);
            app()->instance('empresa', $empresa);

            if ($titulo->status === Titulo::STATUS_QUITADO) {
                $cob->status = Cobranca::STATUS_PAGA;
                $cob->save();
                $this->adiantamento->liberarSeAdiantamentoQuitado($titulo);
                $inbox->update([
                    'empresa_id' => $empresa->id,
                    'cobranca_id' => $cob->id,
                    'resultado' => 'PROCESSADO',
                    'mensagem' => 'Título já quitado.',
                    'processado_em' => now(),
                ]);

                return ['resultado' => 'PROCESSADO', 'inbox_id' => $inbox->id, 'ja_quitado' => true];
            }

            $contaId = $cob->empresa_conta_financeira_id
                ?? EmpresaContaFinanceira::query()
                    ->where('empresa_id', $empresa->id)
                    ->where('ativa', true)
                    ->orderByDesc('principal')
                    ->value('id');

            if (! $contaId) {
                throw ValidationException::withMessages([
                    'conta_financeira_id' => ['Sem conta financeira para baixar o recebimento.'],
                ]);
            }

            $valorPago = $parsed['valor_pago'] ?? (string) $titulo->saldo;
            $pagoEm = $parsed['pago_em'] ?? now()->toDateString();

            $out = $this->titulos->baixar($empresa, $titulo, [
                'conta_financeira_id' => (int) $contaId,
                'valor' => $valorPago,
                'pago_em' => $pagoEm,
                'forma' => 'PIX',
                'observacao' => 'Baixa automática webhook '.$provider,
            ], permitirReceber: true);

            $baixaId = $out['baixa']['id'] ?? null;
            $cob->status = Cobranca::STATUS_PAGA;
            $cob->save();

            $titulo->refresh();
            $this->adiantamento->liberarSeAdiantamentoQuitado($titulo);

            $inbox->update([
                'empresa_id' => $empresa->id,
                'cobranca_id' => $cob->id,
                'titulo_baixa_id' => $baixaId,
                'resultado' => 'PROCESSADO',
                'mensagem' => 'Baixa registrada.',
                'processado_em' => now(),
            ]);

            return [
                'resultado' => 'PROCESSADO',
                'inbox_id' => $inbox->id,
                'titulo_baixa_id' => $baixaId,
                'titulo_codigo' => $titulo->codigo,
            ];
        } catch (\Throwable $e) {
            $inbox->update([
                'resultado' => 'ERRO',
                'mensagem' => mb_substr($e->getMessage(), 0, 500),
                'processado_em' => now(),
            ]);

            throw $e;
        }
    }

    /**
     * @param  array{provider_ref: ?string, txid: ?string}  $parsed
     */
    private function findCobranca(string $provider, array $parsed, ?int $empresaIdHint): ?Cobranca
    {
        $q = Cobranca::query()->with('titulo');
        if ($empresaIdHint) {
            $q->where('empresa_id', $empresaIdHint);
        }

        if (! empty($parsed['provider_ref'])) {
            $found = (clone $q)->where('provider_ref', $parsed['provider_ref'])->orderByDesc('id')->first();
            if ($found) {
                return $found;
            }
        }

        if (! empty($parsed['txid'])) {
            return (clone $q)->where('txid', $parsed['txid'])->orderByDesc('id')->first();
        }

        return null;
    }
}
