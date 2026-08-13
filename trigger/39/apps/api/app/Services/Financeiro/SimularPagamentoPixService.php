<?php

namespace App\Services\Financeiro;

use App\Models\Cobranca;
use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Models\Titulo;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Simula confirmação de PIX no fluxo real (webhook mock → BX → libera ORC).
 * Só para COB provider=mock (demo/homolog). Produção Inter usa webhook bancário.
 */
class SimularPagamentoPixService
{
    public function __construct(
        private readonly WebhookBancarioService $webhooks,
        private readonly AdiantamentoService $adiantamento,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function simularPeloToken(string $token): array
    {
        $token = trim($token);
        $link = OrcamentoLinkAprovacao::query()
            ->with(['orcamento.empresa', 'orcamento.adiantamentoTitulo.cobrancas'])
            ->where('token', $token)
            ->first();

        if ($link === null || $link->orcamento === null || $link->orcamento->trashed()) {
            throw new HttpException(404, 'Link inválido.');
        }

        $orcamento = $link->orcamento;
        if ($orcamento->status !== Orcamento::STATUS_APROVADO) {
            throw new HttpException(409, 'Orçamento ainda não foi aprovado.');
        }

        if ($orcamento->financeiro_status === AdiantamentoService::FIN_LIBERADO) {
            return [
                'ok' => true,
                'ja_pago' => true,
                'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
                'status_exibicao' => 'APROVADO',
                'mensagem' => 'Pagamento já confirmado.',
                'adiantamento' => $this->adiantamento->dtoPublico($orcamento),
            ];
        }

        if ($orcamento->financeiro_status !== AdiantamentoService::FIN_AGUARDA_ADIANTAMENTO) {
            throw new HttpException(409, 'Este orçamento não está aguardando pagamento.');
        }

        $titulo = $orcamento->adiantamentoTitulo;
        if ($titulo === null) {
            throw new HttpException(409, 'Título de adiantamento não encontrado.');
        }

        $cob = $titulo->cobrancas->sortByDesc('id')->first();
        if ($cob === null) {
            throw new HttpException(409, 'Cobrança PIX não encontrada.');
        }

        if ($cob->provider !== 'mock') {
            throw new HttpException(403, 'Simulação disponível apenas com BankProvider mock (demo). Em produção o banco confirma o PIX.');
        }

        if ($orcamento->empresa) {
            app()->instance('empresa', $orcamento->empresa);
        }

        $this->webhooks->ingest('mock', [
            'event_id' => 'sim-'.uniqid('', true),
            'provider_ref' => $cob->provider_ref,
            'txid' => $cob->txid,
            'status' => Cobranca::STATUS_PAGA,
            'valor' => (string) $titulo->saldo,
            'pago_em' => now()->toDateString(),
        ], $orcamento->empresa_id);

        $orcamento->refresh();
        $titulo->refresh();

        return [
            'ok' => true,
            'ja_pago' => false,
            'financeiro_status' => $orcamento->financeiro_status,
            'status_exibicao' => 'APROVADO',
            'mensagem' => 'Pagamento confirmado. Orçamento aprovado.',
            'adiantamento' => $this->adiantamento->dtoPublico(
                $orcamento->fresh(['empresa', 'adiantamentoTitulo.cobrancas'])
            ),
            'titulo_status' => $titulo->status,
        ];
    }
}
