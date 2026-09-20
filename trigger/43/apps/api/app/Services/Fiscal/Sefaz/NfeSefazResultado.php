<?php

namespace App\Services\Fiscal\Sefaz;

/**
 * Resultado unificado de autorização / consulta / evento SEFAZ.
 *
 * @phpstan-type NfeResultadoArray array{
 *   status: string,
 *   c_stat?: string,
 *   mensagem?: string,
 *   chave?: string,
 *   numero?: int|string|null,
 *   serie?: int|string|null,
 *   protocolo?: string|null,
 *   recibo?: string|null,
 *   xml_nfe?: string|null,
 *   xml_retorno?: string|null,
 *   body?: array<string, mixed>|null,
 *   origem?: string,
 *   http_status?: int
 * }
 */
final class NfeSefazResultado
{
    public const STATUS_AUTORIZADO = 'autorizado';

    public const STATUS_PROCESSANDO = 'processando_autorizacao';

    public const STATUS_REJEITADO = 'rejeitado';

    public const STATUS_ERRO = 'erro';

    public const STATUS_CANCELADO = 'cancelado';

    /**
     * @param  array<string, mixed>|null  $body
     */
    public function __construct(
        public readonly string $status,
        public readonly string $mensagem = '',
        public readonly ?string $cStat = null,
        public readonly ?string $chave = null,
        public readonly int|string|null $numero = null,
        public readonly int|string|null $serie = null,
        public readonly ?string $protocolo = null,
        public readonly ?string $recibo = null,
        public readonly ?string $xmlNfe = null,
        public readonly ?string $xmlRetorno = null,
        public readonly ?array $body = null,
        public readonly int $httpStatus = 200,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'status' => $this->status,
            'status_focus' => $this->status, // compat legado aplicarResultado
            'c_stat' => $this->cStat,
            'mensagem' => $this->mensagem,
            'chave' => $this->chave,
            'numero' => $this->numero,
            'serie' => $this->serie,
            'protocolo' => $this->protocolo,
            'recibo' => $this->recibo,
            'xml_nfe' => $this->xmlNfe,
            'xml_retorno' => $this->xmlRetorno,
            'body' => $this->body ?? [
                'cStat' => $this->cStat,
                'xMotivo' => $this->mensagem,
                'protocolo' => $this->protocolo,
                'chave' => $this->chave,
            ],
            'origem' => 'SEFAZ',
            'http_status' => $this->httpStatus,
        ];
    }
}
