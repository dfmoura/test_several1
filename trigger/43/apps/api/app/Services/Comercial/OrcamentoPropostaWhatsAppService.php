<?php

namespace App\Services\Comercial;

use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Envio transacional da proposta via ViaZap (ADR_ORC_WHATSAPP_VIAZAP).
 * Motor = VIAZAP_* da instalação; destino = WhatsApp do cadastro.
 */
class OrcamentoPropostaWhatsAppService
{
    /**
     * @param  array{
     *   parceiro_contato_id: int|null,
     *   nome: string,
     *   funcao: string|null,
     *   canal: string,
     *   destino: string,
     *   legado?: bool,
     *   whatsapp?: string|null
     * }  $destinatario
     * @return array{enviado: bool, destino: string|null, motivo: string|null}
     */
    public function tentarEnviarAposLink(
        Orcamento $orcamento,
        array $destinatario,
        string $mensagem,
    ): array {
        if (! filter_var(config('erp.orcamento_whatsapp_auto', true), FILTER_VALIDATE_BOOL)) {
            return ['enviado' => false, 'destino' => null, 'motivo' => 'desligado'];
        }

        if (! $this->viazapConfigurado()) {
            return ['enviado' => false, 'destino' => null, 'motivo' => 'desligado'];
        }

        $destino = $this->resolverWhatsAppDestino($orcamento, $destinatario);
        if ($destino === null) {
            return ['enviado' => false, 'destino' => null, 'motivo' => 'sem_whatsapp_cadastro'];
        }

        $baseUrl = rtrim((string) config('erp.viazap.base_url'), '/');
        $token = (string) config('erp.viazap.token');
        $timeout = max(3, (int) config('erp.viazap.timeout_sec', 10));

        try {
            $response = Http::timeout($timeout)
                ->withToken($token)
                ->acceptJson()
                ->post($baseUrl.'/v1/messages', [
                    'external_id' => (string) $orcamento->codigo,
                    'to' => $destino,
                    'type' => 'text',
                    'body' => $mensagem,
                ]);

            if (! $response->successful()) {
                Log::warning('orcamento.proposta_whatsapp_falhou', [
                    'orcamento_id' => $orcamento->id,
                    'empresa_id' => $orcamento->empresa_id,
                    'destino' => $destino,
                    'status' => $response->status(),
                    'erro' => $response->body(),
                ]);

                return ['enviado' => false, 'destino' => $destino, 'motivo' => 'falha_envio'];
            }

            return ['enviado' => true, 'destino' => $destino, 'motivo' => null];
        } catch (Throwable $e) {
            Log::warning('orcamento.proposta_whatsapp_falhou', [
                'orcamento_id' => $orcamento->id,
                'empresa_id' => $orcamento->empresa_id,
                'destino' => $destino,
                'erro' => $e->getMessage(),
            ]);

            return ['enviado' => false, 'destino' => $destino, 'motivo' => 'falha_envio'];
        }
    }

    /**
     * @param  array<string, mixed>  $destinatario
     */
    public function resolverWhatsAppDestino(Orcamento $orcamento, array $destinatario): ?string
    {
        $direto = $this->normalizarTelefone($destinatario['whatsapp'] ?? null);
        if ($direto !== null) {
            return $direto;
        }

        if (($destinatario['canal'] ?? '') === 'WHATSAPP') {
            $viaCanal = $this->normalizarTelefone($destinatario['destino'] ?? null);
            if ($viaCanal !== null) {
                return $viaCanal;
            }
        }

        $contatoId = isset($destinatario['parceiro_contato_id'])
            ? (int) $destinatario['parceiro_contato_id']
            : 0;
        if ($contatoId > 0) {
            $contato = ParceiroContato::query()->find($contatoId);

            return $this->normalizarTelefone($contato?->whatsapp);
        }

        $parceiro = Parceiro::query()->find($orcamento->parceiro_id);

        return $this->normalizarTelefone($parceiro?->whatsapp);
    }

    public function viazapConfigurado(): bool
    {
        $baseUrl = trim((string) config('erp.viazap.base_url', ''));
        $token = trim((string) config('erp.viazap.token', ''));

        return $baseUrl !== '' && $token !== '';
    }

    private function normalizarTelefone(mixed $telefone): ?string
    {
        $n = preg_replace('/\D+/', '', (string) $telefone) ?: '';
        if (strlen($n) < 10) {
            return null;
        }

        // BR sem DDI → assume 55 (cadastro costuma vir sem país).
        if (strlen($n) <= 11) {
            $n = '55'.$n;
        }

        return $n;
    }
}
