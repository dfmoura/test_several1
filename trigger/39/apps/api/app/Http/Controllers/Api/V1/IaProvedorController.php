<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\IaProvedor;
use App\Services\Ia\IaProvedorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IaProvedorController extends Controller
{
    public function __construct(private readonly IaProvedorService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        $result = $this->service->list();

        return response()->json([
            'data' => $result['items'],
            'total' => $result['total'],
            'ativos' => $result['ativos'],
            'aviso_custo' => $result['aviso_custo'],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        $data = $request->validate([
            'nome' => ['required', 'string', 'min:2', 'max:120'],
            'provedor' => ['required', 'string', 'max:40', Rule::in(IaProvedor::PROVEDORES)],
            'base_url' => ['nullable', 'string', 'max:500'],
            'modelo' => ['nullable', 'string', 'max:120'],
            'api_key' => ['required', 'string', 'min:8', 'max:500'],
            'prioridade' => ['sometimes', 'integer', 'min:1', 'max:9999'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        $out = $this->service->create($data);

        return response()->json(['data' => $out], 201);
    }

    public function show(Request $request, IaProvedor $iaProvedor): JsonResponse
    {
        $this->authorizeManage($request);

        return response()->json(['data' => $this->service->toOut($iaProvedor)]);
    }

    public function update(Request $request, IaProvedor $iaProvedor): JsonResponse
    {
        $this->authorizeManage($request);

        $data = $request->validate([
            'nome' => ['sometimes', 'string', 'min:2', 'max:120'],
            'provedor' => ['sometimes', 'string', 'max:40', Rule::in(IaProvedor::PROVEDORES)],
            'base_url' => ['nullable', 'string', 'max:500'],
            'modelo' => ['nullable', 'string', 'max:120'],
            'api_key' => ['nullable', 'string', 'min:8', 'max:500'],
            'prioridade' => ['sometimes', 'integer', 'min:1', 'max:9999'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        $out = $this->service->update($iaProvedor, $data);

        return response()->json(['data' => $out]);
    }

    public function destroy(Request $request, IaProvedor $iaProvedor): JsonResponse
    {
        $this->authorizeManage($request);

        $id = $iaProvedor->id;
        $this->service->delete($iaProvedor);

        return response()->json(['ok' => true, 'id' => $id]);
    }

    public function testar(Request $request, IaProvedor $iaProvedor): JsonResponse
    {
        $this->authorizeManage($request);

        return response()->json($this->service->testar($iaProvedor));
    }

    private function authorizeManage(Request $request): void
    {
        if (! $request->user()->can('ia.provedores.gerir')) {
            abort(403);
        }
    }
}
