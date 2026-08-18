<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CessaoBem;
use App\Models\Empresa;
use App\Services\Cadastros\CessaoBemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CessaoBemController extends Controller
{
    public function __construct(private readonly CessaoBemService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $filters = $request->validate([
            'bem_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', Rule::in(CessaoBem::STATUSES)],
        ]);

        return response()->json([
            'data' => $this->service->list(
                $this->empresa(),
                isset($filters['bem_id']) ? (int) $filters['bem_id'] : null,
                $filters['status'] ?? null,
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);
        $data = $request->validate([
            'bem_id' => ['required', 'integer'],
            'parceiro_id' => ['required', 'integer'],
            'tipo' => ['required', 'string', Rule::in(CessaoBem::TIPOS)],
            'iniciado_em' => ['nullable', 'date'],
            'encerra_previsto_em' => ['nullable', 'date', 'after_or_equal:iniciado_em'],
            'valor_mensal' => ['nullable', 'numeric', 'min:0'],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ]);

        return response()->json(['data' => $this->service->create($this->empresa(), $data)], 201);
    }

    public function show(Request $request, CessaoBem $cessaoBem): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($cessaoBem);

        return response()->json(['data' => $this->service->show($cessaoBem)]);
    }

    public function encerrar(Request $request, CessaoBem $cessaoBem): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($cessaoBem);
        $data = $request->validate([
            'motivo' => ['required', 'string', 'min:3', 'max:240'],
        ]);

        return response()->json(['data' => $this->service->encerrar($cessaoBem, $data)]);
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

    private function assertEmpresa(CessaoBem $cessao): void
    {
        if ($cessao->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
