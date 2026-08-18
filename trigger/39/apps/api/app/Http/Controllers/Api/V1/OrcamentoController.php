<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Orcamento;
use App\Services\Comercial\OrcamentoService;
use App\Support\OrcamentoValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrcamentoController extends Controller
{
    public function __construct(private readonly OrcamentoService $orcamentoService) {}

    public function catalog(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json(['data' => $this->orcamentoService->catalogMeta()]);
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
        $result = $this->orcamentoService->calcularPreview(app('empresa'), $data);

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
     * @return array<string, mixed>
     */
    private function validatedCalculo(Request $request): array
    {
        $validator = Validator::make($request->all(), OrcamentoValidationRules::calcularRules());
        $validator->after(static fn ($v) => OrcamentoValidationRules::after($v));

        return $validator->validate();
    }
}
