<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\Feriado;
use App\Services\Cadastros\FeriadoService;
use App\Support\FeriadoValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeriadoController extends Controller
{
    public function __construct(private readonly FeriadoService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'ativos' => ['nullable', 'boolean'],
            'ano' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $somenteAtivos = array_key_exists('ativos', $validated)
            ? (bool) $validated['ativos']
            : null;

        $data = $this->service->list(
            $this->empresa(),
            $validated['q'] ?? null,
            $somenteAtivos,
            isset($validated['ano']) ? (int) $validated['ano'] : null,
        );

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(FeriadoValidationRules::rules(false));
        $feriado = $this->service->create($this->empresa(), $data);

        return response()->json(['data' => $feriado], 201);
    }

    public function seedNacionais(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $validated = $request->validate([
            'ano' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        $result = $this->service->seedNacionais(
            $this->empresa(),
            isset($validated['ano']) ? (int) $validated['ano'] : null,
        );

        return response()->json([
            'data' => $result,
            'feriados' => $this->service->list($this->empresa(), null, null, $validated['ano'] ?? (int) now()->year),
        ]);
    }

    public function show(Request $request, Feriado $feriado): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($feriado);

        return response()->json(['data' => $this->service->show($feriado)]);
    }

    public function update(Request $request, Feriado $feriado): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($feriado);

        $data = $request->validate(FeriadoValidationRules::rules(true));

        return response()->json(['data' => $this->service->update($feriado, $data)]);
    }

    public function destroy(Request $request, Feriado $feriado): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($feriado);

        $id = $feriado->id;
        $this->service->softDelete($feriado);

        return response()->json(['ok' => true, 'id' => $id]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('feriado.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('feriado.escrever')) {
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

    private function assertEmpresa(Feriado $feriado): void
    {
        if ($feriado->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
