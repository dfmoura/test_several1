<?php

namespace App\Support;

use App\Models\Empresa;
use App\Models\ParametroEmpresa;
use Illuminate\Validation\ValidationException;

/**
 * Desfecho humano quando pedido × NF × conferido divergem.
 * Norma: ADR_OC_RASCUNHO_ENVIO · ADR_ENTRADA_XML_ASSIST.
 */
final class OcReceberDivergencia
{
    public const PARAM_POLITICA = 'compras.divergencia_volumes';

    /** Só alerta — desfecho opcional. */
    public const POLITICA_ALERTA = 'ALERTA';

    /** Exige desfecho para confirmar receber. */
    public const POLITICA_EXIGIR = 'EXIGIR_DESFECHO';

    public const DESFECHO_CONFORME_NF = 'RECEBER_CONFORME_NF';

    public const DESFECHO_PARCIAL_FISICO = 'RECEBER_PARCIAL_FISICO';

    public const DESFECHO_AGUARDAR = 'AGUARDAR_FORNECEDOR';

    public const DESFECHOS_RECEBIVEIS = [
        self::DESFECHO_CONFORME_NF,
        self::DESFECHO_PARCIAL_FISICO,
    ];

    public const DESFECHOS = [
        self::DESFECHO_CONFORME_NF,
        self::DESFECHO_PARCIAL_FISICO,
        self::DESFECHO_AGUARDAR,
    ];

    public static function politica(Empresa $empresa): string
    {
        $raw = ParametroEmpresa::query()
            ->where('empresa_id', $empresa->id)
            ->where('chave', self::PARAM_POLITICA)
            ->value('valor');
        $v = strtoupper(trim((string) ($raw ?? '')));
        if ($v === self::POLITICA_ALERTA || $v === 'ALERTA_ONLY' || $v === 'NAO' || $v === 'NÃO') {
            return self::POLITICA_ALERTA;
        }

        return self::POLITICA_EXIGIR;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function assertAntesDeReceber(Empresa $empresa, array $data): void
    {
        $ativa = filter_var($data['divergencia_ativa'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $desfecho = strtoupper(trim((string) ($data['divergencia_desfecho'] ?? '')));
        $obs = trim((string) ($data['divergencia_obs'] ?? ''));

        if ($desfecho === self::DESFECHO_AGUARDAR) {
            throw ValidationException::withMessages([
                'divergencia_desfecho' => [
                    'Desfecho "Aguardar fornecedor": não confirme o recebimento. '
                    .'Feche a conferência e trate a divergência com o fornecedor.',
                ],
            ]);
        }

        if (! $ativa) {
            return;
        }

        $politica = self::politica($empresa);
        if ($politica === self::POLITICA_ALERTA) {
            return;
        }

        if ($desfecho === '' || ! in_array($desfecho, self::DESFECHOS_RECEBIVEIS, true)) {
            throw ValidationException::withMessages([
                'divergencia_desfecho' => [
                    'Há divergência pedido × NF × conferido. Escolha o desfecho: '
                    .'Receber conforme NF ou Receber parcial (físico).',
                ],
            ]);
        }

        if ($obs === '') {
            throw ValidationException::withMessages([
                'divergencia_obs' => ['Informe uma observação curta do desfecho (auditoria).'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function textoObservacaoMov(array $data, ?string $obsExistente = null): ?string
    {
        $ativa = filter_var($data['divergencia_ativa'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $desfecho = strtoupper(trim((string) ($data['divergencia_desfecho'] ?? '')));
        $obsDiv = trim((string) ($data['divergencia_obs'] ?? ''));
        $base = trim((string) ($obsExistente ?? ''));

        if (! $ativa && $desfecho === '') {
            return $base !== '' ? $base : null;
        }

        $label = match ($desfecho) {
            self::DESFECHO_CONFORME_NF => 'Receber alinhado à NF',
            self::DESFECHO_PARCIAL_FISICO => 'Receber o que chegou',
            self::DESFECHO_AGUARDAR => 'Não receber — aguardar fornecedor',
            default => $desfecho !== '' ? $desfecho : 'Divergência registrada',
        };

        $bloco = '[Divergência volumes] '.$label;
        if ($obsDiv !== '') {
            $bloco .= ' — '.$obsDiv;
        }

        if ($base === '') {
            return $bloco;
        }

        return $base."\n".$bloco;
    }
}
