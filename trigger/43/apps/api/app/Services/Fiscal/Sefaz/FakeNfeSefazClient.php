<?php

namespace App\Services\Fiscal\Sefaz;

use App\Services\Fiscal\NfeChaveAcesso;

/**
 * Driver de ensaio/teste — autoriza e registra eventos sem falar com SEFAZ.
 */
final class FakeNfeSefazClient implements NfeSefazClient
{
    public function autorizar(string $uf, int $tpAmb, string $xmlNfeAssinado, array $cert): NfeSefazResultado
    {
        $chave = $this->extrairChave($xmlNfeAssinado) ?? $this->chaveFake($uf);
        $serie = (int) substr($chave, 22, 3);
        $numero = (int) substr($chave, 25, 9);
        $prot = 'FAKE'.str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT);
        $nfeProc = '<?xml version="1.0" encoding="UTF-8"?>'
            .'<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">'
            .$this->stripXmlDecl($xmlNfeAssinado)
            .'<protNFe versao="4.00"><infProt>'
            .'<tpAmb>'.$tpAmb.'</tpAmb><verAplic>FAKE</verAplic>'
            .'<chNFe>'.$chave.'</chNFe><dhRecbto>'.now()->toIso8601String().'</dhRecbto>'
            .'<nProt>'.$prot.'</nProt><digVal>fake</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e (fake)</xMotivo>'
            .'</infProt></protNFe></nfeProc>';

        return new NfeSefazResultado(
            status: NfeSefazResultado::STATUS_AUTORIZADO,
            mensagem: 'Autorizado o uso da NF-e (fake)',
            cStat: '100',
            chave: $chave,
            numero: $numero,
            serie: $serie,
            protocolo: $prot,
            xmlNfe: $nfeProc,
            xmlRetorno: $nfeProc,
            body: ['cStat' => '100', 'xMotivo' => 'Autorizado o uso da NF-e (fake)', 'fake' => true],
        );
    }

    public function consultarRecibo(string $uf, int $tpAmb, string $recibo, array $cert, ?string $xmlNfeAssinado = null): NfeSefazResultado
    {
        return new NfeSefazResultado(
            status: NfeSefazResultado::STATUS_PROCESSANDO,
            mensagem: 'Recibo fake ainda em processamento',
            cStat: '105',
            recibo: $recibo,
        );
    }

    public function enviarEvento(string $uf, int $tpAmb, string $xmlEventoAssinado, array $cert): NfeSefazResultado
    {
        $tp = '110111';
        if (preg_match('/<tpEvento>(\d+)<\/tpEvento>/', $xmlEventoAssinado, $m)) {
            $tp = $m[1];
        }
        $chave = null;
        if (preg_match('/<chNFe>(\d{44})<\/chNFe>/', $xmlEventoAssinado, $m)) {
            $chave = $m[1];
        }
        $cStat = $tp === '110110' ? '135' : '135';
        $prot = 'EVT'.str_pad((string) random_int(1, 999999999), 9, '0', STR_PAD_LEFT);
        $msg = $tp === '110110'
            ? 'Evento registrado e vinculado a NF-e (fake CC-e)'
            : 'Evento registrado e vinculado a NF-e (fake cancelamento)';

        return new NfeSefazResultado(
            status: $tp === '110111' ? NfeSefazResultado::STATUS_CANCELADO : NfeSefazResultado::STATUS_AUTORIZADO,
            mensagem: $msg,
            cStat: $cStat,
            chave: $chave,
            protocolo: $prot,
            xmlRetorno: $xmlEventoAssinado,
            body: ['cStat' => $cStat, 'xMotivo' => $msg, 'tpEvento' => $tp, 'fake' => true],
        );
    }

    private function extrairChave(string $xml): ?string
    {
        if (preg_match('/Id="NFe(\d{44})"/', $xml, $m)) {
            return $m[1];
        }
        if (preg_match('/<chNFe>(\d{44})<\/chNFe>/', $xml, $m)) {
            return $m[1];
        }

        return null;
    }

    private function chaveFake(string $uf): string
    {
        return NfeChaveAcesso::montar([
            'uf' => $uf,
            'cnpj' => '01423183000110',
            'serie' => 1,
            'numero' => random_int(1, 99999),
            'tipo_emissao' => 1,
            'codigo_numerico' => random_int(1, 99999999),
        ]);
    }

    private function stripXmlDecl(string $xml): string
    {
        return preg_replace('/<\?xml[^?]*\?>\s*/', '', $xml) ?? $xml;
    }
}
