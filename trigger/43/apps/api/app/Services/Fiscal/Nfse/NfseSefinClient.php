<?php

namespace App\Services\Fiscal\Nfse;

use App\Models\Empresa;
use RuntimeException;

/**
 * POST síncrono da DPS compactada na SEFIN Nacional (mTLS A1).
 */
final class NfseSefinClient
{
    public function baseUrl(): string
    {
        $prod = NfseCanal::producao();

        return rtrim((string) ($prod
            ? config('erp.nfse.sefin_production')
            : config('erp.nfse.sefin_homolog')), '/');
    }

    /**
     * @param  array{path: string, senha: string}  $cert
     * @return array{http: int, body: array<string, mixed>, raw: string}
     */
    public function emitir(string $dpsXml, array $cert): array
    {
        if (! is_file($cert['path'] ?? '')) {
            throw new RuntimeException('Arquivo temporário do A1 indisponível para a SEFIN.');
        }

        $gzip = gzencode($dpsXml);
        if ($gzip === false) {
            throw new RuntimeException('Falha ao compactar a DPS.');
        }
        $json = json_encode(['dpsXmlGZipB64' => base64_encode($gzip)], JSON_UNESCAPED_UNICODE);
        $url = $this->baseUrl().'/nfse';
        $timeout = max(5, (int) ceil((float) config('erp.nfse.timeout_sec', 60)));

        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Falha ao iniciar HTTP para a SEFIN.');
        }
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_SSLCERT => $cert['path'],
            CURLOPT_SSLCERTPASSWD => $cert['senha'],
            CURLOPT_SSLCERTTYPE => 'P12',
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => min(20, $timeout),
        ]);
        $resp = curl_exec($ch);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || ! is_string($resp)) {
            throw new RuntimeException('Falha de rede na SEFIN: '.($err !== '' ? $err : 'resposta vazia'));
        }

        $body = json_decode($resp, true);

        return [
            'http' => $http,
            'body' => is_array($body) ? $body : [],
            'raw' => $resp,
        ];
    }

    /**
     * POST /nfse/{chave}/eventos — pedido de registro (cancelamento e101101).
     *
     * @param  array{path: string, senha: string}  $cert
     * @return array{http: int, body: array<string, mixed>, raw: string}
     */
    public function registrarEvento(string $chave, string $pedidoXml, array $cert, bool $producao): array
    {
        if (! is_file($cert['path'] ?? '')) {
            throw new RuntimeException('Arquivo temporário do A1 indisponível para a SEFIN.');
        }
        $gzip = gzencode($pedidoXml);
        if ($gzip === false) {
            throw new RuntimeException('Falha ao compactar o pedido de evento.');
        }
        $json = json_encode(
            ['pedidoRegistroEventoXmlGZipB64' => base64_encode($gzip)],
            JSON_UNESCAPED_UNICODE
        );
        $base = rtrim((string) ($producao
            ? config('erp.nfse.sefin_production')
            : config('erp.nfse.sefin_homolog')), '/');
        $url = $base.'/nfse/'.$chave.'/eventos';
        $timeout = max(5, (int) ceil((float) config('erp.nfse.timeout_sec', 60)));

        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Falha ao iniciar HTTP para a SEFIN.');
        }
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_SSLCERT => $cert['path'],
            CURLOPT_SSLCERTPASSWD => $cert['senha'],
            CURLOPT_SSLCERTTYPE => 'P12',
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => min(20, $timeout),
        ]);
        $resp = curl_exec($ch);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || ! is_string($resp)) {
            throw new RuntimeException('Falha de rede na SEFIN: '.($err !== '' ? $err : 'resposta vazia'));
        }

        $body = json_decode($resp, true);

        return [
            'http' => $http,
            'body' => is_array($body) ? $body : [],
            'raw' => $resp,
        ];
    }
}
