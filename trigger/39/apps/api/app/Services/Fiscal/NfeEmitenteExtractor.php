<?php

namespace App\Services\Fiscal;

use SimpleXMLElement;
use Throwable;

/**
 * Extrai emitente (fornecedor) e metadados úteis de XML NF-e modelo 55 (nfeProc ou NFe).
 * Não valida assinatura nem consulta SEFAZ — só mapeamento para cadastro PAR.
 */
class NfeEmitenteExtractor
{
    /**
     * @return array{
     *   chave_nfe: ?string,
     *   modelo: ?string,
     *   emit: array<string, mixed>,
     *   dest_cnpj: ?string,
     *   dest_cpf: ?string,
     *   cfop_entrada_sugerido: ?string,
     *   transportadora: ?array{cnpj: ?string, cpf: ?string, nome: ?string, ie: ?string},
     * }
     */
    public function extract(string $xmlContent): array
    {
        $xml = $this->loadXml($xmlContent);
        $inf = $this->findInfNFe($xml);
        if ($inf === null) {
            throw new \InvalidArgumentException('XML não contém infNFe (NF-e inválida ou formato não suportado).');
        }

        $ide = $this->child($inf, 'ide');
        $modelo = $this->text($ide, 'mod');
        if ($modelo !== null && $modelo !== '55') {
            throw new \InvalidArgumentException("Somente NF-e modelo 55 é suportada (recebido modelo {$modelo}).");
        }

        $emitNode = $this->child($inf, 'emit');
        if ($emitNode === null) {
            throw new \InvalidArgumentException('XML sem grupo emit (emitente).');
        }

        $ender = $this->child($emitNode, 'enderEmit');
        $cnpj = $this->digits($this->text($emitNode, 'CNPJ'));
        $cpf = $this->digits($this->text($emitNode, 'CPF'));
        $ie = $this->nullable($this->text($emitNode, 'IE'));
        $crt = $this->nullable($this->text($emitNode, 'CRT'));

        $emit = [
            'cnpj_cpf' => $cnpj ?? $cpf,
            'tipo_pessoa' => $cnpj !== null ? 'PJ' : ($cpf !== null ? 'PF' : 'PJ'),
            'razao_social' => $this->nullable($this->text($emitNode, 'xNome')),
            'nome_fantasia' => $this->nullable($this->text($emitNode, 'xFant')),
            'ie' => $ie,
            'crt' => $crt,
            'regime_hint' => $this->regimeFromCrt($crt),
            'logradouro' => $this->nullable($this->text($ender, 'xLgr')),
            'numero' => $this->nullable($this->text($ender, 'nro')),
            'complemento' => $this->nullable($this->text($ender, 'xCpl')),
            'bairro' => $this->nullable($this->text($ender, 'xBairro')),
            'municipio' => $this->nullable($this->text($ender, 'xMun')),
            'uf' => $this->upper($this->text($ender, 'UF')),
            'cep' => $this->digits($this->text($ender, 'CEP')),
            'ibge' => $this->digits($this->text($ender, 'cMun')),
            'telefone' => $this->digits($this->text($ender, 'fone')),
        ];

        if ($emit['cnpj_cpf'] === null || $emit['cnpj_cpf'] === '') {
            throw new \InvalidArgumentException('Emitente sem CNPJ/CPF no XML.');
        }

        $dest = $this->child($inf, 'dest');
        $destCnpj = $this->digits($this->text($dest, 'CNPJ'));
        $destCpf = $this->digits($this->text($dest, 'CPF'));

        $chave = $this->extractChave($inf, $xml);
        $cfop = $this->suggestCfop($inf);
        $transportadora = $this->extractTransportadora($inf);

        return [
            'chave_nfe' => $chave,
            'modelo' => $modelo ?? '55',
            'emit' => $emit,
            'dest_cnpj' => $destCnpj,
            'dest_cpf' => $destCpf,
            'cfop_entrada_sugerido' => $cfop,
            'transportadora' => $transportadora,
        ];
    }

    private function loadXml(string $xmlContent): SimpleXMLElement
    {
        $trimmed = trim($xmlContent);
        if ($trimmed === '') {
            throw new \InvalidArgumentException('Arquivo XML vazio.');
        }

        $previous = libxml_use_internal_errors(true);
        try {
            $xml = simplexml_load_string($trimmed, SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);
            if ($xml === false) {
                $messages = [];
                foreach (libxml_get_errors() as $error) {
                    $messages[] = trim($error->message);
                }
                libxml_clear_errors();
                throw new \InvalidArgumentException(
                    'XML malformado'.($messages !== [] ? ': '.$messages[0] : '.')
                );
            }

            return $xml;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }

    private function findInfNFe(SimpleXMLElement $xml): ?SimpleXMLElement
    {
        $candidates = [
            $xml,
            $this->child($xml, 'NFe'),
            $this->child($this->child($xml, 'nfeProc'), 'NFe'),
            $this->child($xml, 'nfeProc'),
        ];

        foreach ($candidates as $node) {
            if ($node === null) {
                continue;
            }
            $inf = $this->child($node, 'infNFe');
            if ($inf !== null) {
                return $inf;
            }
            // Alguns arquivos já são a própria infNFe
            if (str_ends_with(strtolower($node->getName()), 'infnfe')) {
                return $node;
            }
        }

        // Busca profunda por nome local (namespaces)
        try {
            $xml->registerXPathNamespace('n', 'http://www.portalfiscal.inf.br/nfe');
            $found = $xml->xpath('//n:infNFe');
            if (is_array($found) && isset($found[0]) && $found[0] instanceof SimpleXMLElement) {
                return $found[0];
            }
            $found = $xml->xpath('//*[local-name()="infNFe"]');
            if (is_array($found) && isset($found[0]) && $found[0] instanceof SimpleXMLElement) {
                return $found[0];
            }
        } catch (Throwable) {
            // fallthrough
        }

        return null;
    }

    private function extractChave(SimpleXMLElement $inf, SimpleXMLElement $root): ?string
    {
        $attrs = $inf->attributes();
        if ($attrs !== null && isset($attrs['Id'])) {
            $id = (string) $attrs['Id'];
            $digits = preg_replace('/\D/', '', $id) ?? '';
            if (strlen($digits) === 44) {
                return $digits;
            }
        }

        try {
            $root->registerXPathNamespace('n', 'http://www.portalfiscal.inf.br/nfe');
            $ch = $root->xpath('//n:chNFe|//*[local-name()="chNFe"]');
            if (is_array($ch) && isset($ch[0])) {
                $digits = preg_replace('/\D/', '', (string) $ch[0]) ?? '';

                return strlen($digits) === 44 ? $digits : null;
            }
        } catch (Throwable) {
            // ignore
        }

        return null;
    }

    private function suggestCfop(SimpleXMLElement $inf): ?string
    {
        $counts = [];
        try {
            $inf->registerXPathNamespace('n', 'http://www.portalfiscal.inf.br/nfe');
            $nodes = $inf->xpath('.//n:det/n:prod/n:CFOP|.//*[local-name()="det"]/*[local-name()="prod"]/*[local-name()="CFOP"]');
            if (! is_array($nodes)) {
                return null;
            }
            foreach ($nodes as $node) {
                $cfop = preg_replace('/\D/', '', (string) $node) ?? '';
                if (strlen($cfop) !== 4) {
                    continue;
                }
                $counts[$cfop] = ($counts[$cfop] ?? 0) + 1;
            }
        } catch (Throwable) {
            return null;
        }

        if ($counts === []) {
            return null;
        }

        arsort($counts);

        return (string) array_key_first($counts);
    }

    /**
     * @return array{cnpj: ?string, cpf: ?string, nome: ?string, ie: ?string}|null
     */
    private function extractTransportadora(SimpleXMLElement $inf): ?array
    {
        $transp = $this->child($inf, 'transp');
        $transporta = $this->child($transp, 'transporta');
        if ($transporta === null) {
            return null;
        }

        $cnpj = $this->digits($this->text($transporta, 'CNPJ'));
        $cpf = $this->digits($this->text($transporta, 'CPF'));
        $nome = $this->nullable($this->text($transporta, 'xNome'));
        $ie = $this->nullable($this->text($transporta, 'IE'));

        if ($cnpj === null && $cpf === null && $nome === null) {
            return null;
        }

        return [
            'cnpj' => $cnpj,
            'cpf' => $cpf,
            'nome' => $nome,
            'ie' => $ie,
        ];
    }

    private function regimeFromCrt(?string $crt): ?string
    {
        return match ($crt) {
            '1', '2' => 'SIMPLES_NACIONAL',
            '3' => null, // Regime Normal — BrasilAPI / operador decide PRESUMIDO|REAL
            '4' => 'MEI',
            default => null,
        };
    }

    private function child(?SimpleXMLElement $parent, string $localName): ?SimpleXMLElement
    {
        if ($parent === null) {
            return null;
        }

        foreach ($parent->children() as $child) {
            if (strcasecmp($child->getName(), $localName) === 0) {
                return $child;
            }
        }

        // Namespace explícito da NF-e
        foreach ($parent->children('http://www.portalfiscal.inf.br/nfe') as $child) {
            if (strcasecmp($child->getName(), $localName) === 0) {
                return $child;
            }
        }

        return null;
    }

    private function text(?SimpleXMLElement $parent, string $localName): ?string
    {
        $node = $this->child($parent, $localName);
        if ($node === null) {
            return null;
        }

        $value = trim((string) $node);

        return $value === '' ? null : $value;
    }

    private function nullable(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function digits(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $digits = preg_replace('/\D/', '', $value) ?? '';

        return $digits === '' ? null : $digits;
    }

    private function upper(?string $value): ?string
    {
        $v = $this->nullable($value);

        return $v === null ? null : strtoupper($v);
    }
}
