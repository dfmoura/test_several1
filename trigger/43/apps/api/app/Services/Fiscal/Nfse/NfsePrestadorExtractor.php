<?php

namespace App\Services\Fiscal\Nfse;

use DOMDocument;
use DOMElement;
use DOMXPath;
use InvalidArgumentException;

/**
 * Prestador da NFS-e nacional (infNFSe/emit e DPS/prest).
 * Não lê NF-e modelo 55 — a chave e o endereço seguem o layout nacional.
 */
final class NfsePrestadorExtractor
{
    /**
     * @return array{
     *   chave_nfse: ?string,
     *   emit: array<string, mixed>,
     *   dest_cnpj: ?string,
     *   dest_cpf: ?string,
     *   cfop_entrada_sugerido: null,
     *   transportadora: null
     * }
     */
    public function extrair(string $xmlContent): array
    {
        $trimmed = trim($xmlContent);
        if ($trimmed === '') {
            throw new InvalidArgumentException('XML da NFS-e vazio.');
        }

        $doc = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $ok = $doc->loadXML($trimmed, LIBXML_NONET | LIBXML_COMPACT);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        if ($ok === false) {
            throw new InvalidArgumentException('XML da NFS-e malformado.');
        }

        $xp = new DOMXPath($doc);
        $prest = $this->primeiro($xp, '//*[local-name()="prest"]');
        $emitNode = $this->primeiro($xp, '//*[local-name()="infNFSe"]/*[local-name()="emit"]');
        if ($prest === null && $emitNode === null) {
            throw new InvalidArgumentException('XML da NFS-e sem prestador.');
        }

        $cnpj = $this->digits($this->filho($xp, $prest, 'CNPJ') ?: $this->filho($xp, $emitNode, 'CNPJ'));
        $cpf = $this->digits($this->filho($xp, $prest, 'CPF') ?: $this->filho($xp, $emitNode, 'CPF'));
        $documento = (is_string($cnpj) && strlen($cnpj) === 14)
            ? $cnpj
            : ((is_string($cpf) && strlen($cpf) === 11) ? $cpf : null);
        if ($documento === null) {
            throw new InvalidArgumentException('Prestador sem CNPJ ou CPF no XML da NFS-e.');
        }

        $nome = $this->filho($xp, $emitNode, 'xNome') ?: $this->filho($xp, $prest, 'xNome');
        $fantasia = $this->filho($xp, $emitNode, 'xFant') ?: $this->filho($xp, $prest, 'xFant');
        $ender = $this->endereco($xp, $emitNode) ?? $this->endereco($xp, $prest);
        $fone = $this->digits($this->filho($xp, $emitNode, 'fone') ?: $this->filho($xp, $prest, 'fone'));
        $ie = $this->filho($xp, $emitNode, 'IE') ?: $this->filho($xp, $prest, 'IE');

        $toma = $this->primeiro($xp, '//*[local-name()="toma"]');
        $destCnpj = $this->digits($this->filho($xp, $toma, 'CNPJ'));
        $destCpf = $this->digits($this->filho($xp, $toma, 'CPF'));

        return [
            'chave_nfse' => $this->chave($xp),
            'emit' => [
                'cnpj_cpf' => $documento,
                'tipo_pessoa' => strlen($documento) === 14 ? 'PJ' : 'PF',
                'razao_social' => $nome !== '' ? $nome : null,
                'nome_fantasia' => $fantasia !== '' ? $fantasia : null,
                'ie' => $ie !== '' ? $ie : null,
                'logradouro' => $ender['logradouro'] ?? null,
                'numero' => $ender['numero'] ?? null,
                'complemento' => $ender['complemento'] ?? null,
                'bairro' => $ender['bairro'] ?? null,
                'municipio' => $ender['municipio'] ?? null,
                'uf' => $ender['uf'] ?? null,
                'cep' => $ender['cep'] ?? null,
                'ibge' => $ender['ibge'] ?? null,
                'telefone' => $fone,
            ],
            'dest_cnpj' => is_string($destCnpj) && strlen($destCnpj) === 14 ? $destCnpj : null,
            'dest_cpf' => is_string($destCpf) && strlen($destCpf) === 11 ? $destCpf : null,
            'cfop_entrada_sugerido' => null,
            'transportadora' => null,
        ];
    }

    private function primeiro(DOMXPath $xp, string $query): ?DOMElement
    {
        $nodes = $xp->query($query);
        $node = $nodes !== false ? $nodes->item(0) : null;

        return $node instanceof DOMElement ? $node : null;
    }

    private function filho(DOMXPath $xp, ?DOMElement $ctx, string $name): string
    {
        if ($ctx === null) {
            return '';
        }
        $nodes = $xp->query('./*[local-name()="'.$name.'"]', $ctx);
        if ($nodes === false || $nodes->length < 1) {
            return '';
        }

        return trim((string) $nodes->item(0)?->textContent);
    }

    /**
     * @return array{logradouro: ?string, numero: ?string, complemento: ?string, bairro: ?string, municipio: ?string, uf: ?string, cep: ?string, ibge: ?string}|null
     */
    private function endereco(DOMXPath $xp, ?DOMElement $ctx): ?array
    {
        if ($ctx === null) {
            return null;
        }
        $ender = $this->relativo($xp, $ctx, './*[local-name()="enderNac"]')
            ?? $this->relativo($xp, $ctx, './*[local-name()="end"]/*[local-name()="endNac"]');
        if ($ender === null) {
            return null;
        }

        $uf = strtoupper($this->filho($xp, $ender, 'UF'));
        $cep = $this->digits($this->filho($xp, $ender, 'CEP'));
        $ibge = $this->digits($this->filho($xp, $ender, 'cMun'));
        $municipio = $this->filho($xp, $ender, 'xMun');

        return [
            'logradouro' => $this->nullable($this->filho($xp, $ender, 'xLgr')),
            'numero' => $this->nullable($this->filho($xp, $ender, 'nro')),
            'complemento' => $this->nullable($this->filho($xp, $ender, 'xCpl')),
            'bairro' => $this->nullable($this->filho($xp, $ender, 'xBairro')),
            'municipio' => $municipio !== '' ? $municipio : null,
            'uf' => $uf !== '' ? $uf : null,
            'cep' => is_string($cep) && strlen($cep) === 8 ? $cep : null,
            'ibge' => is_string($ibge) && strlen($ibge) === 7 ? $ibge : null,
        ];
    }

    private function relativo(DOMXPath $xp, DOMElement $ctx, string $query): ?DOMElement
    {
        $nodes = $xp->query($query, $ctx);
        $node = $nodes !== false ? $nodes->item(0) : null;

        return $node instanceof DOMElement ? $node : null;
    }

    private function chave(DOMXPath $xp): ?string
    {
        $inf = $this->primeiro($xp, '//*[local-name()="infNFSe"]');
        if ($inf === null) {
            return null;
        }
        $id = $inf->getAttribute('Id');
        $digits = preg_replace('/\D/', '', $id) ?: '';

        return strlen($digits) === 50 ? $digits : null;
    }

    private function digits(string $value): ?string
    {
        $digits = preg_replace('/\D/', '', $value) ?: '';

        return $digits !== '' ? $digits : null;
    }

    private function nullable(string $value): ?string
    {
        $value = trim($value);

        return $value !== '' ? $value : null;
    }
}
