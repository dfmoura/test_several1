<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\Orcamento;
use App\Services\Comercial\OrcamentoService;
use App\Support\OrcamentoValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrcamentoController extends Controller
{
    public function __construct(private readonly OrcamentoService $orcamentoService) {}

    public function catalog(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json(['data' => $this->orcamentoService->catalogMeta()]);
    }

    public function revendaSkus(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $empresa = app('empresa');
        if (! $empresa instanceof \App\Models\Empresa) {
            abort(400, 'Empresa não selecionada.');
        }
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'incluir_id' => ['nullable', 'integer', 'min:1'],
        ]);

        return response()->json([
            'data' => $this->orcamentoService->buscarRevenda(
                $empresa,
                $filtros['q'] ?? null,
                isset($filtros['incluir_id']) ? (int) $filtros['incluir_id'] : null,
            ),
        ]);
    }

    public function insumos(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $empresa = app('empresa');
        if (! $empresa instanceof \App\Models\Empresa) {
            abort(400, 'Empresa não selecionada.');
        }
        $filtros = $request->validate([
            'slot' => ['required', 'string', 'in:papel,acabamento,tubete,caixa'],
            'q' => ['nullable', 'string', 'max:120'],
            'incluir_id' => ['nullable', 'integer', 'min:1'],
        ]);

        return response()->json([
            'data' => $this->orcamentoService->buscarInsumos(
                $empresa,
                $filtros['slot'],
                $filtros['q'] ?? null,
                isset($filtros['incluir_id']) ? (int) $filtros['incluir_id'] : null,
            ),
        ]);
    }

    public function caixasRolo(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $empresa = app('empresa');
        if (! $empresa instanceof \App\Models\Empresa) {
            abort(400, 'Empresa não selecionada.');
        }
        $largura = $request->validate([
            'largura_cm' => ['required', 'numeric', 'gt:0'],
        ])['largura_cm'];

        return response()->json([
            'data' => $this->orcamentoService->caixasParaRolo($empresa, (string) $largura),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $filters = $request->validate(OrcamentoValidationRules::listRules());
        $data = $this->orcamentoService->list(app('empresa'), $filters);

        return response()->json(['data' => $data]);
    }

    public function show(Request $request, Orcamento $orcamento): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($orcamento);

        return response()->json(['data' => $this->orcamentoService->show($orcamento)]);
    }

    public function calcular(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $this->validatedCalculo($request);
        $empresa = app('empresa');
        $result = $this->orcamentoService->calcularPreview(
            $empresa,
            $data,
            $this->orcamentoDaEmpresa($empresa, (int) $request->input('orcamento_id', 0)),
        );

        return response()->json(['data' => $result]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $this->validatedCalculo($request);
        $orcamento = $this->orcamentoService->create(app('empresa'), $data);

        return response()->json(['data' => $orcamento], 201);
    }

    public function update(Request $request, Orcamento $orcamento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($orcamento);

        $data = $this->validatedCalculo($request);
        $updated = $this->orcamentoService->update($orcamento, $data);

        return response()->json(['data' => $updated]);
    }

    public function destroy(Request $request, Orcamento $orcamento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($orcamento);

        $this->orcamentoService->destroy($orcamento);

        return response()->json(['message' => 'Orçamento cancelado.']);
    }

    public function duplicar(Request $request, Orcamento $orcamento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($orcamento);

        $novo = $this->orcamentoService->duplicar(app('empresa'), $orcamento);

        return response()->json(['data' => $novo], 201);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('orcamento.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('orcamento.escrever')) {
            abort(403);
        }
    }

    private function assertEmpresa(Orcamento $orcamento): void
    {
        if ($orcamento->empresa_id !== app('empresa')->id) {
            abort(404);
        }
    }

    /**
     * Reedição: o cálculo enxerga o SKU já gravado mesmo com saldo zerado.
     * Id de outra empresa não entra. Não grava nada.
     */
    private function orcamentoDaEmpresa(Empresa $empresa, int $id): ?Orcamento
    {
        if ($id < 1) {
            return null;
        }

        return Orcamento::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($id)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedCalculo(Request $request): array
    {
        return OrcamentoValidationRules::validateCalculo($request->all());
    }
}
