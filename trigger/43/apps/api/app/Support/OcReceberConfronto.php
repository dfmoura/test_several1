<?php

namespace App\Support;

use App\Models\OrdemCompraItem;
use Illuminate\Support\Collection;

/**
 * Confronto pedido (composição OC) × detalhe NF × conferência.
 * Norma: ADR_OC_RASCUNHO_ENVIO · ADR_ENTRADA_XML_ASSIST.
 */
final class OcReceberConfronto
{
    /**
     * @param  Collection<int, OrdemCompraItem>  $pendentes
     * @param  list<array<string, mixed>>  $linhas
     * @return list<array<string, mixed>>
     */
    public static function montar(Collection $pendentes, array $linhas): array
    {
        $out = [];
        foreach ($pendentes as $item) {
            if (! $item->produto?->controla_lote) {
                continue;
            }

            $pedidoVolumes = 0;
            $pedidoArea = '0';
            $faixas = [];
            if ($item->relationLoaded('composicoes') && $item->composicoes->isNotEmpty()) {
                $exp = OcComposicaoVolumes::expandir($item->composicoes);
                $pedidoVolumes = count($exp);
                $pedidoArea = OcComposicaoVolumes::somaAreaM2($item->composicoes);
                foreach ($item->composicoes as $c) {
                    $faixas[] = [
                        'largura_mm' => PadraoDecimal::roundHalfUp((string) $c->largura_mm, PadraoDecimal::SCALE_DIM),
                        'quantidade' => PadraoDecimal::roundHalfUp((string) $c->quantidade, PadraoDecimal::SCALE_QTY),
                        'comprimento_m' => PadraoDecimal::roundHalfUp((string) $c->comprimento_m, PadraoDecimal::SCALE_DIM),
                        'area_m2' => PadraoDecimal::roundHalfUp((string) $c->area_m2, PadraoDecimal::SCALE_QTY),
                    ];
                }
            }

            $nfQCom = '0';
            $nfUCom = null;
            $infAds = [];
            $rastroCount = 0;
            $rastroArea = '0';
            foreach ($linhas as $linha) {
                if ((int) ($linha['match']['ordem_compra_item_id'] ?? 0) !== (int) $item->id) {
                    continue;
                }
                $nfQCom = PadraoDecimal::roundHalfUp(
                    bcadd($nfQCom, (string) ($linha['q_com'] ?? '0'), PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
                $nfUCom = $linha['u_com'] ?? $nfUCom;
                $inf = trim((string) ($linha['inf_ad_prod'] ?? ''));
                if ($inf !== '') {
                    $infAds[] = $inf;
                }
                foreach ($linha['rastros'] ?? [] as $r) {
                    if (! is_array($r)) {
                        continue;
                    }
                    $rastroCount++;
                    $rastroArea = bcadd(
                        $rastroArea,
                        (string) ($r['qtde'] ?? '0'),
                        PadraoDecimal::SCALE_QTY + 2
                    );
                }
            }
            $rastroArea = PadraoDecimal::roundHalfUp($rastroArea, PadraoDecimal::SCALE_QTY);

            $infJoined = implode(' | ', $infAds);
            $slots = NfeExactDimensoes::expandirSlots($infJoined !== '' ? $infJoined : null);
            $slotResumo = NfeExactDimensoes::resumirSlots($slots);

            $nfVolumes = null;
            $nfAreaDetalhe = null;
            $nfFonte = null;
            if ($rastroCount > 0) {
                $nfVolumes = $rastroCount;
                $nfAreaDetalhe = $rastroArea;
                $nfFonte = 'rastro';
            } elseif ($slotResumo['volumes'] > 0) {
                $nfVolumes = $slotResumo['volumes'];
                $nfAreaDetalhe = $slotResumo['area_m2'];
                $nfFonte = $slots !== [] && NfeExactDimensoes::expandirSlotsExact($infJoined) !== []
                    ? 'inf_ad_exact'
                    : 'inf_ad_rls';
            }

            if ($pedidoVolumes === 0 && $nfVolumes === null && bccomp($nfQCom, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }

            $mensagens = [];
            $divergente = false;

            if ($pedidoVolumes > 0 && $nfVolumes !== null && $pedidoVolumes !== $nfVolumes) {
                $divergente = true;
                $mensagens[] = "Pedido {$pedidoVolumes} bobina(s) × NF detalhe {$nfVolumes} bobina(s).";
            }
            if ($pedidoVolumes > 0 && $nfAreaDetalhe !== null
                && bccomp($pedidoArea, $nfAreaDetalhe, PadraoDecimal::SCALE_QTY) !== 0) {
                $divergente = true;
                $mensagens[] = "Pedido {$pedidoArea} m² (faixas) × NF detalhe {$nfAreaDetalhe} m².";
            }
            if ($nfAreaDetalhe !== null && bccomp($nfQCom, '0', PadraoDecimal::SCALE_QTY) > 0
                && bccomp($nfQCom, $nfAreaDetalhe, PadraoDecimal::SCALE_QTY) !== 0) {
                $divergente = true;
                $mensagens[] = "NF qCom {$nfQCom} ".($nfUCom ?? '')." × detalhe físico {$nfAreaDetalhe} m².";
            }
            if ($pedidoVolumes > 0 && bccomp($nfQCom, '0', PadraoDecimal::SCALE_QTY) > 0
                && bccomp($pedidoArea, $nfQCom, PadraoDecimal::SCALE_QTY) !== 0) {
                // Só alerta se unidade aparenta M2 (detalhe bobina); KG×m² fica como alerta fraco.
                $u = strtoupper(trim((string) ($nfUCom ?? $item->unidade ?? '')));
                if ($u === 'M2' || $u === 'M²') {
                    $divergente = true;
                    $mensagens[] = "Pedido {$pedidoArea} m² × NF qCom {$nfQCom} {$u}.";
                }
            }

            $out[] = [
                'ordem_compra_item_id' => (int) $item->id,
                'produto_codigo' => $item->produto?->codigo,
                'pedido' => [
                    'volumes' => $pedidoVolumes,
                    'area_m2' => $pedidoArea,
                    'faixas' => $faixas,
                ],
                'nf' => [
                    'q_com' => $nfQCom,
                    'u_com' => $nfUCom,
                    'volumes' => $nfVolumes,
                    'area_m2' => $nfAreaDetalhe,
                    'fonte' => $nfFonte,
                    'inf_ad_prod' => $infJoined !== '' ? $infJoined : null,
                ],
                'divergente' => $divergente,
                'mensagens' => $mensagens,
            ];
        }

        return $out;
    }
}
