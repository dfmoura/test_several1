<?php

namespace App\Services\Fiscal\Sefaz;

use RuntimeException;

/**
 * Cliente SOAP real — NFeAutorizacao4 / NFeRetAutorizacao4 / NFeRecepcaoEvento4.
 */
final class SefazNfeClient implements NfeSefazClient
{
    public function __construct(
        private readonly SefazNfeSoapClient $soap,
        private readonly SefazNfeUrlResolver $urls,
    ) {}

    public function autorizar(string $uf, int $tpAmb, string $xmlNfeAssinado, array $cert): NfeSefazResultado
    {
        $urls = $this->urls->urls($uf, $tpAmb);
        $idLote = str_pad((string) random_int(1, 999999999999999), 15, '0', STR_PAD_LEFT);
        $enviNFe = '<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">'
            .'<idLote>'.$idLote.'</idLote><indSinc>1</indSinc>'
            .$this->stripDecl($xmlNfeAssinado)
            .'</enviNFe>';

        $ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4';
        $envelope = $this->soap->envelope($enviNFe, $ns);
        $resp = $this->soap->post(
            $urls['autorizacao'],
            $ns.'/nfeAutorizacaoLote',
            $envelope,
            $cert
        );

        return $this->parseAutorizacao($resp, $tpAmb, $xmlNfeAssinado);
    }

    public function consultarRecibo(string $uf, int $tpAmb, string $recibo, array $cert, ?string $xmlNfeAssinado = null): NfeSefazResultado
    {
        $urls = $this->urls->urls($uf, $tpAmb);
        $cons = '<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">'
            .'<tpAmb>'.$tpAmb.'</tpAmb><nRec>'.$this->esc($recibo).'</nRec></consReciNFe>';
        $ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4';
        $envelope = $this->soap->envelope($cons, $ns);
        $resp = $this->soap->post(
            $urls['ret_autorizacao'],
            $ns.'/nfeRetAutorizacaoLote',
            $envelope,
            $cert
        );

        return $this->parseAutorizacao($resp, $tpAmb, $xmlNfeAssinado);
    }

    public function enviarEvento(string $uf, int $tpAmb, string $xmlEventoAssinado, array $cert): NfeSefazResultado
    {
        $urls = $this->urls->urls($uf, $tpAmb);
        $idLote = str_pad((string) random_int(1, 999999999999999), 15, '0', STR_PAD_LEFT);
        $envEvento = '<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">'
            .'<idLote>'.$idLote.'</idLote>'
            .$this->stripDecl($xmlEventoAssinado)
            .'</envEvento>';
        $ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4';
        $envelope = $this->soap->envelope($envEvento, $ns);
        $resp = $this->soap->post(
            $urls['evento'],
            $ns.'/nfeRecepcaoEvento',
            $envelope,
            $cert
        );

        return $this->parseEvento($resp);
    }

    private function parseAutorizacao(string $resp, int $tpAmb, ?string $xmlNfeAssinado = null): NfeSefazResultado
    {
        $cStat = $this->tag($resp, 'cStat') ?? '';
        $xMotivo = $this->tag($resp, 'xMotivo') ?? '';
        $recibo = $this->tag($resp, 'nRec');
        $chave = $this->tag($resp, 'chNFe');
        $prot = $this->tag($resp, 'nProt');

        // 100 = autorizado; 104 = lote processado com prot; 103/105 = em processamento
        if (in_array($cStat, ['100', '150'], true) || ($cStat === '104' && $prot !== null)) {
            $protCStat = $this->tag($resp, 'cStat', 1) ?? $cStat;
            // Prefer inner prot cStat when present
            if (preg_match_all('/<cStat>(\d+)<\/cStat>/', $resp, $all) && count($all[1]) > 1) {
                $protCStat = $all[1][count($all[1]) - 1];
            }
            if (in_array($protCStat, ['100', '150'], true) || $cStat === '100') {
                $serie = $chave ? (int) substr($chave, 22, 3) : null;
                $numero = $chave ? (int) substr($chave, 25, 9) : null;
                $nfeProc = $this->montarNfeProc($resp, $xmlNfeAssinado);

                return new NfeSefazResultado(
                    status: NfeSefazResultado::STATUS_AUTORIZADO,
                    mensagem: $xMotivo !== '' ? $xMotivo : 'Autorizado o uso da NF-e',
                    cStat: $protCStat,
                    chave: $chave,
                    numero: $numero,
                    serie: $serie,
                    protocolo: $prot,
                    recibo: $recibo,
                    xmlNfe: $nfeProc,
                    xmlRetorno: $resp,
                    body: ['cStat' => $protCStat, 'xMotivo' => $xMotivo, 'raw' => mb_substr($resp, 0, 4000)],
                );
            }
        }

        if (in_array($cStat, ['103', '105'], true) || ($recibo !== null && $prot === null && $cStat === '104')) {
            return new NfeSefazResultado(
                status: NfeSefazResultado::STATUS_PROCESSANDO,
                mensagem: $xMotivo !== '' ? $xMotivo : 'Lote em processamento',
                cStat: $cStat,
                recibo: $recibo,
                xmlRetorno: $resp,
                body: ['cStat' => $cStat, 'xMotivo' => $xMotivo, 'nRec' => $recibo],
            );
        }

        if ($cStat === '') {
            return new NfeSefazResultado(
                status: NfeSefazResultado::STATUS_ERRO,
                mensagem: 'Resposta SEFAZ sem cStat',
                xmlRetorno: $resp,
                httpStatus: 502,
                body: ['raw' => mb_substr($resp, 0, 4000)],
            );
        }

        return new NfeSefazResultado(
            status: NfeSefazResultado::STATUS_REJEITADO,
            mensagem: $xMotivo !== '' ? $xMotivo : 'Rejeição SEFAZ '.$cStat,
            cStat: $cStat,
            chave: $chave,
            recibo: $recibo,
            xmlRetorno: $resp,
            body: ['cStat' => $cStat, 'xMotivo' => $xMotivo],
        );
    }

    private function parseEvento(string $resp): NfeSefazResultado
    {
        $cStat = $this->tag($resp, 'cStat') ?? '';
        // Eventos: 135/136 ok
        if (preg_match_all('/<cStat>(\d+)<\/cStat>/', $resp, $all) && count($all[1]) > 1) {
            $cStat = $all[1][count($all[1]) - 1];
        }
        $xMotivo = $this->tag($resp, 'xMotivo') ?? '';
        if (preg_match_all('/<xMotivo>([^<]*)<\/xMotivo>/', $resp, $m) && count($m[1]) > 1) {
            $xMotivo = html_entity_decode($m[1][count($m[1]) - 1], ENT_XML1 | ENT_QUOTES, 'UTF-8');
        }
        $prot = $this->tag($resp, 'nProt');
        $chave = $this->tag($resp, 'chNFe');
        $tp = $this->tag($resp, 'tpEvento');

        if (in_array($cStat, ['135', '136', '155'], true)) {
            $status = $tp === '110111'
                ? NfeSefazResultado::STATUS_CANCELADO
                : NfeSefazResultado::STATUS_AUTORIZADO;

            return new NfeSefazResultado(
                status: $status,
                mensagem: $xMotivo,
                cStat: $cStat,
                chave: $chave,
                protocolo: $prot,
                xmlRetorno: $resp,
                body: ['cStat' => $cStat, 'xMotivo' => $xMotivo, 'tpEvento' => $tp],
            );
        }

        if ($cStat === '') {
            throw new RuntimeException('Resposta de evento SEFAZ sem cStat.');
        }

        return new NfeSefazResultado(
            status: NfeSefazResultado::STATUS_REJEITADO,
            mensagem: $xMotivo !== '' ? $xMotivo : 'Evento rejeitado '.$cStat,
            cStat: $cStat,
            chave: $chave,
            xmlRetorno: $resp,
            body: ['cStat' => $cStat, 'xMotivo' => $xMotivo],
        );
    }

    private function montarNfeProc(string $resp, ?string $xmlNfeAssinado = null): ?string
    {
        $nfeXml = null;
        if (is_string($xmlNfeAssinado) && $xmlNfeAssinado !== '') {
            if (preg_match('/<(?:\w+:)?NFe\b[^>]*>.*?<\/(?:\w+:)?NFe>/s', $xmlNfeAssinado, $nfe)) {
                $nfeXml = $nfe[0];
            }
        }
        if ($nfeXml === null && preg_match('/<(?:\w+:)?NFe\b[^>]*>.*?<\/(?:\w+:)?NFe>/s', $resp, $nfe)) {
            $nfeXml = $nfe[0];
        }
        if ($nfeXml === null) {
            return null;
        }
        if (! preg_match('/<(?:\w+:)?protNFe\b[^>]*>.*?<\/(?:\w+:)?protNFe>/s', $resp, $prot)) {
            return null;
        }

        return '<?xml version="1.0" encoding="UTF-8"?>'
            .'<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">'
            .$this->stripDecl($nfeXml).$prot[0]
            .'</nfeProc>';
    }

    private function tag(string $xml, string $name, int $index = 0): ?string
    {
        if (! preg_match_all('/<(?:\w+:)?'.$name.'>([^<]*)<\/(?:\w+:)?'.$name.'>/', $xml, $m)) {
            return null;
        }

        return isset($m[1][$index]) ? html_entity_decode($m[1][$index], ENT_XML1 | ENT_QUOTES, 'UTF-8') : null;
    }

    private function stripDecl(string $xml): string
    {
        $xml = preg_replace('/<\?xml[^?]*\?>\s*/', '', $xml) ?? $xml;
        $xml = preg_replace('/>\s+</', '><', $xml) ?? $xml;
        $xml = preg_replace("/[\r\n\t]/", '', $xml) ?? $xml;

        return $xml;
    }

    private function esc(string $s): string
    {
        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
