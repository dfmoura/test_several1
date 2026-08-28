<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BacklogItem;
use App\Models\Empresa;
use App\Models\User;
use App\Services\Cadastros\BacklogService;
use App\Support\BacklogValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BacklogController extends Controller
{
    /** Lab: único usuário operacional autorizado (ADR_BACKLOG.md). */
    private const USUARIO_CODIGO = 'USR-00019';

    public function __construct(private readonly BacklogService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'situacao' => ['nullable', 'string', Rule::in(['abertos', 'concluidos', 'todos'])],
        ]);

        $situacao = $validated['situacao'] ?? null;
        if ($situacao === 'todos') {
            $situacao = null;
        }

        $data = $this->service->list(
            $this->empresa(),
            $validated['q'] ?? null,
            $situacao,
        );

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(BacklogValidationRules::rules(false));
        $item = $this->service->create($this->empresa(), $data);

        return response()->json(['data' => $item], 201);
    }

    public function show(Request $request, BacklogItem $backlogItem): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($backlogItem);

        return response()->json(['data' => $this->service->show($backlogItem)]);
    }

    public function update(Request $request, BacklogItem $backlogItem): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($backlogItem);

        $data = $request->validate(BacklogValidationRules::rules(true));

        return response()->json(['data' => $this->service->update($backlogItem, $data)]);
    }

    public function concluir(Request $request, BacklogItem $backlogItem): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($backlogItem);

        $data = $request->validate([
            'observacao_conclusao' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json(['data' => $this->service->concluir($backlogItem, $data)]);
    }

    public function reabrir(Request $request, BacklogItem $backlogItem): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($backlogItem);

        return response()->json(['data' => $this->service->reabrir($backlogItem)]);
    }

    public function destroy(Request $request, BacklogItem $backlogItem): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($backlogItem);

        $id = $backlogItem->id;
        $this->service->softDelete($backlogItem);

        return response()->json(['ok' => true, 'id' => $id]);
    }

    private function authorizeRead(Request $request): void
    {
        $user = $request->user();
        if ($this->podeConsultar($user)) {
            return;
        }

        abort(403, 'Sem permissão para consultar o backlog.');
    }

    private function authorizeWrite(Request $request): void
    {
        $user = $request->user();
        if ($this->podeEscrever($user)) {
            return;
        }

        abort(403, 'Sem permissão para lançar ou alterar o backlog.');
    }

    private function podeConsultar(mixed $user): bool
    {
        if (! $user instanceof User) {
            return false;
        }

        if ($user->codigo === self::USUARIO_CODIGO) {
            return true;
        }

        return $user->can('backlog.ler');
    }

    private function podeEscrever(mixed $user): bool
    {
        if (! $user instanceof User) {
            return false;
        }

        if ($user->codigo === self::USUARIO_CODIGO) {
            return true;
        }

        return $user->can('backlog.escrever');
    }

    private function empresa(): Empresa
    {
        $empresa = app('empresa');
        if (! $empresa instanceof Empresa) {
            abort(400, 'Empresa não selecionada.');
        }

        return $empresa;
    }

    private function assertEmpresa(BacklogItem $item): void
    {
        if ($item->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
