<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Plataforma\InterIntegracaoService;
use App\Support\PlatformRbac;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class InterIntegracaoController extends Controller
{
    public function __construct(private readonly InterIntegracaoService $inter) {}

    public function show(Request $request): JsonResponse
    {
        $this->exigir($request, 'plataforma.integracoes.gerir');

        return response()->json(['data' => $this->inter->apresentar()]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->exigir($request, 'plataforma.integracoes.gerir');

        $data = $request->validate([
            'operador' => ['nullable', 'string', 'max:32'],
            'client_id' => ['nullable', 'string', 'max:255'],
            'client_secret' => ['nullable', 'string', 'max:255'],
            'webhook_secret' => ['nullable', 'string', 'max:255'],
            'cert_pem' => ['nullable', 'string', 'max:65535'],
            'key_pem' => ['nullable', 'string', 'max:65535'],
            'ambiente' => ['nullable', 'string', 'in:SANDBOX,PROD,sandbox,prod'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['ambiente'])) {
            $data['ambiente'] = strtoupper($data['ambiente']);
        }

        try {
            $out = $this->inter->salvar($data, $request->user());
        } catch (ValidationException $e) {
            throw $e;
        }

        return response()->json(['data' => $out]);
    }

    public function testar(Request $request): JsonResponse
    {
        $this->exigir($request, 'plataforma.integracoes.gerir');

        return response()->json(['data' => $this->inter->testar()]);
    }

    private function exigir(Request $request, string $permission): void
    {
        $user = $request->user();
        if ($user === null) {
            abort(403, 'Sem permissão para esta operação da plataforma.');
        }

        if ($user->hasRole(PlatformRbac::ROLE)) {
            return;
        }

        if ($user->can($permission) || $user->can('plataforma.operar')) {
            return;
        }

        abort(403, 'Sem permissão para esta operação da plataforma.');
    }
}
