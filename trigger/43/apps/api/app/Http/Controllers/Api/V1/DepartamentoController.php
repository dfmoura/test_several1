<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Departamento;
use App\Models\Empresa;
use App\Services\Cadastros\DepartamentoService;
use App\Support\DepartamentoValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartamentoController extends Controller
{
    public function __construct(private readonly DepartamentoService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'ativos' => ['nullable', 'boolean'],
        ]);

        $somenteAtivos = array_key_exists('ativos', $validated)
            ? (bool) $validated['ativos']
            : null;

        $data = $this->service->list(
            $this->empresa(),
            $validated['q'] ?? null,
            $somenteAtivos,
        );

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(DepartamentoValidationRules::rules(false));
        $dep = $this->service->create($this->empresa(), $data);

        return response()->json(['data' => $dep], 201);
    }

    public function seedCanonicos(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $result = $this->service->seedCanonicos($this->empresa());

        return response()->json([
            'data' => $result,
            'departamentos' => $this->service->list($this->empresa()),
        ]);
    }

    public function show(Request $request, Departamento $departamento): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($departamento);

        return response()->json(['data' => $this->service->show($departamento)]);
    }

    public function update(Request $request, Departamento $departamento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($departamento);

        $data = $request->validate(DepartamentoValidationRules::rules(true));

        return response()->json(['data' => $this->service->update($departamento, $data)]);
    }

    public function destroy(Request $request, Departamento $departamento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($departamento);

        $id = $departamento->id;
        $this->service->softDelete($departamento);

        return response()->json(['ok' => true, 'id' => $id]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('departamento.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('departamento.escrever')) {
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

    private function assertEmpresa(Departamento $departamento): void
    {
        if ($departamento->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
