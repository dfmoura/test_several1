<?php

namespace App\Services\Compras;

use RuntimeException;

/**
 * Lê o lote JSON do ADN (contribuintes/DFe) sem avançar NSU sozinho.
 *
 * @phpstan-type Documento array{nsu: string, tipo: string, chave: string, xml: string}
 */
final class NfseAdnLote
{
    /**
     * @param  array<string, mixed>  $data
     * @return array{documentos: list<Documento>, max_nsu: ?string, vazio: bool}
     */
    public function interpretar(array $data, string $ultimoNsu): array
    {
        $status = (string) ($data['StatusProcessamento'] ?? '');
        if ($status === 'REJEICAO') {
            $erros = $data['Erros'] ?? [];
            $msg = 'ADN rejeitou a consulta de NFS-e.';
            if (is_array($erros) && isset($erros[0]) && is_array($erros[0])) {
                $msg = (string) ($erros[0]['Descricao'] ?? $msg);
            }
            throw new RuntimeException($msg);
        }

        $lote = $data['LoteDFe'] ?? [];
        $docs = [];
        if (is_array($lote)) {
            foreach ($lote as $doc) {
                if (! is_array($doc) || ! isset($doc['NSU'], $doc['ArquivoXml'])) {
                    continue;
                }
                $xml = $this->gunzip((string) $doc['ArquivoXml']);
                if ($xml === null) {
                    continue;
                }
                $docs[] = [
                    'nsu' => (string) $doc['NSU'],
                    'tipo' => (string) ($doc['TipoDocumento'] ?? 'NFSE'),
                    'chave' => preg_replace('/\s+/', '', (string) ($doc['ChaveAcesso'] ?? '')) ?: '',
                    'xml' => $xml,
                ];
            }
        }

        $max = null;
        foreach ($docs as $d) {
            if ($max === null || (int) $d['nsu'] > (int) $max) {
                $max = $d['nsu'];
            }
        }

        return [
            'documentos' => $docs,
            'max_nsu' => $max ?? ($status === 'NENHUM_DOCUMENTO_LOCALIZADO' ? $ultimoNsu : $max),
            'vazio' => $docs === [],
        ];
    }

    private function gunzip(string $b64): ?string
    {
        $raw = base64_decode($b64, true);
        if ($raw === false || $raw === '') {
            return null;
        }
        $xml = @gzdecode($raw);

        return is_string($xml) && $xml !== '' ? $xml : null;
    }
}
