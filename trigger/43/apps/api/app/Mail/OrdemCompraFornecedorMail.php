<?php

namespace App\Mail;

use App\Models\Empresa;
use App\Models\OrdemCompra;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Ordem de compra ao fornecedor (ADR_OC_RASCUNHO_ENVIO).
 * From = instalação; Reply-To = e-mail comercial da EMP quando válido.
 */
class OrdemCompraFornecedorMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public readonly OrdemCompra $ordemCompra,
        public readonly Empresa $empresa,
        public readonly string $destinatarioNome,
        public readonly ?string $replyToAddress,
        public readonly array $payload,
    ) {}

    public function envelope(): Envelope
    {
        $nomeEmpresa = $this->empresa->nome_fantasia ?: $this->empresa->razao_social ?: 'Ordem de compra';
        $assunto = 'Ordem de compra '.$this->ordemCompra->codigo.' — '.$nomeEmpresa;

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
            view: 'mail.ordem-compra-fornecedor',
            text: 'mail.ordem-compra-fornecedor-text',
            with: array_merge($this->payload, [
                'primeiroNome' => $primeiro,
                'nomeEmpresa' => $nomeEmpresa,
                'codigo' => $this->ordemCompra->codigo,
                'replyToAddress' => $this->replyToAddress,
            ]),
        );
    }
}
