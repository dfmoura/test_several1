<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\OrdemProducao;
use App\Services\Estoque\EstoqueVolumeService;
use App\Services\Producao\OrdemProducaoService;
use App\Support\PadraoDecimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Porta do almoxarifado da coleta dirigida — mesmo motor da OP.
 */
class EstoqueRetiradaController extends Controller
{
    public function __construct(
        private readonly OrdemProducaoService $service,
        private readonly EstoqueVolumeService $volumes,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeFila($request);

        return response()->json([
            'data' => $this->service->filaRetiradas($this->empresa()),
        ]);
    }

    public function show(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeFila($request);
        $this->assertEmpresa($ordemProducao);

        return response()->json(['data' => $this->service->show($ordemProducao)]);
    }

    public function preview(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeFila($request);
        $this->assertEmpresa($ordemProducao);

        $data = $request->validate([
            'material_id' => ['nullable', 'integer'],
            'produto_id' => ['nullable', 'integer'],
            'qtde' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)),
        ]);

        return response()->json([
            'data' => $this->service->previewRetirada($this->empresa(), $ordemProducao, $data),
        ]);
    }

    public function avaria(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeChaoWrite($request);
        $this->assertEmpresa($ordemProducao);

        $data = $request->validate([
            'material_id' => ['required', 'integer'],
            'qtde' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)),
            'motivo' => ['nullable', 'string', 'max:255'],
        ]);

        return response()->json([
            'data' => $this->service->registrarAvaria($this->empresa(), $ordemProducao, $data),
        ]);
    }

    public function resolverVolume(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeFila($request);
        $this->assertEmpresa($ordemProducao);

        $data = $request->validate([
            'payload' => ['required', 'string', 'max:120'],
        ]);

        return response()->json([
            'data' => $this->volumes->resolverVolumePorQr($this->empresa(), $data['payload']),
        ]);
    }

    public function confirmar(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeChaoWrite($request);
        $this->assertEmpresa($ordemProducao);

        $data = $request->validate([
            'linhas' => ['required', 'array', 'min:1'],
            'linhas.*.material_id' => ['nullable', 'integer'],
            'linhas.*.produto_id' => ['nullable', 'integer'],
            'linhas.*.qtde' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)),
            'linhas.*.complementar' => ['sometimes', 'boolean'],
            'linhas.*.volumes' => ['nullable', 'array'],
            'linhas.*.volumes.*.lote_id' => ['required_with:linhas.*.volumes', 'integer'],
            'linhas.*.volumes.*.qtde' => array_merge(
                ['required_with:linhas.*.volumes'],
                PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)
            ),
            'linhas.*.volumes_motivo' => ['nullable', 'string', 'max:255'],
        ]);

        $last = null;
        foreach ($data['linhas'] as $idx => $linha) {
            if (! is_array($linha)) {
                throw ValidationException::withMessages([
                    "linhas.{$idx}" => ['Linha inválida.'],
                ]);
            }
            $materialId = (int) ($linha['material_id'] ?? 0);
            $produtoId = (int) ($linha['produto_id'] ?? 0);
            if ($materialId <= 0 && $produtoId <= 0) {
                throw ValidationException::withMessages([
                    "linhas.{$idx}" => ['Informe material_id ou produto_id.'],
                ]);
            }
            $payload = [];
            if ($materialId > 0) {
                $payload['material_id'] = $materialId;
            } else {
                $payload['produto_id'] = $produtoId;
            }
            if (isset($linha['qtde']) && $linha['qtde'] !== '' && $linha['qtde'] !== null) {
                $payload['qtde'] = $linha['qtde'];
            }
            if (! empty($linha['complementar'])) {
                $payload['complementar'] = true;
            }
            if (! empty($linha['volumes']) && is_array($linha['volumes'])) {
                $payload['volumes'] = $linha['volumes'];
            }
            if (! empty($linha['volumes_motivo'])) {
                $payload['volumes_motivo'] = $linha['volumes_motivo'];
            }
            $last = $this->service->requisitarMaterial($this->empresa(), $ordemProducao->fresh(), $payload);
        }

        return response()->json(['data' => $last]);
    }

    private function authorizeFila(Request $request): void
    {
        $user = $request->user();
        if (! $user->can('estoque.ler') && ! $user->can('producao.ler')) {
            abort(403);
        }
    }

    private function authorizeChaoWrite(Request $request): void
    {
        $user = $request->user();
        if (! $user->can('producao.escrever') && ! $user->can('estoque.escrever')) {
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
