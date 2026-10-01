<?php

namespace App\Services\Cadastros;

use RuntimeException;

/**
 * Monta o certificado que a SEFAZ vê no mTLS.
 * Ordem: folha, intermediárias e, no fim, a raiz que emitiu a última AC.
 * O autorizador de MG (homologação) recusa com cStat 283 se o caminho
 * para na intermediária e a raiz ICP-Brasil não vem junto.
 */
final class EmpresaCertificadoA1Cadeia
{
    /**
     * @return array{
     *   cert_pem: string,
     *   key_pem: string,
     *   intermediarios: int,
     *   raizes_omitidas: int,
     *   incompleta: bool
     * }
     */
    public function resumir(string $pfxBytes, string $senha): array
    {
        $certs = [];
        if (! @openssl_pkcs12_read($pfxBytes, $certs, $senha) || empty($certs['cert']) || empty($certs['pkey'])) {
            throw new RuntimeException('Não foi possível ler o A1 para montar a cadeia.');
        }

        $leaf = $this->pem((string) $certs['cert']);
        $key = $this->pem((string) $certs['pkey']);
        $folha = openssl_x509_parse($leaf);
        if ($folha === false) {
            throw new RuntimeException('Certificado A1 ilegível ao montar a cadeia.');
        }

        $fpFolha = strtolower((string) openssl_x509_fingerprint($leaf, 'sha256'));
        $pool = [];
        $raizes = [];
        foreach ($certs['extracerts'] ?? [] as $extra) {
            if (! is_string($extra) || trim($extra) === '') {
                continue;
            }
            $pem = $this->pem($extra);
            $parsed = openssl_x509_parse($pem);
            if ($parsed === false) {
                continue;
            }
            $fp = strtolower((string) openssl_x509_fingerprint($pem, 'sha256'));
            if ($fp !== '' && $fp === $fpFolha) {
                continue;
            }
            $item = ['pem' => $pem, 'parsed' => $parsed];
            if ($this->mesmoDn($parsed['subject'] ?? [], $parsed['issuer'] ?? [])) {
                $raizes[] = $item;

                continue;
            }
            $pool[] = $item;
        }

        $enviados = [$leaf];
        $atual = $folha;
        for ($guard = 0; $guard < 6; $guard++) {
            $idx = $this->indiceDoEmissor($atual, $pool);
            if ($idx === null) {
                break;
            }
            $enviados[] = $pool[$idx]['pem'];
            $atual = $pool[$idx]['parsed'];
            array_splice($pool, $idx, 1);
        }

        $raizIdx = $this->indiceDoEmissor($atual, $raizes);
        $raizesOmitidas = count($raizes);
        if ($raizIdx !== null) {
            $enviados[] = $raizes[$raizIdx]['pem'];
            $raizesOmitidas--;
        }

        $auto = $this->mesmoDn($folha['subject'] ?? [], $folha['issuer'] ?? []);

        return [
            'cert_pem' => implode('', $enviados),
            'key_pem' => $key,
            'intermediarios' => max(0, count($enviados) - 1 - ($raizIdx !== null ? 1 : 0)),
            'raizes_omitidas' => $raizesOmitidas,
            'incompleta' => ! $auto && count($enviados) < 2,
        ];
    }

    /**
     * @param  array<string, mixed>  $atual
     * @param  list<array{pem: string, parsed: array<string, mixed>}>  $pool
     */
    private function indiceDoEmissor(array $atual, array $pool): ?int
    {
        $aki = $this->aki($atual);
        if ($aki !== '') {
            foreach ($pool as $i => $item) {
                if ($this->ski($item['parsed']) === $aki) {
                    return $i;
                }
            }
        }

        $issuer = is_array($atual['issuer'] ?? null) ? $atual['issuer'] : [];
        foreach ($pool as $i => $item) {
            $subject = $item['parsed']['subject'] ?? [];
            if ($this->mesmoDn(is_array($subject) ? $subject : [], $issuer)) {
                return $i;
            }
        }

        return null;
    }

    /** @param  array<string, mixed>  $parsed */
    private function ski(array $parsed): string
    {
        $ext = is_array($parsed['extensions'] ?? null) ? $parsed['extensions'] : [];
        $ski = (string) ($ext['subjectKeyIdentifier'] ?? '');

        return strtoupper(preg_replace('/[^0-9A-F]/i', '', $ski) ?? '');
    }

    /** @param  array<string, mixed>  $parsed */
    private function aki(array $parsed): string
    {
        $ext = is_array($parsed['extensions'] ?? null) ? $parsed['extensions'] : [];
        $aki = (string) ($ext['authorityKeyIdentifier'] ?? '');
        if (preg_match('/keyid:([0-9A-F:]+)/i', $aki, $m) !== 1) {
            return '';
        }

        return strtoupper(preg_replace('/[^0-9A-F]/i', '', $m[1]) ?? '');
    }

    /** @param  array<string, mixed>  $a @param  array<string, mixed>  $b */
    private function mesmoDn(array $a, array $b): bool
    {
        $ca = $this->dnCanonico($a);
        $cb = $this->dnCanonico($b);

        return $ca !== '' && $ca === $cb;
    }

    /** @param  array<string, mixed>  $dn */
    private function dnCanonico(array $dn): string
    {
        $norm = [];
        foreach ($dn as $k => $v) {
            $vals = [];
            if (is_array($v)) {
                foreach ($v as $item) {
                    if (is_scalar($item)) {
                        $vals[] = mb_strtolower(trim((string) $item));
                    }
                }
            } elseif (is_scalar($v)) {
                $vals[] = mb_strtolower(trim((string) $v));
            }
            sort($vals);
            $norm[mb_strtolower((string) $k)] = $vals;
        }
        ksort($norm);
        $json = json_encode($norm);

        return is_string($json) ? $json : '';
    }

    private function pem(string $raw): string
    {
        $raw = trim($raw);

        return $raw === '' ? '' : $raw."\n";
    }
}
