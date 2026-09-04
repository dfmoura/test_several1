<?php

namespace App\Services\Compras;

use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Services\Estoque\EstoqueEntradaXmlService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Amarrar NF-e da caixa DF-e a uma OC e alimentar o assist XML (BL-092).
 * Não lança estoque — só vínculo + preview; receber() permanece o dono.
 */
class DfeAmarrarService
{
    public function __construct(
        private readonly DfeCaixaService $caixa,
        private readonly EstoqueEntradaXmlService $xmlAssist,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function amarrar(Empresa $empresa, DfeDocumento $doc, OrdemCompra $oc): array
    {
        $this->assertMesmaEmpresa($empresa, $doc, $oc);
        $this->assertOcRecebivel($oc);

        if ($doc->situacao === DfeDocumento::SITUACAO_RECEBIDA) {
            throw ValidationException::withMessages([
                'dfe' => ['Este documento já foi recebido no estoque.'],
            ]);
        }
        if ($doc->situacao === DfeDocumento::SITUACAO_SEM_INTERESSE) {
            throw ValidationException::withMessages([
                'dfe' => ['Documento marcado como sem interesse — reabra antes de amarrar.'],
            ]);
        }
        if (! $doc->temXml()) {
            throw ValidationException::withMessages([
                'dfe' => ['XML completo ainda não está na caixa. Use “Buscar XML” (ciência/DF-e) antes de amarrar à OC.'],
            ]);
        }

        $doc->ordem_compra_id = $oc->id;
        $doc->situacao = DfeDocumento::SITUACAO_AMARRADA;
        $doc->save();

        return $this->caixa->show($doc->fresh(['ordemCompra:id,codigo,status']));
    }

    /**
     * @return array{preview: array<string, mixed>, xml: string, documento: array<string, mixed>}
     */
    public function previewNaOc(Empresa $empresa, OrdemCompra $oc, DfeDocumento $doc): array
    {
        $this->assertMesmaEmpresa($empresa, $doc, $oc);
        $this->assertOcRecebivel($oc);

        if (! $doc->temXml()) {
            throw ValidationException::withMessages([
                'dfe_documento_id' => ['XML completo indisponível neste documento DF-e.'],
            ]);
        }

        $xml = Storage::disk((string) config('erp.dfe.xml_disk', 'local'))->get((string) $doc->xml_path);
        if (! is_string($xml) || trim($xml) === '') {
            throw ValidationException::withMessages([
                'dfe_documento_id' => ['Arquivo XML do DF-e não encontrado no armazenamento.'],
            ]);
        }

        if ($doc->ordem_compra_id !== $oc->id || $doc->situacao !== DfeDocumento::SITUACAO_AMARRADA) {
            $doc->ordem_compra_id = $oc->id;
            if ($doc->situacao !== DfeDocumento::SITUACAO_RECEBIDA) {
                $doc->situacao = DfeDocumento::SITUACAO_AMARRADA;
            }
            $doc->save();
        }

        $preview = $this->xmlAssist->previewFromContent($empresa, $oc, $xml, 'dfe_documento_id');

        return [
            'preview' => $preview,
            'xml' => $xml,
            'documento' => $this->caixa->show($doc->fresh(['ordemCompra:id,codigo,status'])),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function marcarSemInteresse(Empresa $empresa, DfeDocumento $doc): array
    {
        if ($doc->empresa_id !== $empresa->id) {
            abort(404);
        }
        if ($doc->situacao === DfeDocumento::SITUACAO_RECEBIDA) {
            throw ValidationException::withMessages([
                'dfe' => ['Não é possível descartar documento já recebido.'],
            ]);
        }

        $doc->situacao = DfeDocumento::SITUACAO_SEM_INTERESSE;
        $doc->save();

        return $this->caixa->show($doc->fresh(['ordemCompra:id,codigo,status']));
    }

    public function marcarRecebidaPorChave(Empresa $empresa, string $chave, int $ordemCompraId): void
    {
        $chave = preg_replace('/\D/', '', $chave) ?? '';
        if (strlen($chave) !== 44) {
            return;
        }

        DfeDocumento::query()
            ->where('empresa_id', $empresa->id)
            ->where('chave', $chave)
            ->whereNull('deleted_at')
            ->update([
                'situacao' => DfeDocumento::SITUACAO_RECEBIDA,
                'ordem_compra_id' => $ordemCompraId,
                'updated_at' => now(),
            ]);
    }

    private function assertMesmaEmpresa(Empresa $empresa, DfeDocumento $doc, OrdemCompra $oc): void
    {
        if ($doc->empresa_id !== $empresa->id || $oc->empresa_id !== $empresa->id) {
            abort(404);
        }
    }

    private function assertOcRecebivel(OrdemCompra $oc): void
    {
        if (! in_array($oc->status, OrdemCompra::STATUSES_RECEBIVEIS, true)) {
            throw ValidationException::withMessages([
                'ordem_compra_id' => ['A OC precisa estar ABERTA ou PARCIAL para amarrar a NF-e.'],
            ]);
        }
    }
}
