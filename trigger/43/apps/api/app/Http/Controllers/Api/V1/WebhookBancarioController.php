<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Banking\Asaas\AsaasWebhookAuthenticator;
use App\Services\Financeiro\WebhookBancarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Webhooks bancários (sem Sanctum) — BankProvider parse + BX idempotente. */
class WebhookBancarioController extends Controller
{
    public function __construct(
        private readonly WebhookBancarioService $service,
        private readonly AsaasWebhookAuthenticator $asaasAuth,
    ) {}

    public function __invoke(Request $request, string $provider): JsonResponse
    {
        $provider = strtolower(trim($provider));
        if (! in_array($provider, ['mock', 'inter', 'asaas'], true)) {
            abort(404);
        }

        if ($provider === 'asaas') {
            $esperado = $this->asaasAuth->tokenEventos();
            if ($esperado !== '' && ! $this->asaasAuth->headerConfere($request, $esperado)) {
                return response()->json(['message' => 'Token inválido.'], 401);
            }
        }

        $payload = $request->all();
        if ($payload === []) {
            $raw = $request->getContent();
            $decoded = json_decode($raw, true);
            $payload = is_array($decoded) ? $decoded : [];
        }

        $empresaHint = $request->header('X-Empresa-Id');
        $hint = is_numeric($empresaHint) ? (int) $empresaHint : null;

        try {
            $result = $this->service->ingest($provider, $payload, $hint);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Falha ao processar webhook.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Erro ao processar webhook.',
                'error' => $e->getMessage(),
            ], 500);
        }

        $status = ($result['resultado'] ?? '') === 'ERRO' ? 422 : 200;

        return response()->json(['data' => $result], $status);
    }
}
