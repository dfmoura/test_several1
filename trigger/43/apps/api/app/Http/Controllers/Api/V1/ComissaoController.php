<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Comissao;
use App\Models\ComissaoFechamento;
use App\Models\Empresa;
use App\Models\Pedido;
use App\Services\Financeiro\ComissaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComissaoController extends Controller
{
    public function __construct(private readonly ComissaoService $comissoes) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'in:'.implode(',', Comissao::STATUSES)],
            'vendedor_parceiro_id' => ['nullable', 'integer'],
            'pedido_id' => ['nullable', 'integer'],
        ]);

        return response()->json([
            'data' => $this->comissoes->list($this->empresa(), $validated),
            'meta' => ['statuses' => Comissao::STATUSES],
        ]);
    }

    public function resumoPedido(Request $request, Pedido $pedido): JsonResponse
    {
        $this->authorizeRead($request);
        if ($pedido->empresa_id !== $this->empresa()->id) {
            abort(404);
        }

        return response()->json([
            'data' => $this->comissoes->resumoPedido($this->empresa(), $pedido),
        ]);
    }

    public function fechamentos(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json([
            'data' => $this->comissoes->listFechamentos($this->empresa()),
            'meta' => ['statuses' => ComissaoFechamento::STATUSES],
        ]);
    }

    public function showFechamento(Request $request, ComissaoFechamento $comissaoFechamento): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaFec($comissaoFechamento);

        return response()->json(['data' => $this->comissoes->showFechamento($comissaoFechamento)]);
    }

    public function fechar(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);
        $data = $request->validate([
            'comissao_ids' => ['nullable', 'array'],
            'comissao_ids.*' => ['integer'],
            'periodo_inicio' => ['nullable', 'date'],
            'periodo_fim' => ['nullable', 'date'],
            'vencimento' => ['nullable', 'date'],
            'observacao' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json([
            'data' => $this->comissoes->fechar($this->empresa(), $data),
        ], 201);
    }

    public function gerarPagamento(Request $request, ComissaoFechamento $comissaoFechamento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaFec($comissaoFechamento);

        return response()->json([
            'data' => $this->comissoes->gerarPagamento($this->empresa(), $comissaoFechamento),
        ]);
    }

    public function cancelarFechamento(Request $request, ComissaoFechamento $comissaoFechamento): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaFec($comissaoFechamento);
        $data = $request->validate([
            'motivo' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        return response()->json([
            'data' => $this->comissoes->cancelarFechamento(
                $this->empresa(),
                $comissaoFechamento,
                (string) $data['motivo'],
            ),
        ]);
    }

    private function authorizeRead(Request $request): void
    {
        if (
            ! $request->user()->can('comissao.ler')
            && ! $request->user()->can('financeiro.ler')
        ) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('comissao.escrever')) {
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

    private function assertEmpresaFec(ComissaoFechamento $fechamento): void
    {
        if ($fechamento->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
