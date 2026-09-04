<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DfeDocumento;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Services\Compras\DfeAmarrarService;
use App\Services\Compras\DfeCaixaService;
use App\Services\Compras\DfeSyncService;
use App\Services\Compras\DfeXmlCompletoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Caixa DF-e — leitura (BL-090) · sync (BL-091) · amarrar (BL-092) · XML completo (BL-093).
 */
class DfeCaixaController extends Controller
{
    public function __construct(
        private readonly DfeCaixaService $service,
        private readonly DfeSyncService $sync,
        private readonly DfeAmarrarService $amarrar,
        private readonly DfeXmlCompletoService $xmlCompleto,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'situacao' => ['nullable', 'string', Rule::in(DfeDocumento::SITUACOES)],
            'ano' => ['nullable', 'integer', 'min:2006', 'max:2100'],
        ]);

        $ano = isset($validated['ano']) ? (int) $validated['ano'] : (int) now()->year;
        $empresa = $this->empresa();

        return response()->json([
            'data' => $this->service->list(
                $empresa,
                $validated['q'] ?? null,
                $validated['situacao'] ?? null,
                $ano,
            ),
            'meta' => [
                'situacoes' => DfeDocumento::SITUACOES,
                'ano' => $ano,
                'sync' => $this->sync->syncEstadoEnriquecido($empresa),
            ],
        ]);
    }

    public function show(Request $request, DfeDocumento $dfeDocumento): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaDoc($dfeDocumento);

        return response()->json(['data' => $this->service->show($dfeDocumento)]);
    }

    public function syncEstado(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json(['data' => $this->sync->syncEstadoEnriquecido($this->empresa())]);
    }

    public function enfileirarSync(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        return response()->json([
            'data' => $this->sync->enfileirar($this->empresa()),
        ]);
    }

    public function amarrar(Request $request, DfeDocumento $dfeDocumento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaDoc($dfeDocumento);

        $data = $request->validate([
            'ordem_compra_id' => ['required', 'integer', 'min:1'],
        ]);

        $oc = OrdemCompra::query()->findOrFail((int) $data['ordem_compra_id']);

        return response()->json([
            'data' => $this->amarrar->amarrar($this->empresa(), $dfeDocumento, $oc),
        ]);
    }

    public function previewNaOc(Request $request, OrdemCompra $ordemCompra): JsonResponse
    {
        $this->authorizeEstoqueWrite($request);
        $this->assertEmpresaOc($ordemCompra);

        $data = $request->validate([
            'dfe_documento_id' => ['required', 'integer', 'min:1'],
        ]);

        $doc = DfeDocumento::query()->findOrFail((int) $data['dfe_documento_id']);
        $out = $this->amarrar->previewNaOc($this->empresa(), $ordemCompra, $doc);

        return response()->json(['data' => $out]);
    }

    public function buscarXml(Request $request, DfeDocumento $dfeDocumento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaDoc($dfeDocumento);

        return response()->json([
            'data' => $this->xmlCompleto->enfileirarBusca($this->empresa(), $dfeDocumento),
        ]);
    }

    public function semInteresse(Request $request, DfeDocumento $dfeDocumento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaDoc($dfeDocumento);

        return response()->json([
            'data' => $this->amarrar->marcarSemInteresse($this->empresa(), $dfeDocumento),
        ]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('compras.ler')) {
            abort(403, 'Sem permissão para consultar a caixa de NF-e destinadas.');
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('compras.escrever')) {
            abort(403, 'Sem permissão para alterar a caixa de NF-e destinadas.');
        }
    }

    private function authorizeEstoqueWrite(Request $request): void
    {
        if (! $request->user()->can('estoque.escrever')) {
            abort(403);
        }
    }

    private function empresa(): Empresa
    {
        $empresa = app('empresa');
        if (! $empresa instanceof Empresa) {
            abort(400, 'Empresa não selecionada.');
        }

        return $empresa;
    }

    private function assertEmpresaDoc(DfeDocumento $doc): void
    {
        if ($doc->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }

    private function assertEmpresaOc(OrdemCompra $oc): void
    {
        if ($oc->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
