<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\FiscalHub;
use App\Services\Fiscal\FiscalHubService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FiscalHubController extends Controller
{
    public function __construct(private readonly FiscalHubService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeManage($request);
        $result = $this->service->list($this->empresa());

        return response()->json([
            'data' => $result['items'],
            'total' => $result['total'],
            'ativos' => $result['ativos'],
            'padrao_id' => $result['padrao_id'],
            'aviso' => $result['aviso'],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        $data = $request->validate([
            'nome' => ['required', 'string', 'min:2', 'max:120'],
            'provedor' => ['required', 'string', 'max:40', Rule::in(FiscalHub::PROVEDORES)],
            'ambiente_ativo' => ['sometimes', 'string', Rule::in(FiscalHub::AMBIENTES)],
            'padrao' => ['sometimes', 'boolean'],
            'ativo' => ['sometimes', 'boolean'],
            'base_url_homologacao' => ['nullable', 'string', 'max:500', 'url'],
            'base_url_producao' => ['nullable', 'string', 'max:500', 'url'],
            'token_homologacao' => ['nullable', 'string', 'min:8', 'max:500'],
            'token_producao' => ['nullable', 'string', 'min:8', 'max:500'],
            'meta' => ['nullable', 'array'],
        ]);

        $out = $this->service->create($this->empresa(), $data);

        return response()->json(['data' => $out], 201);
    }

    public function show(Request $request, FiscalHub $fiscalHub): JsonResponse
    {
        $this->authorizeManage($request);
        $this->assertEmpresa($fiscalHub);

        return response()->json(['data' => $this->service->toOut($fiscalHub)]);
    }

    public function update(Request $request, FiscalHub $fiscalHub): JsonResponse
    {
        $this->authorizeManage($request);
        $this->assertEmpresa($fiscalHub);

        $data = $request->validate([
            'nome' => ['sometimes', 'string', 'min:2', 'max:120'],
            'provedor' => ['sometimes', 'string', 'max:40', Rule::in(FiscalHub::PROVEDORES)],
            'ambiente_ativo' => ['sometimes', 'string', Rule::in(FiscalHub::AMBIENTES)],
            'padrao' => ['sometimes', 'boolean'],
            'ativo' => ['sometimes', 'boolean'],
            'base_url_homologacao' => ['nullable', 'string', 'max:500', 'url'],
            'base_url_producao' => ['nullable', 'string', 'max:500', 'url'],
            'token_homologacao' => ['nullable', 'string', 'min:8', 'max:500'],
            'token_producao' => ['nullable', 'string', 'min:8', 'max:500'],
            'meta' => ['nullable', 'array'],
        ]);

        $out = $this->service->update($fiscalHub, $data);

        return response()->json(['data' => $out]);
    }

    public function destroy(Request $request, FiscalHub $fiscalHub): JsonResponse
    {
        $this->authorizeManage($request);
        $this->assertEmpresa($fiscalHub);

        $id = $fiscalHub->id;
        $this->service->delete($fiscalHub);

        return response()->json(['ok' => true, 'id' => $id]);
    }

    public function testar(Request $request, FiscalHub $fiscalHub): JsonResponse
    {
        $this->authorizeManage($request);
        $this->assertEmpresa($fiscalHub);

        $data = $request->validate([
            'ambiente' => ['sometimes', 'string', Rule::in(FiscalHub::AMBIENTES)],
        ]);

        return response()->json($this->service->testar($fiscalHub, $data['ambiente'] ?? null));
    }

    private function authorizeManage(Request $request): void
    {
        if (! $request->user()->can('fiscal.hubs.gerir')) {
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

    private function assertEmpresa(FiscalHub $hub): void
    {
        if ($hub->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
