<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $stage = (string) config('erp.stage', 'local');

        return response()->json([
            'status' => 'ok',
            'app' => config('app.name'),
            'stage' => $stage,
            'env' => config('app.env'),
            'debug' => (bool) config('app.debug'),
            'time' => now()->toIso8601String(),
        ]);
    }
}
