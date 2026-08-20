<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Services\Comercial\PedidoService;
use App\Services\Producao\OrdemProducaoService;
use App\Services\Producao\OrdemServicoService;
use App\Services\Producao\RastreioInsumosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PedidoController extends Controller
{
    public function __construct(
        private readonly PedidoService $pedidos,
        private readonly OrdemProducaoService $ops,
        private readonly OrdemServicoService $oss,
        private readonly RastreioInsumosService $rastreio,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'in:'.implode(',', Pedido::STATUSES)],
        ]);

        return response()->json([
            'data' => $this->pedidos->list(
                $this->empresa(),
                $validated['q'] ?? null,
                $validated['status'] ?? null,
            ),
            'meta' => ['statuses' => Pedido::STATUSES],
        ]);
    }

    public function show(Request $request, Pedido $pedido): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($pedido);

        $data = $this->pedidos->show($pedido);
        $data['rastreio'] = $this->rastreio->paraPedido($this->empresa(), $pedido);

        return response()->json(['data' => $data]);
    }

    public function abrirOp(Request $request, Pedido $pedido): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($pedido);

        $data = $request->validate([
            'pedido_item_id' => ['required', 'integer'],
        ]);

        $item = PedidoItem::query()
            ->where('pedido_id', $pedido->id)
            ->where('id', (int) $data['pedido_item_id'])
            ->firstOrFail();

        return response()->json([
            'data' => $this->ops->abrir($this->empresa(), $pedido, $item),
        ], 201);
    }

    public function abrirOs(Request $request, Pedido $pedido): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($pedido);

        $data = $request->validate([
            'pedido_item_id' => ['required', 'integer'],
        ]);

        $item = PedidoItem::query()
            ->where('pedido_id', $pedido->id)
            ->where('id', (int) $data['pedido_item_id'])
            ->firstOrFail();

        return response()->json([
            'data' => $this->oss->abrir($this->empresa(), $pedido, $item),
        ], 201);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('producao.ler') && ! $request->user()->can('orcamento.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('producao.escrever')) {
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

    private function assertEmpresa(Pedido $pedido): void
    {
        if ($pedido->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
