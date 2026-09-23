<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\OrdemProducao;
use App\Services\Producao\OrdemProducaoService;
use App\Support\PadraoDecimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrdemProducaoController extends Controller
{
    public function __construct(private readonly OrdemProducaoService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'in:'.implode(',', OrdemProducao::STATUSES)],
        ]);

        return response()->json([
            'data' => $this->service->list(
                $this->empresa(),
                $validated['q'] ?? null,
                $validated['status'] ?? null,
            ),
            'meta' => ['statuses' => OrdemProducao::STATUSES],
        ]);
    }

    public function show(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($ordemProducao);

        return response()->json(['data' => $this->service->show($ordemProducao)]);
    }

    public function requisitar(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemProducao);

        $data = $request->validate([
            'produto_id' => ['nullable', 'integer'],
            'material_id' => ['nullable', 'integer'],
            'qtde' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)),
        ]);

        if (empty($data['material_id']) && empty($data['produto_id'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'material_id' => ['Informe material_id (linha planejada) ou produto_id.'],
            ]);
        }

        return response()->json([
            'data' => $this->service->requisitarMaterial($this->empresa(), $ordemProducao, $data),
        ]);
    }

    public function requisitarPendentes(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemProducao);

        return response()->json([
            'data' => $this->service->requisitarPendentes($this->empresa(), $ordemProducao),
        ]);
    }

    public function concluir(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemProducao);

        $data = $request->validate([
            'qtde_boa' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, false)),
            'qtde_refugo' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)),
            'aceitar_fora_tolerancia' => ['sometimes', 'boolean'],
            'motivo_fora_tolerancia' => ['nullable', 'string', 'max:255'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'materiais' => ['nullable', 'array'],
            'materiais.*.material_id' => ['nullable', 'integer'],
            'materiais.*.produto_id' => ['nullable', 'integer'],
            'materiais.*.qtde_retorno' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)),
            'materiais.*.qtde_perda' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)),
        ]);

        return response()->json([
            'data' => $this->service->concluir($this->empresa(), $ordemProducao, $data),
        ]);
    }

    public function devolverAoPedido(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemProducao);

        $data = $request->validate([
            'motivo' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        return response()->json([
            'data' => $this->service->devolverAoPedido(
                $this->empresa(),
                $ordemProducao,
                (string) $data['motivo'],
            ),
        ]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('producao.ler')) {
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

    private function assertEmpresa(OrdemProducao $op): void
    {
        if ($op->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
