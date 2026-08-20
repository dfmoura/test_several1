<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Services\Estoque\EstoqueConsultaService;
use App\Services\Estoque\EstoqueEntradaService;
use App\Services\Estoque\EstoqueEntradaXmlService;
use App\Support\CompraValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EstoqueController extends Controller
{
    public function __construct(
        private readonly EstoqueConsultaService $consulta,
        private readonly EstoqueEntradaService $entrada,
        private readonly EstoqueEntradaXmlService $xmlEntrada,
    ) {}

    public function saldos(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'produto_id' => ['nullable', 'integer'],
        ]);

        return response()->json([
            'data' => $this->consulta->listSaldos(
                $this->empresa(),
                $validated['q'] ?? null,
                isset($validated['produto_id']) ? (int) $validated['produto_id'] : null,
            ),
        ]);
    }

    public function lotes(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'produto_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', 'max:24'],
        ]);

        return response()->json([
            'data' => $this->consulta->listLotes(
                $this->empresa(),
                isset($validated['produto_id']) ? (int) $validated['produto_id'] : null,
                $validated['status'] ?? null,
            ),
        ]);
    }

    public function movimentos(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'tipo' => ['nullable', 'string', 'max:24'],
        ]);

        return response()->json([
            'data' => $this->consulta->listMovimentos(
                $this->empresa(),
                $validated['q'] ?? null,
                $validated['tipo'] ?? null,
            ),
        ]);
    }

    public function extrato(Request $request, int $produto): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json([
            'data' => $this->consulta->extrato($this->empresa(), $produto),
        ]);
    }

    public function receber(Request $request, OrdemCompra $ordemCompra): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemCompra);

        $data = $request->validate(CompraValidationRules::receber());
        $maps = $data['cprod_maps'] ?? [];

        $out = $this->entrada->receber($this->empresa(), $ordemCompra, $data);

        if ($maps !== []) {
            $this->xmlEntrada->persistMaps($this->empresa(), $ordemCompra->fornecedor_id, $maps);
        }

        return response()->json(['data' => $out], 201);
    }

    public function receberXmlPreview(Request $request, OrdemCompra $ordemCompra): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemCompra);

        $request->validate([
            'file' => ['required', 'file', 'max:'.EstoqueEntradaXmlService::MAX_FILE_KB],
        ]);

        /** @var \Illuminate\Http\UploadedFile $file */
        $file = $request->file('file');

        return response()->json([
            'data' => $this->xmlEntrada->preview($this->empresa(), $ordemCompra, $file),
        ]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('estoque.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
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

    private function assertEmpresa(OrdemCompra $oc): void
    {
        if ($oc->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
