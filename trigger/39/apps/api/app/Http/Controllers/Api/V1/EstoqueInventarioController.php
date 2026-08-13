<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\EstoqueInventario;
use App\Models\EstoqueInventarioItem;
use App\Services\Estoque\EstoqueInventarioService;
use App\Support\EstoqueValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EstoqueInventarioController extends Controller
{
    public function __construct(
        private readonly EstoqueInventarioService $inventarios,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        $validated = $request->validate(EstoqueValidationRules::inventarioList());

        return response()->json([
            'data' => $this->inventarios->list(
                $this->empresa(),
                $validated['status'] ?? null,
                $validated['tipo'] ?? null,
            ),
            'meta' => $this->inventarios->meta(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeEstoqueWrite($request);

        $data = $request->validate(EstoqueValidationRules::inventarioCreate());

        return response()->json([
            'data' => $this->inventarios->create($this->empresa(), $data),
        ], 201);
    }

    public function show(Request $request, EstoqueInventario $estoqueInventario): JsonResponse
    {
        $this->authorizeEstoqueRead($request);
        $this->assertEmpresa($estoqueInventario);

        $cego = ! $request->boolean('completo');

        return response()->json([
            'data' => $this->inventarios->show($this->empresa(), $estoqueInventario, $cego),
            'meta' => $this->inventarios->meta(),
        ]);
    }

    public function contar1(
        Request $request,
        EstoqueInventario $estoqueInventario,
        EstoqueInventarioItem $item,
    ): JsonResponse {
        $this->authorizeEstoqueWrite($request);
        $this->assertEmpresa($estoqueInventario);
        $this->assertItem($estoqueInventario, $item);

        $data = $request->validate(EstoqueValidationRules::inventarioContagem());

        return response()->json([
            'data' => $this->inventarios->contar1(
                $this->empresa(),
                $estoqueInventario,
                $item,
                $data,
                $request->user(),
            ),
        ]);
    }

    public function contar2(
        Request $request,
        EstoqueInventario $estoqueInventario,
        EstoqueInventarioItem $item,
    ): JsonResponse {
        $this->authorizeEstoqueWrite($request);
        $this->assertEmpresa($estoqueInventario);
        $this->assertItem($estoqueInventario, $item);

        $data = $request->validate(EstoqueValidationRules::inventarioContagem());

        return response()->json([
            'data' => $this->inventarios->contar2(
                $this->empresa(),
                $estoqueInventario,
                $item,
                $data,
                $request->user(),
            ),
        ]);
    }

    public function gerarAjuste(
        Request $request,
        EstoqueInventario $estoqueInventario,
        EstoqueInventarioItem $item,
    ): JsonResponse {
        $this->authorizeEstoqueWrite($request);
        $this->assertEmpresa($estoqueInventario);
        $this->assertItem($estoqueInventario, $item);

        $data = $request->validate(EstoqueValidationRules::inventarioGerarAjuste());

        return response()->json([
            'data' => $this->inventarios->gerarAjuste(
                $this->empresa(),
                $estoqueInventario,
                $item,
                $data,
            ),
        ], 201);
    }

    public function encerrar(Request $request, EstoqueInventario $estoqueInventario): JsonResponse
    {
        $this->authorizeEstoqueWrite($request);
        $this->assertEmpresa($estoqueInventario);

        return response()->json([
            'data' => $this->inventarios->encerrar($this->empresa(), $estoqueInventario),
        ]);
    }

    public function cancelar(Request $request, EstoqueInventario $estoqueInventario): JsonResponse
    {
        $this->authorizeEstoqueWrite($request);
        $this->assertEmpresa($estoqueInventario);

        return response()->json([
            'data' => $this->inventarios->cancelar($this->empresa(), $estoqueInventario),
        ]);
    }

    private function authorizeEstoqueRead(Request $request): void
    {
        if (! $request->user()->can('estoque.ler')) {
            abort(403);
        }
    }

    private function authorizeEstoqueWrite(Request $request): void
    {
        if (! $request->user()->can('estoque.escrever')) {
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

    private function assertEmpresa(EstoqueInventario $inv): void
    {
        if ($inv->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }

    private function assertItem(EstoqueInventario $inv, EstoqueInventarioItem $item): void
    {
        if ($item->inventario_id !== $inv->id || $item->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
