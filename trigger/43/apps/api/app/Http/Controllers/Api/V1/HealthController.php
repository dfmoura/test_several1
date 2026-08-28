<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $stage = (string) config('erp.stage', 'local');
        $mailer = (string) config('mail.default', 'log');
        $from = trim((string) config('mail.from.address', ''));
        $viazapUrl = trim((string) config('erp.viazap.base_url', ''));
        $viazapToken = trim((string) config('erp.viazap.token', ''));

        return response()->json([
            'status' => 'ok',
            'app' => config('app.name'),
            'stage' => $stage,
            'env' => config('app.env'),
            'debug' => (bool) config('app.debug'),
            'time' => now()->toIso8601String(),
            // Diagnóstico ops (sem segredo): git não leva MAIL_*/VIAZAP_* — ver .env.aws.
            'envio_proposta' => [
                'email_auto' => (bool) config('erp.orcamento_email_auto', true),
                'mail_mailer' => $mailer,
                'mail_from_configurado' => $from !== '' && filter_var($from, FILTER_VALIDATE_EMAIL) !== false,
                'mail_smtp_pronto' => $mailer === 'smtp'
                    && trim((string) config('mail.mailers.smtp.host', '')) !== ''
                    && trim((string) config('mail.mailers.smtp.username', '')) !== '',
                'whatsapp_auto' => (bool) config('erp.orcamento_whatsapp_auto', true),
                'viazap_configurado' => $viazapUrl !== '' && $viazapToken !== '',
            ],
        ]);
    }
}
