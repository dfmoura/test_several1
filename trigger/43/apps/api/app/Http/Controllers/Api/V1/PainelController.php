<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Services\Plataforma\PainelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PainelController extends Controller
{
    public function __construct(private readonly PainelService $painel) {}

    public function show(Request $request): JsonResponse
    {
        $empresa = app()->bound('empresa') ? app('empresa') : null;
        if (! $empresa instanceof Empresa) {
            return response()->json([
                'data' => $this->painel->montarSemEmpresa($request->user()),
            ]);
        }

        return response()->json([
            'data' => $this->painel->montar($request->user(), $empresa),
        ]);
    }
}
