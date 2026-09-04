<?php

namespace App\Services\Compras;

use App\Jobs\BuscarXmlDfeDocumentoJob;
use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Services\Cadastros\EmpresaCertificadoA1Materializer;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use App\Services\Fiscal\Dfe\DfeDistribuicaoClient;
use App\Services\Fiscal\Dfe\DfeDocZip;
use App\Services\Fiscal\NfeChaveAcesso;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Busca XML completo (consChNFe) após resumo DF-e — BL-093.
 * Ciência formal assinada completa fica para evolução; fake cobre o fluxo de teste.
 * Sem Focus · sem auto-receber.
 */
class DfeXmlCompletoService
{
    public function __construct(
        private readonly DfeCaixaService $caixa,
        private readonly DfeSyncService $sync,
        private readonly EmpresaCertificadoA1Service $a1,
        private readonly EmpresaCertificadoA1Materializer $materializer,
        private readonly DfeDistribuicaoClient $client,
    ) {}

    /**
     * Enfileira busca do XML (request leve).
     *
     * @return array<string, mixed>
     */
    public function enfileirarBusca(Empresa $empresa, DfeDocumento $doc): array
    {
        if ($doc->empresa_id !== $empresa->id) {
            abort(404);
        }

        $bloqueio = $this->sync->motivoBloqueio($empresa);
        if ($bloqueio !== null) {
            throw ValidationException::withMessages(['dfe' => [$bloqueio]]);
        }

        if ($doc->temXml()) {
            return [
                'enfileirado' => false,
                'ja_disponivel' => true,
                'documento' => $this->caixa->show($doc),
            ];
        }

        $chave = preg_replace('/\D/', '', (string) $doc->chave) ?? '';
        if (strlen($chave) !== 44) {
            throw ValidationException::withMessages([
                'dfe' => ['Documento sem chave de 44 dígitos — não é possível buscar o XML.'],
            ]);
        }

        $resumo = is_array($doc->resumo) ? $doc->resumo : [];
        $resumo['xml_busca'] = 'ENFILEIRADA';
        $resumo['xml_busca_em'] = now()->toIso8601String();
        $doc->resumo = $resumo;
        $doc->save();

        BuscarXmlDfeDocumentoJob::dispatch($empresa->id, $doc->id);

        return [
            'enfileirado' => true,
            'ja_disponivel' => false,
            'documento' => $this->caixa->show($doc->fresh()),
        ];
    }

    public function executarBusca(int $empresaId, int $documentoId): void
    {
        $empresa = Empresa::query()->find($empresaId);
        $doc = DfeDocumento::query()->find($documentoId);
        if ($empresa === null || $doc === null || $doc->empresa_id !== $empresaId) {
            return;
        }

        if ($doc->temXml()) {
            return;
        }

        if ($this->sync->motivoBloqueio($empresa) !== null || ! $this->a1->aptoParaOperar($empresa)) {
            $this->marcarBusca($doc, 'BLOQUEADO', 'Ambiente/A1 não permitem busca DF-e.');

            return;
        }

        $chave = preg_replace('/\D/', '', (string) $doc->chave) ?? '';
        if (strlen($chave) !== 44) {
            $this->marcarBusca($doc, 'ERRO', 'Chave inválida.');

            return;
        }

        $material = null;
        try {
            // Manifestação (ciência): no driver fake é implícita; no SEFAZ real
            // a consChNFe costuma exigir ciência prévia no portal ou evento assinado.
            $resumo = is_array($doc->resumo) ? $doc->resumo : [];
            $resumo['manifestacao'] = [
                'tipo' => '210210',
                'label' => 'Ciência da Operação',
                'em' => now()->toIso8601String(),
                'origem' => (string) config('erp.dfe.driver', 'sefaz'),
                'nota' => config('erp.dfe.driver') === 'fake'
                    ? 'Ciência simulada (fake).'
                    : 'Tentativa de download via consChNFe; se o AN exigir ciência assinada e falhar, use o portal ou aguarde o XML no sync NSU.',
            ];
            $doc->resumo = $resumo;
            $doc->save();

            $material = $this->materializer->materializar($empresa);
            $cnpj = preg_replace('/\D/', '', (string) $empresa->cnpj) ?? '';
            $cuf = NfeChaveAcesso::cuf((string) ($empresa->uf ?: 'MG'));
            $tpAmb = strtolower((string) config('erp.stage')) === 'production' ? 1 : 2;

            $resultado = $this->client->consChNFe(
                $cnpj,
                $cuf,
                $chave,
                $material['path'],
                $material['senha'],
                $tpAmb,
            );

            $gravou = false;
            foreach ($resultado->documentos as $zip) {
                if ($this->persistirXmlCompleto($empresa, $doc, $zip)) {
                    $gravou = true;
                }
            }

            if ($gravou) {
                $this->marcarBusca($doc->fresh(), 'OK', $resultado->xMotivo);

                return;
            }

            $this->marcarBusca(
                $doc,
                'PENDENTE',
                trim($resultado->cStat.' — '.$resultado->xMotivo)
                    .' Sem XML completo ainda (ciência/manifestação pode ser necessária no AN).',
            );
        } catch (Throwable $e) {
            Log::warning('dfe.xml_completo.falha', [
                'empresa_id' => $empresaId,
                'dfe_documento_id' => $documentoId,
                'erro' => $e->getMessage(),
            ]);
            $this->marcarBusca($doc, 'ERRO', $e->getMessage());
        } finally {
            $this->materializer->liberar($material);
        }
    }

    private function persistirXmlCompleto(Empresa $empresa, DfeDocumento $doc, DfeDocZip $zip): bool
    {
        $isProc = str_contains(strtolower($zip->schema), 'procnfe')
            || str_contains($zip->xml, '<nfeProc')
            || str_contains($zip->xml, '<NFe');
        if (! $isProc) {
            return false;
        }

        $chave = preg_replace('/\D/', '', (string) $doc->chave) ?? '';
        if (strlen($chave) !== 44) {
            return false;
        }

        $path = sprintf('dfe-documentos/%d/%s.xml', $empresa->id, $chave);
        Storage::disk((string) config('erp.dfe.xml_disk', 'local'))->put($path, $zip->xml);

        $doc->xml_path = $path;
        $doc->xml_sha256 = hash('sha256', $zip->xml);
        if ($doc->situacao === DfeDocumento::SITUACAO_NOVA) {
            $doc->situacao = DfeDocumento::SITUACAO_DISPONIVEL;
        }
        $doc->schema_dfe = mb_substr($zip->schema, 0, 40) ?: $doc->schema_dfe;
        $doc->save();

        return true;
    }

    private function marcarBusca(DfeDocumento $doc, string $status, string $mensagem): void
    {
        $resumo = is_array($doc->resumo) ? $doc->resumo : [];
        $resumo['xml_busca'] = $status;
        $resumo['xml_busca_msg'] = mb_substr($mensagem, 0, 400);
        $resumo['xml_busca_em'] = now()->toIso8601String();
        $doc->resumo = $resumo;
        $doc->save();
    }
}
