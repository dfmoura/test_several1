<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Services\Plataforma\ImplantacaoAceiteService;
use App\Support\ImplantacaoCatalogo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImplantacaoController extends Controller
{
    public function __construct(private readonly ImplantacaoAceiteService $service) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorizeLer($request);
        $empresa = $this->empresaDoContexto($request);

        return response()
            ->json(['data' => $this->service->matriz($empresa)])
            ->header('Cache-Control', 'no-store, private');
    }

    public function validar(Request $request, string $codigo): JsonResponse
    {
        $empresa = $this->empresaDoContexto($request);

        $data = $request->validate([
            'eixo' => ['required', 'string', 'in:dev,cliente'],
            'status' => ['required', 'string', 'in:'.implode(',', ImplantacaoCatalogo::statuses())],
            'observacao' => ['nullable', 'string', 'max:500'],
        ]);

        if ($data['eixo'] === 'dev') {
            $this->authorizeValidarDev($request);
        } else {
            $this->authorizeValidarCliente($request);
        }

        $item = $this->service->validar($empresa, $codigo, $request->user(), $data);

        return response()->json(['data' => $item]);
    }

    private function empresaDoContexto(Request $request): Empresa
    {
        $empresa = $request->attributes->get('empresa');
        if (! $empresa instanceof Empresa) {
            abort(422, 'Selecione uma empresa ativa para ver a implantação.');
        }

        return $empresa;
    }

    private function authorizeLer(Request $request): void
    {
        $user = $request->user();
        // Alinha ao front (ADMIN enxerga módulos do produto) e cobre cache Spatie stale no serve.
        if ($user->hasRole('ADMIN') || $user->can('implantacao.ler')) {
            return;
        }
        abort(403, 'Sem permissão para ver a implantação.');
    }

    private function authorizeValidarDev(Request $request): void
    {
        $user = $request->user();
        if ($user->hasRole('ADMIN') || $user->can('implantacao.validar_dev')) {
            return;
        }
        abort(403, 'Sem permissão para validar (desenvolvimento).');
    }

    private function authorizeValidarCliente(Request $request): void
    {
        $user = $request->user();
        if ($user->hasRole('ADMIN') || $user->can('implantacao.validar_cliente')) {
            return;
        }
        abort(403, 'Sem permissão para validar (cliente).');
    }
}
