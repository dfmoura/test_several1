<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ParametroEmpresa;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParametroController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->can('parametros.gerir')) {
            abort(403);
        }

        $empresa = app('empresa');
        $parametros = ParametroEmpresa::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('chave')
            ->get();

        return response()->json(['data' => $parametros]);
    }

    public function upsert(Request $request): JsonResponse
    {
        if (! $request->user()->can('parametros.gerir')) {
            abort(403);
        }

        $data = $request->validate([
            'chave' => ['required', 'string', 'max:80'],
            'valor' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', 'max:32'],
        ]);

        $empresa = app('empresa');
        $existing = ParametroEmpresa::query()
            ->where('empresa_id', $empresa->id)
            ->where('chave', $data['chave'])
            ->first();

        $before = $existing?->toArray();

        $parametro = ParametroEmpresa::query()->updateOrCreate(
            ['empresa_id' => $empresa->id, 'chave' => $data['chave']],
            [
                'valor' => $data['valor'] ?? null,
                'status' => $data['status'] ?? 'PENDENTE_RATIFICACAO',
                'versao' => ($existing?->versao ?? 0) + 1,
                'alterado_por' => $request->user()->id,
            ]
        );

        $this->auditLogger->log(
            $existing ? 'ATUALIZAR' : 'CRIAR',
            'parametro_empresa',
            $parametro->id,
            $before,
            $parametro->toArray()
        );

        return response()->json(['data' => $parametro], $existing ? 200 : 201);
    }
}
