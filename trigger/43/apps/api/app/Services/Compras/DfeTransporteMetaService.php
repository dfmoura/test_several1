<?php

namespace App\Services\Compras;

use App\Models\DfeDocumento;
use App\Services\Fiscal\NfeEmitenteExtractor;
use Illuminate\Support\Facades\Storage;
use SimpleXMLElement;
use Throwable;

/**
 * Extrai e persiste metadados de transporta (transp) no documento DF-e.
 * Lista da caixa permanece local — sem SEFAZ.
 */
class DfeTransporteMetaService
{
    public function __construct(
        private readonly NfeEmitenteExtractor $emitenteExtractor,
    ) {}

    /**
     * @return array{cnpj: ?string, nome: ?string}
     */
    public function extrairDeXml(string $xml): array
    {
        try {
            $extracted = $this->emitenteExtractor->extract($xml);
            $t = $extracted['transportadora'] ?? null;
            if (! is_array($t)) {
                return ['cnpj' => null, 'nome' => null];
            }

            $cnpj = $this->digitsOrNull($t['cnpj'] ?? null);
            if ($cnpj !== null && strlen($cnpj) !== 14) {
                $cnpj = null;
            }
            $cpf = $this->digitsOrNull($t['cpf'] ?? null);
            $doc = $cnpj ?? ($cpf !== null && strlen($cpf) === 11 ? $cpf : null);
            $nome = isset($t['nome']) ? mb_substr(trim((string) $t['nome']), 0, 120) : null;
            if ($nome === '') {
                $nome = null;
            }

            return [
                'cnpj' => $doc,
                'nome' => $nome,
            ];
        } catch (Throwable) {
            return $this->extrairTransportaLeve($xml);
        }
    }

    public function aplicarDeXml(DfeDocumento $doc, string $xml): void
    {
        $meta = $this->extrairDeXml($xml);
        $doc->transp_cnpj = $meta['cnpj'];
        $doc->transp_nome = $meta['nome'];
        $doc->transp_extraido = true;
    }

    /**
     * Hidrata metadados a partir do cofre quando o XML já existe e ainda não foi lido.
     *
     * @param  list<DfeDocumento>  $docs
     */
    public function hidratarEmLote(array $docs): void
    {
        $disk = Storage::disk((string) config('erp.dfe.xml_disk', 'local'));

        foreach ($docs as $doc) {
            if ($doc->transp_extraido || ! $doc->temXml() || ! filled($doc->xml_path)) {
                continue;
            }
            if (! $disk->exists($doc->xml_path)) {
                $doc->transp_extraido = true;
                $doc->transp_cnpj = null;
                $doc->transp_nome = null;
                $doc->save();

                continue;
            }

            $xml = $disk->get($doc->xml_path);
            if (! is_string($xml) || trim($xml) === '') {
                $doc->transp_extraido = true;
                $doc->transp_cnpj = null;
                $doc->transp_nome = null;
                $doc->save();

                continue;
            }

            $this->aplicarDeXml($doc, $xml);
            $doc->save();
        }
    }

    /**
     * Fallback mínimo se o extractor completo falhar (ex.: XML parcial).
     *
     * @return array{cnpj: ?string, nome: ?string}
     */
    private function extrairTransportaLeve(string $xml): array
    {
        try {
            $previous = libxml_use_internal_errors(true);
            $el = new SimpleXMLElement($xml);
            libxml_clear_errors();
            libxml_use_internal_errors($previous);

            $nodes = $el->xpath('//*[local-name()="transporta"]');
            if ($nodes === false || $nodes === []) {
                return ['cnpj' => null, 'nome' => null];
            }

            $t = $nodes[0];
            $cnpj = $this->digitsOrNull((string) ($t->CNPJ ?? ''));
            if ($cnpj !== null && strlen($cnpj) !== 14) {
                $cnpj = null;
            }
            $cpf = $this->digitsOrNull((string) ($t->CPF ?? ''));
            $doc = $cnpj ?? ($cpf !== null && strlen($cpf) === 11 ? $cpf : null);
            $nome = trim((string) ($t->xNome ?? ''));

            return [
                'cnpj' => $doc,
                'nome' => $nome !== '' ? mb_substr($nome, 0, 120) : null,
            ];
        } catch (Throwable) {
            return ['cnpj' => null, 'nome' => null];
        }
    }

    private function digitsOrNull(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $digits = preg_replace('/\D+/', '', $value);

        return $digits !== '' ? $digits : null;
    }
}
