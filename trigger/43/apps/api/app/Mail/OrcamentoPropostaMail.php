<?php

namespace App\Mail;

use App\Models\Empresa;
use App\Models\Orcamento;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Proposta comercial — link de aprovação (ADR_ORC_EMAIL_PROPOSTA).
 * From = instalação; Reply-To = e-mail comercial da EMP quando válido.
 */
class OrcamentoPropostaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Orcamento $orcamento,
        public readonly Empresa $empresa,
        public readonly string $url,
        public readonly string $destinatarioNome,
        public readonly ?string $expiraEmLabel,
        public readonly ?string $replyToAddress,
    ) {}

    public function envelope(): Envelope
    {
        $nomeEmpresa = $this->empresa->nome_fantasia ?: $this->empresa->razao_social ?: 'Proposta';
        $assunto = 'Proposta '.$this->orcamento->codigo.' v'.$this->orcamento->versao.' — '.$nomeEmpresa;

        $replyTo = [];
        if ($this->replyToAddress !== null && $this->replyToAddress !== '') {
            $replyTo[] = new Address($this->replyToAddress, $nomeEmpresa);
        }

        return new Envelope(
            subject: $assunto,
            replyTo: $replyTo,
        );
    }

    public function content(): Content
    {
        $nomeEmpresa = $this->empresa->nome_fantasia ?: $this->empresa->razao_social ?: 'nossa empresa';
        $primeiro = explode(' ', trim($this->destinatarioNome))[0] ?: $this->destinatarioNome;

        return new Content(
            view: 'mail.orcamento-proposta',
            text: 'mail.orcamento-proposta-text',
            with: [
                'primeiroNome' => $primeiro,
                'nomeEmpresa' => $nomeEmpresa,
                'codigo' => $this->orcamento->codigo,
                'versao' => $this->orcamento->versao,
                'url' => $this->url,
                'expiraEmLabel' => $this->expiraEmLabel,
                'replyToAddress' => $this->replyToAddress,
            ],
        );
    }
}
