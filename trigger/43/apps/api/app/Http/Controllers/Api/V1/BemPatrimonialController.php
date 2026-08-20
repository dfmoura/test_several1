<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BemPatrimonial;
use App\Models\Empresa;
use App\Services\Cadastros\BemPatrimonialService;
use App\Support\BemPatrimonialValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BemPatrimonialController extends Controller
{
    public function __construct(private readonly BemPatrimonialService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'categoria' => ['nullable', 'string', 'max:32'],
            'status' => ['nullable', 'string', 'max:24'],
        ]);

        $data = $this->service->list(
            $this->empresa(),
            $validated['q'] ?? null,
            $validated['categoria'] ?? null,
            $validated['status'] ?? null,
        );

        return response()->json([
            'data' => $data,
            'meta' => [
                'capitalizacao' => $this->service->metaCapitalizacao($this->empresa()),
                'categorias' => BemPatrimonial::CATEGORIAS,
                'statuses' => BemPatrimonial::STATUSES,
                'grupos_hora_maquina' => $this->service->gruposHoraMaquinaDisponiveis($this->empresa()),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(
            BemPatrimonialValidationRules::rules(false, $this->empresa()->id)
        );

        $bem = $this->service->create($this->empresa(), $data);

        return response()->json(['data' => $bem], 201);
    }

    public function seedModelo(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $result = $this->service->seedModeloInicial($this->empresa());

        return response()->json([
            'data' => $result,
            'bens' => $this->service->list($this->empresa()),
        ]);
    }

    public function show(Request $request, BemPatrimonial $bem): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($bem);

        return response()->json(['data' => $this->service->show($bem)]);
    }

    public function update(Request $request, BemPatrimonial $bem): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($bem);

        $data = $request->validate(
            BemPatrimonialValidationRules::rules(true, $this->empresa()->id)
        );

        return response()->json(['data' => $this->service->update($bem, $data)]);
    }

    public function destroy(Request $request, BemPatrimonial $bem): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($bem);

        $id = $bem->id;
        $this->service->softDelete($bem);

        return response()->json(['ok' => true, 'id' => $id]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('patrimonio.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('patrimonio.escrever')) {
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

    private function assertEmpresa(BemPatrimonial $bem): void
    {
        if ($bem->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
