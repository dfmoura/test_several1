<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Plataforma\BillingCatalogoService;
use App\Support\PlatformRbac;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingCatalogoController extends Controller
{
    public function __construct(private readonly BillingCatalogoService $catalogo) {}

    public function show(Request $request): JsonResponse
    {
        $this->exigir($request, 'plataforma.billing.gerir');

        return response()->json(['data' => $this->catalogo->apresentar()]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->exigir($request, 'plataforma.billing.gerir');

        $data = $request->validate([
            'valor' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'ciclo' => ['nullable', 'string', 'max:24'],
            'descricao' => ['nullable', 'string', 'max:255'],
        ]);

        return response()->json([
            'data' => $this->catalogo->salvar($data, $request->user()),
        ]);
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
