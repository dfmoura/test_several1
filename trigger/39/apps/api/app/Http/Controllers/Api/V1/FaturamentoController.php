<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Pedido;
use App\Services\Financeiro\FaturamentoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FaturamentoController extends Controller
{
    public function __construct(private readonly FaturamentoService $faturamentos) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        return response()->json([
            'data' => $this->faturamentos->list($this->empresa(), $validated['q'] ?? null),
        ]);
    }

    public function show(Request $request, Faturamento $faturamento): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaFat($faturamento);

        return response()->json(['data' => $this->faturamentos->show($faturamento)]);
    }

    public function preview(Request $request, Pedido $pedido): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaPed($pedido);

        return response()->json([
            'data' => $this->faturamentos->preview($this->empresa(), $pedido),
        ]);
    }

    public function faturar(Request $request, Pedido $pedido): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaPed($pedido);

        $pedido->loadMissing(['itens', 'orcamento.adiantamentoTitulo', 'parceiro']);

        return response()->json([
            'data' => $this->faturamentos->faturar($this->empresa(), $pedido),
        ], 201);
    }

    public function estornar(Request $request, Faturamento $faturamento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaFat($faturamento);

        $data = $request->validate([
            'motivo' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        return response()->json([
            'data' => $this->faturamentos->estornar($this->empresa(), $faturamento, (string) $data['motivo']),
        ]);
    }

    public function emitirNf(Request $request, Faturamento $faturamento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaFat($faturamento);

        return response()->json([
            'data' => $this->faturamentos->emitirDocumentos($this->empresa(), $faturamento),
        ]);
    }

    public function consultarNf(Request $request, Faturamento $faturamento): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaFat($faturamento);

        return response()->json([
            'data' => $this->faturamentos->consultarDocumentos($this->empresa(), $faturamento),
        ]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('faturamento.ler') && ! $request->user()->can('financeiro.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('faturamento.escrever')) {
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

    private function assertEmpresaPed(Pedido $pedido): void
    {
        if ($pedido->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }

    private function assertEmpresaFat(Faturamento $faturamento): void
    {
        if ($faturamento->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
