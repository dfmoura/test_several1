<?php

namespace App\Support;

use Carbon\Carbon;
use Carbon\CarbonInterface;

/**
 * Aging operacional de TIT (estudo 32 / UC-FIN-006). Não é DRE.
 */
final class TituloAging
{
    public const A_VENCER = 'A_VENCER';

    public const VENCE_HOJE = 'VENCE_HOJE';

    public const D_1_30 = 'D_1_30';

    public const D_31_60 = 'D_31_60';

    public const D_61_90 = 'D_61_90';

    public const D_90_MAIS = 'D_90_MAIS';

    /** Filtro virtual: qualquer atraso. */
    public const VENCIDO = 'VENCIDO';

    public const FAIXAS = [
        self::A_VENCER,
        self::VENCE_HOJE,
        self::D_1_30,
        self::D_31_60,
        self::D_61_90,
        self::D_90_MAIS,
    ];

    public const FILTROS = [
        self::A_VENCER,
        self::VENCE_HOJE,
        self::D_1_30,
        self::D_31_60,
        self::D_61_90,
        self::D_90_MAIS,
        self::VENCIDO,
    ];

    /**
     * Dias em atraso: negativo = a vencer, 0 = hoje, positivo = vencido.
     */
    public static function diasAtraso(CarbonInterface|string $vencimento, ?CarbonInterface $hoje = null): int
    {
        $hoje = ($hoje ?? Carbon::today())->copy()->startOfDay();
        $venc = $vencimento instanceof CarbonInterface
            ? $vencimento->copy()->startOfDay()
            : Carbon::parse((string) $vencimento)->startOfDay();

        if ($venc->equalTo($hoje)) {
            return 0;
        }

        $abs = (int) abs($venc->diffInDays($hoje));

        return $venc->lt($hoje) ? $abs : -$abs;
    }

    public static function faixa(int $diasAtraso): string
    {
        if ($diasAtraso < 0) {
            return self::A_VENCER;
        }
        if ($diasAtraso === 0) {
            return self::VENCE_HOJE;
        }
        if ($diasAtraso <= 30) {
            return self::D_1_30;
        }
        if ($diasAtraso <= 60) {
            return self::D_31_60;
        }
        if ($diasAtraso <= 90) {
            return self::D_61_90;
        }

        return self::D_90_MAIS;
    }

    public static function faixaDeVencimento(CarbonInterface|string $vencimento, ?CarbonInterface $hoje = null): string
    {
        return self::faixa(self::diasAtraso($vencimento, $hoje));
    }

    public static function vencido(int $diasAtraso): bool
    {
        return $diasAtraso > 0;
    }

    /**
     * @return list<array{id: string, label: string}>
     */
    public static function labels(): array
    {
        return [
            ['id' => self::A_VENCER, 'label' => 'A vencer'],
            ['id' => self::VENCE_HOJE, 'label' => 'Vence hoje'],
            ['id' => self::D_1_30, 'label' => '1–30 dias'],
            ['id' => self::D_31_60, 'label' => '31–60 dias'],
            ['id' => self::D_61_90, 'label' => '61–90 dias'],
            ['id' => self::D_90_MAIS, 'label' => '90+ dias'],
        ];
    }
}
