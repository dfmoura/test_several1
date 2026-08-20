<?php

namespace App\Support;

/**
 * Política de lote/validade por grupo — estudo 32 CONTROLE_ESTOQUE_PROFISSIONAL §6.2.
 * Substratos e tintas controlam lote; adesivos/tintas/foils controlam validade.
 */
final class ProdutoLotePolitica
{
    public const ALERTA_VENCIMENTO_DIAS = 60;

    public const STATUS_OK = 'OK';

    public const STATUS_A_VENCER = 'A_VENCER';

    public const STATUS_VENCIDO = 'VENCIDO';

    public const STATUS_SEM_VALIDADE = 'SEM_VALIDADE';

    /**
     * @return array{controla_lote: bool, controla_validade: bool, prazo_validade_dias: ?int}
     */
    public static function paraGrupo(?string $grupo): array
    {
        $g = strtoupper(trim((string) $grupo));

        return match ($g) {
            'MP-PAP', 'MP-FLM', 'MP-LAM' => [
                'controla_lote' => true,
                'controla_validade' => true,
                'prazo_validade_dias' => 548,
            ],
            'MP-TIN', 'MP-ADF' => [
                'controla_lote' => true,
                'controla_validade' => true,
                'prazo_validade_dias' => 365,
            ],
            'MP-CLD' => [
                'controla_lote' => true,
                'controla_validade' => true,
                'prazo_validade_dias' => 730,
            ],
            'MP-TEC' => [
                'controla_lote' => true,
                'controla_validade' => false,
                'prazo_validade_dias' => null,
            ],
            default => [
                'controla_lote' => false,
                'controla_validade' => false,
                'prazo_validade_dias' => null,
            ],
        };
    }

    /**
     * @param  array<string, mixed>  $flags
     * @return array{controla_lote: bool, controla_validade: bool, prazo_validade_dias: ?int}
     */
    public static function normalizar(array $flags): array
    {
        $lote = (bool) ($flags['controla_lote'] ?? false);
        $validade = (bool) ($flags['controla_validade'] ?? false);
        $prazo = isset($flags['prazo_validade_dias']) && $flags['prazo_validade_dias'] !== '' && $flags['prazo_validade_dias'] !== null
            ? (int) $flags['prazo_validade_dias']
            : null;

        if ($validade) {
            $lote = true;
        }

        if (! $lote) {
            $validade = false;
            $prazo = null;
        }

        if ($prazo !== null && $prazo < 1) {
            $prazo = null;
        }

        return [
            'controla_lote' => $lote,
            'controla_validade' => $validade,
            'prazo_validade_dias' => $prazo,
        ];
    }

    public static function statusValidade(?string $dataValidade, ?string $hoje = null): string
    {
        if ($dataValidade === null || $dataValidade === '') {
            return self::STATUS_SEM_VALIDADE;
        }

        $hoje = $hoje ?: now()->toDateString();
        if (strcmp($dataValidade, $hoje) < 0) {
            return self::STATUS_VENCIDO;
        }

        $limite = date('Y-m-d', strtotime($hoje.' +'.self::ALERTA_VENCIMENTO_DIAS.' days'));
        if (strcmp($dataValidade, $limite) <= 0) {
            return self::STATUS_A_VENCER;
        }

        return self::STATUS_OK;
    }

    public static function statusLabel(string $status): string
    {
        return match ($status) {
            self::STATUS_A_VENCER => 'A vencer',
            self::STATUS_VENCIDO => 'Vencido',
            self::STATUS_SEM_VALIDADE => 'Sem validade',
            default => 'Ok',
        };
    }
}
