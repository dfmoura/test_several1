<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueInventario;
use App\Models\EstoqueInventarioItem;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Support\PadraoDecimal;

/**
 * Alçadas e divergência relevante — estudo 32 AJUSTE §6 (BL-042).
 */
class EstoqueAjusteAlcada
{
    public const FAIXA_LIDER = '500.00';

    public const FAIXA_GESTOR = '5000.00';

    public const VALOR_RELEVANTE = '1000.00';

    public const PCT_RELEVANTE = '0.05';

    /**
     * @return array{valor_ajuste: string, alcada: string, divergencia_relevante: bool}
     */
    public function calcular(
        Empresa $empresa,
        Produto $produto,
        string $qtdeSistema,
        string $qtdeDiferenca,
        string $origem
    ): array {
        $custo = $this->custoMedio($empresa, $produto);
        $qtdeAbs = bccomp($qtdeDiferenca, '0', PadraoDecimal::SCALE_QTY) < 0
            ? bcmul($qtdeDiferenca, '-1', PadraoDecimal::SCALE_QTY)
            : $qtdeDiferenca;

        $valor = PadraoDecimal::roundHalfUp(
            bcmul($qtdeAbs, $custo, PadraoDecimal::SCALE_MONEY + 4),
            PadraoDecimal::SCALE_MONEY
        );

        $alcada = EstoqueAjuste::ALCADA_LIDER;
        if (bccomp($valor, self::FAIXA_GESTOR, PadraoDecimal::SCALE_MONEY) > 0
            || in_array($origem, [EstoqueAjuste::ORIGEM_INV_GERAL, EstoqueAjuste::ORIGEM_VIRADA], true)) {
            $alcada = EstoqueAjuste::ALCADA_DIRECAO;
        } elseif (bccomp($valor, self::FAIXA_LIDER, PadraoDecimal::SCALE_MONEY) > 0) {
            $alcada = EstoqueAjuste::ALCADA_GESTOR;
        }

        $relevante = false;
        if (bccomp($valor, self::VALOR_RELEVANTE, PadraoDecimal::SCALE_MONEY) > 0) {
            $relevante = true;
        } elseif (bccomp($qtdeSistema, '0', PadraoDecimal::SCALE_QTY) > 0) {
            $pct = bcdiv($qtdeAbs, $qtdeSistema, 8);
            if (bccomp($pct, self::PCT_RELEVANTE, 8) > 0) {
                $relevante = true;
            }
        }

        if (! $relevante) {
            $desde = now()->subMonths(6);
            $count = EstoqueAjuste::query()
                ->where('empresa_id', $empresa->id)
                ->where('produto_id', $produto->id)
                ->where('status', EstoqueAjuste::STATUS_APROVADO)
                ->where('aprovado_em', '>=', $desde)
                ->count();
            if ($count >= 2) {
                // Este será o 3º no semestre após aprovação.
                $relevante = true;
            }
        }

        return [
            'valor_ajuste' => $valor,
            'alcada' => $alcada,
            'divergencia_relevante' => $relevante,
        ];
    }

    public function toleranciaPct(Produto $produto): string
    {
        $un = strtoupper((string) ($produto->unidade_interna ?? 'UN'));
        if (in_array($un, ['KG', 'G'], true)) {
            return '0.02';
        }
        if (in_array($un, ['M', 'ML', 'MT'], true)) {
            return '0.05';
        }

        return '0';
    }

    public function dentroTolerancia(Produto $produto, string $qtdeSistema, string $qtdeContada): bool
    {
        $diff = bcsub($qtdeContada, $qtdeSistema, PadraoDecimal::SCALE_QTY + 4);
        $diffAbs = bccomp($diff, '0', PadraoDecimal::SCALE_QTY + 4) < 0
            ? bcmul($diff, '-1', PadraoDecimal::SCALE_QTY + 4)
            : $diff;

        $tol = $this->toleranciaPct($produto);
        if (bccomp($tol, '0', 8) === 0) {
            return bccomp($diffAbs, '0', PadraoDecimal::SCALE_QTY) === 0;
        }

        if (bccomp($qtdeSistema, '0', PadraoDecimal::SCALE_QTY) === 0) {
            return bccomp($diffAbs, '0', PadraoDecimal::SCALE_QTY) === 0;
        }

        $limite = bcmul($qtdeSistema, $tol, PadraoDecimal::SCALE_QTY + 4);

        return bccomp($diffAbs, $limite, PadraoDecimal::SCALE_QTY + 4) <= 0;
    }

    private function custoMedio(Empresa $empresa, Produto $produto): string
    {
        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->first();

        if ($saldo && bccomp((string) $saldo->custo_medio, '0', PadraoDecimal::SCALE_UNIT_PRICE) > 0) {
            return PadraoDecimal::roundHalfUp((string) $saldo->custo_medio, PadraoDecimal::SCALE_UNIT_PRICE);
        }

        return PadraoDecimal::roundHalfUp((string) ($produto->custo_medio ?? '0'), PadraoDecimal::SCALE_UNIT_PRICE);
    }
}
