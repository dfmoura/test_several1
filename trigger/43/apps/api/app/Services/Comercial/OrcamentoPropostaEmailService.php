<?php

namespace App\Services\Comercial;

use App\Mail\OrcamentoPropostaMail;
use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Envio transacional da proposta (ADR_ORC_EMAIL_PROPOSTA).
 * Motor = MAIL_* da instalação; Reply-To = empresas.email; destino = cadastro.
 */
class OrcamentoPropostaEmailService
{
    /**
     * @param  array{
     *   parceiro_contato_id: int|null,
     *   nome: string,
     *   funcao: string|null,
     *   canal: string,
     *   destino: string,
     *   legado?: bool,
     *   email?: string|null
     * }  $destinatario
     * @return array{enviado: bool, destino: string|null, motivo: string|null}
     */
    public function tentarEnviarAposLink(
        Orcamento $orcamento,
        Empresa $empresa,
        string $url,
        array $destinatario,
        ?string $expiraEmIso,
    ): array {
        if (! filter_var(config('erp.orcamento_email_auto', true), FILTER_VALIDATE_BOOL)) {
            return ['enviado' => false, 'destino' => null, 'motivo' => 'desligado'];
        }

        $destino = $this->resolverEmailDestino($orcamento, $destinatario);
        if ($destino === null) {
            return ['enviado' => false, 'destino' => null, 'motivo' => 'sem_email_cadastro'];
        }

        $replyTo = $this->emailValido($empresa->email);
        $expiraLabel = null;
        if ($expiraEmIso) {
            try {
                $expiraLabel = \Carbon\Carbon::parse($expiraEmIso)->format('d/m/Y');
            } catch (Throwable) {
                $expiraLabel = null;
            }
        }

        try {
            Mail::to($destino)->send(new OrcamentoPropostaMail(
                orcamento: $orcamento,
                empresa: $empresa,
                url: $url,
                destinatarioNome: (string) ($destinatario['nome'] ?? 'Cliente'),
                expiraEmLabel: $expiraLabel,
                replyToAddress: $replyTo,
            ));

            return ['enviado' => true, 'destino' => $destino, 'motivo' => null];
        } catch (Throwable $e) {
            Log::warning('orcamento.proposta_email_falhou', [
                'orcamento_id' => $orcamento->id,
                'empresa_id' => $empresa->id,
                'destino' => $destino,
                'erro' => $e->getMessage(),
            ]);

            return ['enviado' => false, 'destino' => $destino, 'motivo' => 'falha_envio'];
        }
    }

    /**
     * @param  array<string, mixed>  $destinatario
     */
    public function resolverEmailDestino(Orcamento $orcamento, array $destinatario): ?string
    {
        $direto = $this->emailValido($destinatario['email'] ?? null);
        if ($direto !== null) {
            return $direto;
        }

        if (($destinatario['canal'] ?? '') === 'EMAIL') {
            $viaCanal = $this->emailValido($destinatario['destino'] ?? null);
            if ($viaCanal !== null) {
                return $viaCanal;
            }
        }

        $contatoId = isset($destinatario['parceiro_contato_id'])
            ? (int) $destinatario['parceiro_contato_id']
            : 0;
        if ($contatoId > 0) {
            $contato = ParceiroContato::query()->find($contatoId);
            $viaContato = $this->emailValido($contato?->email);

            return $viaContato;
        }

        $parceiro = Parceiro::query()->find($orcamento->parceiro_id);

        return $this->emailValido($parceiro?->email);
    }

    private function emailValido(mixed $email): ?string
    {
        $mail = trim((string) $email);
        if ($mail === '' || ! filter_var($mail, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return $mail;
    }
}
