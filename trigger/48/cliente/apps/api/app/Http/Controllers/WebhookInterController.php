<?php

namespace App\Http\Controllers;

use App\Domain\Cobranca\BaixaPix;
use App\Models\WebhookInbox;
use App\Suporte\Dinheiro;
use Illuminate\Http\Request;

class WebhookInterController extends Controller
{
    public function __invoke(Request $request, BaixaPix $baixa)
    {
        if (config('pix.driver') !== 'inter') {
            abort(404);
        }
        $entrega = (string) ($request->header('X-Inter-Entrega') ?: hash('sha256', $request->getContent()));
        $existente = WebhookInbox::query()->where('entrega_id', $entrega)->first();
        if ($existente?->processado_em) {
            return response()->noContent();
        }
        $inbox = $existente ?: WebhookInbox::query()->create([
            'provedor' => 'inter',
            'entrega_id' => $entrega,
            'payload' => $request->json()->all(),
            'recebido_em' => now(),
        ]);
        try {
            foreach ($request->input('pix', []) as $item) {
                if (! is_array($item) || empty($item['txid']) || empty($item['endToEndId']) || empty($item['valor'])) {
                    continue;
                }
                $baixa->confirmar(
                    (string) $item['txid'],
                    (string) $item['endToEndId'],
                    Dinheiro::centavosDePix((string) $item['valor']),
                );
            }
            $inbox->processado_em = now();
            $inbox->erro = null;
            $inbox->save();
        } catch (\Throwable $e) {
            $inbox->erro = $e->getMessage();
            $inbox->save();

            return response()->json(['message' => 'Falha ao processar o aviso.'], 500);
        }

        return response()->noContent();
    }
}
