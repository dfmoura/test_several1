<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\PaEmbalagem;
use App\Models\Pedido;
use App\Services\Producao\PaEmbalagemService;
use App\Support\PadraoDecimal;
use Illuminate\Support\Collection;

/**
 * Quantidade comercial na NF-e de PA: rolo (RL) ou etiqueta (UN).
 * Não altera FAT/TIT/COM/SAIDA_VENDA — só o documento fiscal.
 *
 * @see docs/ADR_PA_EMBALAGEM_BOBINA_CAIXA.md
 */
final class NfePaQtdeModalidade
{
    public const MODO_ROLO = 'ROLO';

    public const MODO_ETIQUETA = 'ETIQUETA';

    public const UNIDADE_ROLO = 'RL';

    public function __construct(private readonly PaEmbalagemService $embalagem) {}

    public static function modos(): array
    {
        return [self::MODO_ROLO, self::MODO_ETIQUETA];
    }

    public static function label(?string $modo): ?string
    {
        return match ($modo) {
            self::MODO_ROLO => 'Por rolo (bobina)',
            self::MODO_ETIQUETA => 'Por etiqueta (UN)',
            default => null,
        };
    }

    public function sugerir(Empresa $empresa, Pedido $pedido): string
    {
        $embs = $this->embalagem->confirmadasDoPedido($empresa, $pedido);
        foreach ($embs as $emb) {
            if ((int) $emb->qtde_bobinas >= 1) {
                return self::MODO_ROLO;
            }
        }

        return self::MODO_ETIQUETA;
    }

    public function efetivo(Faturamento $fat, Empresa $empresa, ?Pedido $pedido): string
    {
        $raw = strtoupper(trim((string) ($fat->nfe_qtde_modo ?? '')));
        if (in_array($raw, self::modos(), true)) {
            return $raw;
        }
        if ($pedido) {
            return $this->sugerir($empresa, $pedido);
        }

        return self::MODO_ETIQUETA;
    }

    /**
     * Ajusta qtde/unidade/unitário e texto fiscal do item PA.
     *
     * @param  array<string, mixed>  $linha
     * @param  Collection<int, PaEmbalagem>  $embs
     * @return array{linha: array<string, mixed>, inf_ad: ?string}
     */
    public function aplicarItem(array $linha, Collection $embs, string $modo): array
    {
        $pedidoItemId = isset($linha['pedido_item_id']) ? (int) $linha['pedido_item_id'] : null;
        $emb = $this->embalagem->resolverParaItem($embs, $pedidoItemId);
        $fam = strtoupper(trim((string) ($linha['familia_fiscal'] ?? '')));
        $ehPa = str_starts_with($fam, 'PA-') || $fam === 'PA-ETQ' || $fam === '';
        $espec = is_array($linha['especificacao'] ?? null) ? $linha['especificacao'] : null;

        if (! $ehPa || ! $emb || (int) $emb->qtde_bobinas < 1) {
            return [
                'linha' => $linha,
                'inf_ad' => $this->embalagem->textoFiscalModo($emb, self::MODO_ETIQUETA, $espec),
            ];
        }

        if ($modo === self::MODO_ROLO) {
            $bruto = PadraoDecimal::roundHalfUp((string) ($linha['valor'] ?? '0'), PadraoDecimal::SCALE_MONEY);
            $qRolos = (string) (int) $emb->qtde_bobinas;
            $unit = $this->vUnComCompativel($qRolos, $bruto);
            $linha['qtde'] = PadraoDecimal::roundHalfUp($qRolos, PadraoDecimal::SCALE_QTY);
            $linha['unidade'] = self::UNIDADE_ROLO;
            $linha['preco_unitario'] = $unit;

            return [
                'linha' => $linha,
                'inf_ad' => $this->embalagem->textoFiscalModo($emb, self::MODO_ROLO, $espec),
            ];
        }

        // ETIQUETA: qCom permanece; bobinas só em obs.
        return [
            'linha' => $linha,
            'inf_ad' => $this->embalagem->textoFiscalModo($emb, self::MODO_ETIQUETA, $espec),
        ];
    }

    /**
     * Unitário tal que round(qCom × vUnCom, 2) === vProd.
     */
    private function vUnComCompativel(string $qCom, string $vProd): string
    {
        if (bccomp($qCom, '0', PadraoDecimal::SCALE_QTY) === 0) {
            return '0.'.str_repeat('0', PadraoDecimal::SCALE_NF_UNIT);
        }
        $scale = PadraoDecimal::SCALE_NF_UNIT;
        $unit = bcdiv($vProd, $qCom, $scale + 4);
        for ($i = 0; $i < 20; $i++) {
            $unit = PadraoDecimal::roundHalfUp($unit, $scale);
            $prod = PadraoDecimal::roundHalfUp(
                bcmul($qCom, $unit, $scale + 4),
                PadraoDecimal::SCALE_MONEY
            );
            if (bccomp($prod, $vProd, PadraoDecimal::SCALE_MONEY) === 0) {
                return $unit;
            }
            $diff = bcsub($vProd, $prod, PadraoDecimal::SCALE_MONEY + 2);
            $ajuste = bcdiv($diff, $qCom, $scale + 4);
            $unit = bcadd($unit, $ajuste, $scale + 4);
        }

        return PadraoDecimal::roundHalfUp(bcdiv($vProd, $qCom, $scale + 4), $scale);
    }
}
