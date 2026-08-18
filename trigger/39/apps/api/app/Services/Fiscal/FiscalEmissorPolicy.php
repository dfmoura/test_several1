<?php

namespace App\Services\Fiscal;

/**
 * Emissor de teste (stub) — só local/testing, e só na ausência de hub Focus apto.
 *
 * Homologação e produção nunca autorizam por este caminho, mesmo com
 * FISCAL_EMISSOR=stub no .env. Estudo 32: HML usa Focus homolog + A1 de homolog;
 * DEV usa mock. Numeração SEFAZ de verdade continua só na resposta do hub.
 */
final class FiscalEmissorPolicy
{
    public const EMISSOR_FOCUS = 'focus';

    public const EMISSOR_STUB = 'stub';

    /** @var list<string> */
    private const STAGES_LIBERADOS = ['local', 'testing', 'dev', 'development'];

    /** @var list<string> */
    private const STAGES_BLOQUEADOS = [
        'homolog',
        'homologacao',
        'production',
        'prod',
        'producao',
    ];

    public function configuradoComoStub(): bool
    {
        return strtolower(trim((string) config('erp.fiscal_emissor', self::EMISSOR_FOCUS))) === self::EMISSOR_STUB;
    }

    /**
     * Stub pode existir neste processo (stage local/testing). Ainda assim o hub
     * Focus apto ganha — ver {@see ativoNaAusenciaDoHub()}.
     */
    public function permitido(): bool
    {
        if (! $this->configuradoComoStub()) {
            return false;
        }

        $stage = strtolower(trim((string) config('erp.stage', 'local')));
        if (in_array($stage, self::STAGES_BLOQUEADOS, true)) {
            return false;
        }
        if (app()->environment('production')) {
            return false;
        }

        return in_array($stage, self::STAGES_LIBERADOS, true)
            || app()->environment(['local', 'testing', 'development']);
    }

    public function ativoNaAusenciaDoHub(bool $hubApto): bool
    {
        return $this->permitido() && ! $hubApto;
    }

    /**
     * @return array{ativo: bool, mensagem: string}
     */
    public function diagnostico(bool $hubApto): array
    {
        $ativo = $this->ativoNaAusenciaDoHub($hubApto);
        if (! $ativo) {
            return [
                'ativo' => false,
                'mensagem' => '',
            ];
        }

        return [
            'ativo' => true,
            'mensagem' => 'Autorização de teste (sem certificado A1). Sem valor fiscal. Quando o hub Focus estiver apto, o mesmo documento é enviado de verdade e esta numeração é substituída.',
        ];
    }
}
