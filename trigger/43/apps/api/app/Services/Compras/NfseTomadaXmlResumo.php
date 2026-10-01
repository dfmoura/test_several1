<?php

namespace App\Services\Compras;

use DOMDocument;
use DOMXPath;

/**
 * Metadados da NFS-e recebida para a lista local — sem reler o XML no GET.
 */
final class NfseTomadaXmlResumo
{
    /**
     * @return array{numero: ?string, data_emissao: ?string, emit_cnpj: ?string, emit_nome: ?string, valor_total: ?string}
     */
    public function ler(string $xml): array
    {
        $doc = new DOMDocument('1.0', 'UTF-8');
        if (! @$doc->loadXML($xml)) {
            return $this->vazio();
        }
        $xp = new DOMXPath($doc);
        $cnpj = $this->texto($xp, '//*[local-name()="prest"]/*[local-name()="CNPJ"]')
            ?: $this->texto($xp, '//*[local-name()="emit"]/*[local-name()="CNPJ"]')
            ?: $this->texto($xp, '//*[local-name()="prest"]/*[local-name()="CPF"]')
            ?: $this->texto($xp, '//*[local-name()="emit"]/*[local-name()="CPF"]');
        $nome = $this->texto($xp, '//*[local-name()="emit"]/*[local-name()="xNome"]')
            ?: $this->texto($xp, '//*[local-name()="prest"]/*[local-name()="xNome"]');
        $valor = $this->texto($xp, '//*[local-name()="vServ"]')
            ?: $this->texto($xp, '//*[local-name()="vLiq"]');
        $numero = $this->texto($xp, '//*[local-name()="nNFSe"]')
            ?: $this->texto($xp, '//*[local-name()="nDPS"]');
        $dh = $this->texto($xp, '//*[local-name()="dhEmi"]')
            ?: $this->texto($xp, '//*[local-name()="dhProc"]');
        $data = null;
        if (is_string($dh) && strlen($dh) >= 10) {
            $data = substr($dh, 0, 10);
        }

        return [
            'numero' => $numero !== '' ? mb_substr($numero, 0, 20) : null,
            'data_emissao' => $data,
            'emit_cnpj' => $this->documento($cnpj),
            'emit_nome' => $nome !== '' ? mb_substr($nome, 0, 160) : null,
            'valor_total' => $valor !== '' && is_numeric($valor) ? number_format((float) $valor, 2, '.', '') : null,
        ];
    }

    /**
     * @return array{numero: null, data_emissao: null, emit_cnpj: null, emit_nome: null, valor_total: null}
     */
    private function vazio(): array
    {
        return [
            'numero' => null,
            'data_emissao' => null,
            'emit_cnpj' => null,
            'emit_nome' => null,
            'valor_total' => null,
        ];
    }

    private function documento(string $valor): ?string
    {
        $digits = preg_replace('/\D/', '', $valor) ?: '';
        if (strlen($digits) !== 14 && strlen($digits) !== 11) {
            return null;
        }

        return $digits;
    }

    private function texto(DOMXPath $xp, string $query): string
    {
        $nodes = $xp->query($query);
        if ($nodes === false || $nodes->length < 1) {
            return '';
        }

        return trim((string) $nodes->item(0)?->textContent);
    }
}
