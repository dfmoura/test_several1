<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Comercial\FacasMapaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacasController extends Controller
{
    public function __construct(private readonly FacasMapaService $facasMapaService) {}

    public function index(Request $request): JsonResponse
    {
        // Qualquer usuário autenticado no contexto (mesmo padrão do 36).
        if (! $request->user()) {
            abort(401);
        }

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'medida' => ['nullable', 'string', 'max:64'],
            'maquina' => ['nullable', 'string', 'max:64'],
            'formato' => ['nullable', 'string', 'max:64'],
            'so_completas' => ['nullable', 'boolean'],
            'completas' => ['nullable', 'boolean'],
        ]);

        // Query string "true"/"1" → boolean
        foreach (['so_completas', 'completas'] as $flag) {
            if ($request->has($flag)) {
                $validated[$flag] = filter_var($request->query($flag), FILTER_VALIDATE_BOOLEAN);
            }
        }

        $data = $this->facasMapaService->list($validated);

        return response()->json($data);
    }
}
