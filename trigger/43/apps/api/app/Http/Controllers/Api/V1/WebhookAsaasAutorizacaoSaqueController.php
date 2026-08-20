<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Banking\Asaas\AsaasAutorizacaoSaqueService;
use App\Services\Banking\Asaas\AsaasWebhookAuthenticator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoint exclusivo do mecanismo ASAAS de validação de saque.
 * Resposta no contrato do provedor ({status}), sem envelope {data}.
 */
class WebhookAsaasAutorizacaoSaqueController extends Controller
{
    public function __construct(
        private readonly AsaasWebhookAuthenticator $auth,
        private readonly AsaasAutorizacaoSaqueService $service,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $esperado = $this->auth->tokenSaque();
        if ($esperado === '') {
            return response()->json([
                'status' => 'REFUSED',
                'refuseReason' => 'Token de autorização de saque não configurado.',
            ]);
        }

        if (! $this->auth->headerConfere($request, $esperado)) {
            return response()->json([
                'status' => 'REFUSED',
                'refuseReason' => 'Token inválido.',
            ], 401);
        }

        $payload = $request->all();
        if ($payload === []) {
            $decoded = json_decode($request->getContent(), true);
            $payload = is_array($decoded) ? $decoded : [];
        }

        return response()->json($this->service->decidir($payload));
    }
}
