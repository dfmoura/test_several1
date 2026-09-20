<?php

namespace App\Services\Fiscal\Sefaz;

use DOMDocument;
use DOMElement;
use DOMXPath;
use RuntimeException;

/**
 * Assinatura XML-DSig enveloped (RSA-SHA1 + C14N inclusivo) com A1 PKCS#12.
 * Algoritmo declarado = C14N calculado (REC-xml-c14n-20010315).
 */
final class NfeXmlSigner
{
    private const DSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';

    private const C14N_ALG = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';

    /**
     * @param  array{path: string, senha: string}  $cert
     */
    public function assinarNfe(string $xml, array $cert): string
    {
        return $this->assinar($xml, 'infNFe', $cert);
    }

    /**
     * @param  array{path: string, senha: string}  $cert
     */
    public function assinarEvento(string $xml, array $cert): string
    {
        return $this->assinar($xml, 'infEvento', $cert);
    }

    /**
     * @param  array{path: string, senha: string}  $cert
     */
    private function assinar(string $xml, string $tagId, array $cert): string
    {
        $certs = [];
        if (! openssl_pkcs12_read((string) file_get_contents($cert['path']), $certs, $cert['senha'])) {
            throw new RuntimeException('Não foi possível ler o A1 para assinar a NF-e.');
        }
        $pkey = openssl_pkey_get_private($certs['pkey'] ?? '');
        $x509 = $certs['cert'] ?? '';
        if ($pkey === false || $x509 === '') {
            throw new RuntimeException('Chave/certificado A1 inválidos para assinatura.');
        }

        $doc = new DOMDocument('1.0', 'UTF-8');
        $doc->preserveWhiteSpace = false;
        $doc->formatOutput = false;
        if (! @$doc->loadXML($xml)) {
            throw new RuntimeException('XML inválido para assinatura.');
        }

        $root = $doc->documentElement;
        if (! $root instanceof DOMElement) {
            throw new RuntimeException('XML sem elemento raiz.');
        }

        $xpath = new DOMXPath($doc);
        $nodes = $xpath->query('//*[local-name()="'.$tagId.'"]');
        if ($nodes === false || $nodes->length < 1) {
            throw new RuntimeException('Elemento '.$tagId.' não encontrado para assinar.');
        }
        /** @var DOMElement $inf */
        $inf = $nodes->item(0);
        $id = $inf->getAttribute('Id');
        if ($id === '') {
            throw new RuntimeException('Atributo Id ausente em '.$tagId.'.');
        }

        // C14N inclusivo — mesmo Algorithm declarado nas Transforms
        $canonical = $inf->C14N(false, false);
        if ($canonical === false || $canonical === '') {
            throw new RuntimeException('Falha ao canonicalizar '.$tagId.'.');
        }
        $digest = base64_encode(hash('sha1', $canonical, true));

        $signature = $doc->createElementNS(self::DSIG_NS, 'Signature');
        $signedInfo = $doc->createElementNS(self::DSIG_NS, 'SignedInfo');

        $c14nMethod = $doc->createElementNS(self::DSIG_NS, 'CanonicalizationMethod');
        $c14nMethod->setAttribute('Algorithm', self::C14N_ALG);
        $signedInfo->appendChild($c14nMethod);

        $sigMethod = $doc->createElementNS(self::DSIG_NS, 'SignatureMethod');
        $sigMethod->setAttribute('Algorithm', self::DSIG_NS.'rsa-sha1');
        $signedInfo->appendChild($sigMethod);

        $reference = $doc->createElementNS(self::DSIG_NS, 'Reference');
        $reference->setAttribute('URI', '#'.$id);

        $transforms = $doc->createElementNS(self::DSIG_NS, 'Transforms');
        $t1 = $doc->createElementNS(self::DSIG_NS, 'Transform');
        $t1->setAttribute('Algorithm', self::DSIG_NS.'enveloped-signature');
        $transforms->appendChild($t1);
        $t2 = $doc->createElementNS(self::DSIG_NS, 'Transform');
        $t2->setAttribute('Algorithm', self::C14N_ALG);
        $transforms->appendChild($t2);
        $reference->appendChild($transforms);

        $digestMethod = $doc->createElementNS(self::DSIG_NS, 'DigestMethod');
        $digestMethod->setAttribute('Algorithm', self::DSIG_NS.'sha1');
        $reference->appendChild($digestMethod);

        $digestValue = $doc->createElementNS(self::DSIG_NS, 'DigestValue', $digest);
        $reference->appendChild($digestValue);
        $signedInfo->appendChild($reference);

        $signature->appendChild($signedInfo);
        // Assinar com SignedInfo já na árvore (xmlns em escopo para C14N inclusivo)
        $root->appendChild($signature);

        $siCanon = $signedInfo->C14N(false, false);
        if ($siCanon === false || $siCanon === '') {
            throw new RuntimeException('Falha ao canonicalizar SignedInfo.');
        }
        $rawSig = '';
        if (! openssl_sign($siCanon, $rawSig, $pkey, OPENSSL_ALGO_SHA1)) {
            throw new RuntimeException('Falha ao assinar SignedInfo.');
        }
        $sigValue = $doc->createElementNS(self::DSIG_NS, 'SignatureValue', base64_encode($rawSig));
        $signature->appendChild($sigValue);

        $keyInfo = $doc->createElementNS(self::DSIG_NS, 'KeyInfo');
        $x509Data = $doc->createElementNS(self::DSIG_NS, 'X509Data');
        $pem = preg_replace('/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/', '', $x509) ?? '';
        $x509Cert = $doc->createElementNS(self::DSIG_NS, 'X509Certificate', $pem);
        $x509Data->appendChild($x509Cert);
        $keyInfo->appendChild($x509Data);
        $signature->appendChild($keyInfo);

        $out = $doc->saveXML($doc->documentElement);
        if ($out === false) {
            throw new RuntimeException('Falha ao serializar XML assinado.');
        }
        // cStat 588 — sem whitespace entre tags / sem declaração XML solta
        $out = preg_replace('/>\s+</', '><', $out) ?? $out;
        $out = preg_replace("/[\r\n\t]/", '', $out) ?? $out;

        return '<?xml version="1.0" encoding="UTF-8"?>'.$out;
    }
}
