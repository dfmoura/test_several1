<?php

namespace App\Services\Fiscal\Dfe;

use RuntimeException;

/**
 * Cliente SOAP NFeDistribuicaoDFe com mTLS (A1 PKCS#12).
 * Autenticação = certificado TLS do destinatário — sem hub Focus.
 */
final class SefazNfeDistribuicaoClient implements DfeDistribuicaoClient
{
    private const SOAP_ACTION = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse';

    public function distNsu(
        string $cnpj,
        string $cUfAutor,
        string $ultNsu,
        string $pfxPath,
        string $senhaPfx,
        int $tpAmb,
    ): DfeDistribuicaoResultado {
        $cnpj = preg_replace('/\D/', '', $cnpj) ?? '';
        if (strlen($cnpj) !== 14) {
            throw new RuntimeException('CNPJ inválido para consulta DF-e.');
        }
        if (! is_file($pfxPath)) {
            throw new RuntimeException('Arquivo temporário do A1 indisponível para DF-e.');
        }

        $stage = $tpAmb === 1 ? 'production' : 'homolog';
        $url = (string) config('erp.dfe.urls.'.$stage);
        if ($url === '') {
            throw new RuntimeException('URL do DF-e não configurada para '.$stage.'.');
        }

        $ult = str_pad(preg_replace('/\D/', '', $ultNsu) ?: '0', 15, '0', STR_PAD_LEFT);
        $distXml = $this->montarDistDfeInt($cnpj, $cUfAutor, $ult, $tpAmb);
        $soap = $this->montarEnvelope($distXml);

        $timeout = max(5, (int) ceil((float) config('erp.dfe.timeout_sec', 45)));

        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Falha ao iniciar HTTP para DF-e.');
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/soap+xml; charset=utf-8; action="'.self::SOAP_ACTION.'"',
            ],
            CURLOPT_POSTFIELDS => $soap,
            CURLOPT_SSLCERT => $pfxPath,
            CURLOPT_SSLCERTPASSWD => $senhaPfx,
            CURLOPT_SSLCERTTYPE => 'P12',
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => min(15, $timeout),
        ]);

        $body = curl_exec($ch);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || ! is_string($body) || $body === '') {
            throw new RuntimeException('Falha de rede no DF-e: '.($err !== '' ? $err : 'resposta vazia'));
        }
        if ($http >= 400) {
            throw new RuntimeException('DF-e HTTP '.$http.'.');
        }

        return $this->parseResposta($body);
    }

    public function consChNFe(
        string $cnpj,
        string $cUfAutor,
        string $chave,
        string $pfxPath,
        string $senhaPfx,
        int $tpAmb,
    ): DfeDistribuicaoResultado {
        $cnpj = preg_replace('/\D/', '', $cnpj) ?? '';
        $chave = preg_replace('/\D/', '', $chave) ?? '';
        if (strlen($cnpj) !== 14 || strlen($chave) !== 44) {
            throw new RuntimeException('CNPJ ou chave inválidos para consChNFe.');
        }
        if (! is_file($pfxPath)) {
            throw new RuntimeException('Arquivo temporário do A1 indisponível para DF-e.');
        }

        $stage = $tpAmb === 1 ? 'production' : 'homolog';
        $url = (string) config('erp.dfe.urls.'.$stage);
        if ($url === '') {
            throw new RuntimeException('URL do DF-e não configurada para '.$stage.'.');
        }

        $cuf = preg_replace('/\D/', '', $cUfAutor) ?: '31';
        $distXml = '<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">'
            .'<tpAmb>'.$tpAmb.'</tpAmb>'
            .'<cUFAutor>'.$cuf.'</cUFAutor>'
            .'<CNPJ>'.$cnpj.'</CNPJ>'
            .'<consChNFe><chNFe>'.$chave.'</chNFe></consChNFe>'
            .'</distDFeInt>';

        $soap = $this->montarEnvelope($distXml);
        $timeout = max(5, (int) ceil((float) config('erp.dfe.timeout_sec', 45)));

        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Falha ao iniciar HTTP para DF-e (consChNFe).');
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/soap+xml; charset=utf-8; action="'.self::SOAP_ACTION.'"',
            ],
            CURLOPT_POSTFIELDS => $soap,
            CURLOPT_SSLCERT => $pfxPath,
            CURLOPT_SSLCERTPASSWD => $senhaPfx,
            CURLOPT_SSLCERTTYPE => 'P12',
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => min(15, $timeout),
        ]);

        $body = curl_exec($ch);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || ! is_string($body) || $body === '') {
            throw new RuntimeException('Falha de rede no DF-e (consChNFe): '.($err !== '' ? $err : 'resposta vazia'));
        }
        if ($http >= 400) {
            throw new RuntimeException('DF-e consChNFe HTTP '.$http.'.');
        }

        return $this->parseResposta($body);
    }

    private function montarDistDfeInt(string $cnpj, string $cUfAutor, string $ultNsu, int $tpAmb): string
    {
        $cuf = preg_replace('/\D/', '', $cUfAutor) ?: '31';

        return '<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">'
            .'<tpAmb>'.$tpAmb.'</tpAmb>'
            .'<cUFAutor>'.$cuf.'</cUFAutor>'
            .'<CNPJ>'.$cnpj.'</CNPJ>'
            .'<distNSU><ultNSU>'.$ultNsu.'</ultNSU></distNSU>'
            .'</distDFeInt>';
    }

    private function montarEnvelope(string $distXml): string
    {
        $escaped = htmlspecialchars($distXml, ENT_XML1 | ENT_QUOTES, 'UTF-8');

        return '<?xml version="1.0" encoding="utf-8"?>'
            .'<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
            .' xmlns:xsd="http://www.w3.org/2001/XMLSchema"'
            .' xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">'
            .'<soap12:Body>'
            .'<nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">'
            .'<nfeDadosMsg>'.$escaped.'</nfeDadosMsg>'
            .'</nfeDistDFeInteresse>'
            .'</soap12:Body>'
            .'</soap12:Envelope>';
    }

    private function parseResposta(string $body): DfeDistribuicaoResultado
    {
        $xml = @simplexml_load_string($body);
        if ($xml === false) {
            throw new RuntimeException('Resposta DF-e não é XML válido.');
        }

        $xml->registerXPathNamespace('soap', 'http://www.w3.org/2003/05/soap-envelope');
        $xml->registerXPathNamespace('ret', 'http://www.portalfiscal.inf.br/nfe');

        $retNodes = $xml->xpath('//ret:retDistDFeInt') ?: $xml->xpath('//*[local-name()="retDistDFeInt"]');
        if ($retNodes === false || $retNodes === []) {
            throw new RuntimeException('Resposta DF-e sem retDistDFeInt.');
        }

        /** @var \SimpleXMLElement $ret */
        $ret = $retNodes[0];
        $cStat = trim((string) ($ret->cStat ?? ''));
        $xMotivo = trim((string) ($ret->xMotivo ?? ''));
        $ultNsu = str_pad(preg_replace('/\D/', '', (string) ($ret->ultNSU ?? '0')) ?: '0', 15, '0', STR_PAD_LEFT);
        $maxNsu = str_pad(preg_replace('/\D/', '', (string) ($ret->maxNSU ?? $ultNsu)) ?: '0', 15, '0', STR_PAD_LEFT);

        $docs = [];
        foreach ($ret->xpath('.//*[local-name()="docZip"]') ?: [] as $docZip) {
            $nsu = str_pad(preg_replace('/\D/', '', (string) ($docZip['NSU'] ?? '')) ?: '0', 15, '0', STR_PAD_LEFT);
            $schema = trim((string) ($docZip['schema'] ?? ''));
            $b64 = trim((string) $docZip);
            if ($b64 === '') {
                continue;
            }
            $bin = base64_decode($b64, true);
            if ($bin === false) {
                continue;
            }
            $xmlDoc = @gzdecode($bin);
            if ($xmlDoc === false || $xmlDoc === '') {
                continue;
            }
            $docs[] = new DfeDocZip($nsu, $schema, $xmlDoc);
        }

        return new DfeDistribuicaoResultado($cStat, $xMotivo, $ultNsu, $maxNsu, $docs);
    }
}
