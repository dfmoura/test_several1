<?php

namespace App\Services\Fiscal;

/**
 * Emissor de teste (stub) — só local/testing, na ausência do canal SEFAZ.
 *
 * Homologação e produção nunca autorizam por este caminho.
 * NF-e oficial = SEFAZ + A1 (`ADR_EMISSAO_NFE_SEFAZ_DIRETO`).
 */
final class FiscalEmissorPolicy
{
    public const EMISSOR_STUB = 'stub';

    public const EMISSOR_SEFAZ = 'sefaz';

    /** Legado — tratado como sefaz no caminho NF-e. */
    public const EMISSOR_FOCUS = 'focus';

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
        $v = strtolower(trim((string) config('erp.fiscal_emissor', self::EMISSOR_STUB)));

        return $v === self::EMISSOR_STUB;
    }

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

    /**
     * Stub ativo quando permitido e o canal SEFAZ (A1/nuvem/fake) não está apto.
     */
    public function ativoNaAusenciaDoSefaz(bool $sefazApto): bool
    {
        return $this->permitido() && ! $sefazApto;
    }

    /** @deprecated use ativoNaAusenciaDoSefaz */
    public function ativoNaAusenciaDoHub(bool $hubApto): bool
    {
        return $this->ativoNaAusenciaDoSefaz($hubApto);
    }

    /**
     * @return array{ativo: bool, mensagem: string}
     */
    public function diagnostico(bool $sefazApto): array
    {
        $ativo = $this->ativoNaAusenciaDoSefaz($sefazApto);
        if (! $ativo) {
            return [
                'ativo' => false,
                'mensagem' => '',
            ];
        }

        return [
            'ativo' => true,
            'mensagem' => 'Autorização de teste (sem SEFAZ). Sem valor fiscal. Em homolog/produção a emissão usa o certificado A1 da empresa.',
        ];
    }
}
