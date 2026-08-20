<?php

namespace App\Services\Fiscal;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;

/**
 * Autorização sintética para completar o fluxo ERP sem A1/Focus.
 * Não gera XML nfeProc. Chave/número levam origem STUB e protocolo SIM-.
 */
final class FiscalEmissorStub
{
    /**
     * @return array<string, mixed>
     */
    public function autorizar(Empresa $empresa, DocumentoFiscalSaida $doc): array
    {
        $numero = random_int(800000000, 899999999);
        $serie = $doc->tipo === DocumentoFiscalSaida::TIPO_NFSE
            ? FiscalSaidaDefaults::SERIE_DPS
            : FiscalSaidaDefaults::SERIE_NFE;
        $protocolo = 'SIM-'.strtoupper(bin2hex(random_bytes(8)));

        if ($doc->tipo === DocumentoFiscalSaida::TIPO_NFSE) {
            $chave = 'SIMNFSE'.strtoupper(bin2hex(random_bytes(10)));
        } else {
            $chave = NfeChaveAcesso::montar([
                'uf' => (string) ($empresa->uf ?: 'MG'),
                'cnpj' => (string) ($empresa->cnpj ?: '00000000000000'),
                'modelo' => '55',
                'serie' => $serie,
                'numero' => $numero,
                'tipo_emissao' => 9,
                'codigo_numerico' => random_int(0, 99999999),
            ]);
        }

        $body = [
            'status' => 'autorizado',
            'chave' => $chave,
            'numero' => $numero,
            'serie' => $serie,
            'protocolo' => $protocolo,
            'mensagem' => 'Autorização de teste — sem certificado A1, sem valor fiscal.',
            'origem' => DocumentoFiscalSaida::ORIGEM_STUB,
            'ref' => $doc->ref,
        ];

        return [
            'ok' => true,
            'status_focus' => 'autorizado',
            'http_status' => 200,
            'chave' => $chave,
            'numero' => (string) $numero,
            'serie' => (string) $serie,
            'protocolo' => $protocolo,
            'mensagem' => $body['mensagem'],
            'origem' => DocumentoFiscalSaida::ORIGEM_STUB,
            'body' => $body,
        ];
    }
}
