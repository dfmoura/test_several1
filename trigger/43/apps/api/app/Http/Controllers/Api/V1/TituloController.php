<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\Titulo;
use App\Services\Financeiro\TituloService;
use App\Support\TituloValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TituloController extends Controller
{
    public function __construct(private readonly TituloService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate(TituloValidationRules::listFilters());

        $tipo = strtoupper((string) ($validated['tipo'] ?? Titulo::TIPO_PAGAR));
        $out = $this->service->listCarteira($this->empresa(), $tipo, $validated);

        return response()->json($out);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(TituloValidationRules::criarAvulso());
        $titulo = $this->service->criarAvulso($this->empresa(), $data);

        return response()->json(['data' => $this->service->toOut($titulo)], 201);
    }

    public function show(Request $request, Titulo $titulo): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($titulo);

        return response()->json(['data' => $this->service->toOut($titulo)]);
    }

    public function baixar(Request $request, Titulo $titulo): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($titulo);

        $data = $request->validate(TituloValidationRules::baixar());

        return response()->json([
            'data' => $this->service->baixar($this->empresa(), $titulo, $data),
        ], 201);
    }

    public function cancelar(Request $request, Titulo $titulo): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($titulo);

        $data = $request->validate(TituloValidationRules::cancelar());
        $titulo = $this->service->cancelarAvulso($this->empresa(), $titulo, $data['motivo']);

        return response()->json(['data' => $this->service->toOut($titulo)]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('financeiro.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('financeiro.escrever')) {
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

    private function assertEmpresa(Titulo $titulo): void
    {
        if ($titulo->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
