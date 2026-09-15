<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\NfeEntrada;
use App\Services\Fiscal\NfeEntradaConsultaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * NF-e vinculadas — consulta do espelho pós-receber / já vinculadas (somente leitura).
 */
class NfeEntradaController extends Controller
{
    public function __construct(private readonly NfeEntradaConsultaService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'ano' => ['nullable', 'integer', 'min:2006', 'max:2100'],
        ]);

        $ano = isset($validated['ano']) ? (int) $validated['ano'] : (int) now()->year;
        $empresa = $this->empresa();

        return response()->json([
            'data' => $this->service->list(
                $empresa,
                $validated['q'] ?? null,
                $ano,
            ),
            'meta' => [
                'ano' => $ano,
            ],
        ]);
    }

    public function show(Request $request, NfeEntrada $nfeEntrada): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($nfeEntrada);

        return response()->json(['data' => $this->service->show($nfeEntrada)]);
    }

    public function downloadXml(Request $request, NfeEntrada $nfeEntrada): StreamedResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($nfeEntrada);

        return $this->service->downloadXml($this->empresa(), $nfeEntrada);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('compras.ler')) {
            abort(403, 'Sem permissão para consultar NF-e vinculadas.');
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

    private function assertEmpresa(NfeEntrada $entrada): void
    {
        if ($entrada->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
