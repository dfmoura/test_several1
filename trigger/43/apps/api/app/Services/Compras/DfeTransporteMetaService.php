<?php

namespace App\Services\Compras;

use App\Models\DfeDocumento;
use App\Services\Fiscal\NfeEmitenteExtractor;
use Illuminate\Support\Facades\Log;
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
     * Lote fora do GET da caixa. Nota nova já grava transp no sync / busca de XML.
     *
     * @return int Quantidade lida neste lote (igual ao limite quando ainda há pendência).
     */
    public function hidratarPendentes(?int $empresaId, int $limite): int
    {
        $limite = max(1, $limite);
        $query = DfeDocumento::query()
            ->where('transp_extraido', false)
            ->whereNotNull('xml_path')
            ->where('xml_path', '!=', '')
            ->orderBy('id');

        if ($empresaId !== null && $empresaId > 0) {
            $query->where('empresa_id', $empresaId);
        }

        $docs = $query->limit($limite)->get()->all();
        $this->hidratarEmLote($docs);

        return count($docs);
    }

    /**
     * Hidrata metadados a partir do cofre quando o XML já existe e ainda não foi lido.
     * Um arquivo ilegível não interrompe o lote: marca extraído vazio e segue.
     * Falha de gravação (coluna ausente) sobe — não mascara migration pendente.
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

            try {
                if (! $disk->exists($doc->xml_path)) {
                    $this->marcarSemTransporte($doc);

                    continue;
                }

                $xml = $disk->get($doc->xml_path);
                if (! is_string($xml) || trim($xml) === '') {
                    $this->marcarSemTransporte($doc);

                    continue;
                }

                $this->aplicarDeXml($doc, $xml);
                $doc->save();
            } catch (Throwable $e) {
                Log::warning('dfe.transporte.hidratar', [
                    'dfe_documento_id' => $doc->id,
                    'empresa_id' => $doc->empresa_id,
                    'erro' => $e->getMessage(),
                ]);
                $this->marcarSemTransporte($doc);
            }
        }
    }

    private function marcarSemTransporte(DfeDocumento $doc): void
    {
        $doc->transp_extraido = true;
        $doc->transp_cnpj = null;
        $doc->transp_nome = null;
        $doc->save();
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
