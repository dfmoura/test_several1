<?php

namespace App\Services\Compras;

use App\Models\Empresa;
use App\Models\NfeEntradaItem;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Support\PadraoDecimal;

/**
 * Estimativa comercial de IPI/ICMS na OC (não é motor fiscal SEFAZ).
 * Prioridade: última NF do mesmo fornecedor+SKU → última NF do SKU → tabela UF×UF (ICMS) / vazio (IPI).
 * Valores da NF na entrada prevalecem.
 */
class OcImpostoEstimativaService
{
    /** Alíquotas internas padrão por UF (estimativa comercial). */
    private const ICMS_INTERNO = [
        'AC' => '19.00', 'AL' => '19.00', 'AM' => '20.00', 'AP' => '18.00',
        'BA' => '20.50', 'CE' => '20.00', 'DF' => '20.00', 'ES' => '17.00',
        'GO' => '19.00', 'MA' => '22.00', 'MG' => '18.00', 'MS' => '17.00',
        'MT' => '17.00', 'PA' => '19.00', 'PB' => '20.00', 'PE' => '20.50',
        'PI' => '21.00', 'PR' => '19.50', 'RJ' => '20.00', 'RN' => '20.00',
        'RO' => '19.50', 'RR' => '20.00', 'RS' => '17.00', 'SC' => '17.00',
        'SE' => '19.00', 'SP' => '18.00', 'TO' => '20.00',
    ];

    private const REGIOES_NORTE_NE_CO = [
        'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'GO', 'MA', 'MT', 'MS',
        'PA', 'PB', 'PE', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO',
    ];

    private const REGIOES_SUL_SUDESTE = ['ES', 'MG', 'PR', 'RJ', 'RS', 'SC', 'SP'];

    /**
     * @param  list<int>  $produtoIds
     * @return array{
     *   id_dest: string,
     *   id_dest_label: string,
     *   fornecedor_uf: ?string,
     *   empresa_uf: ?string,
     *   itens: list<array{produto_id: int, aliq_ipi: ?string, aliq_icms: ?string, fonte_ipi: string, fonte_icms: string}>
     * }
     */
    public function estimar(Empresa $empresa, Parceiro $fornecedor, array $produtoIds): array
    {
        $empUf = $this->upperUf($empresa->uf);
        $fornUf = $this->upperUf($fornecedor->uf);
        $idDest = $empUf !== null && $fornUf !== null && $empUf === $fornUf ? '1' : '2';

        $produtoIds = array_values(array_unique(array_filter(
            array_map('intval', $produtoIds),
            static fn (int $id) => $id > 0
        )));

        $produtos = $produtoIds === []
            ? collect()
            : Produto::query()
                ->where('empresa_id', $empresa->id)
                ->whereIn('id', $produtoIds)
                ->get(['id', 'origem', 'ncm'])
                ->keyBy('id');

        $hist = $this->historicoAliquotas($empresa->id, $fornecedor->id, $produtoIds);

        $itens = [];
        foreach ($produtoIds as $pid) {
            /** @var Produto|null $produto */
            $produto = $produtos->get($pid);
            if ($produto === null) {
                continue;
            }

            $h = $hist[$pid] ?? null;
            $aliqIpi = $this->nullableAliq($h['p_ipi'] ?? null);
            $fonteIpi = $aliqIpi !== null
                ? (($h['mesmo_fornecedor'] ?? false) ? 'ultima_nf_fornecedor' : 'ultima_nf_sku')
                : 'sem_historico';

            $aliqIcmsHist = $this->nullableAliq($h['p_icms'] ?? null);
            if ($aliqIcmsHist !== null) {
                $aliqIcms = $aliqIcmsHist;
                $fonteIcms = ($h['mesmo_fornecedor'] ?? false) ? 'ultima_nf_fornecedor' : 'ultima_nf_sku';
            } else {
                $aliqIcms = $this->icmsTabela($empUf, $fornUf, $produto->origem);
                $fonteIcms = $aliqIcms !== null ? 'tabela_uf' : 'sem_dado';
            }

            $itens[] = [
                'produto_id' => $pid,
                'aliq_ipi' => $aliqIpi,
                'aliq_icms' => $aliqIcms,
                'fonte_ipi' => $fonteIpi,
                'fonte_icms' => $fonteIcms,
            ];
        }

        return [
            'id_dest' => $idDest,
            'id_dest_label' => $idDest === '1' ? 'Interna' : 'Interestadual',
            'fornecedor_uf' => $fornUf,
            'empresa_uf' => $empUf,
            'itens' => $itens,
        ];
    }

    /**
     * @param  list<int>  $produtoIds
     * @return array<int, array{p_ipi: ?string, p_icms: ?string, mesmo_fornecedor: bool}>
     */
    private function historicoAliquotas(int $empresaId, int $fornecedorId, array $produtoIds): array
    {
        if ($produtoIds === []) {
            return [];
        }

        $rows = NfeEntradaItem::query()
            ->select([
                'nfe_entrada_itens.produto_id',
                'nfe_entrada_itens.p_ipi',
                'nfe_entrada_itens.p_icms',
                'nfe_entradas.fornecedor_id',
                'nfe_entradas.id as nfe_id',
            ])
            ->join('nfe_entradas', 'nfe_entradas.id', '=', 'nfe_entrada_itens.nfe_entrada_id')
            ->where('nfe_entradas.empresa_id', $empresaId)
            ->whereIn('nfe_entrada_itens.produto_id', $produtoIds)
            ->where(function ($q) {
                $q->whereNotNull('nfe_entrada_itens.p_ipi')
                    ->orWhereNotNull('nfe_entrada_itens.p_icms');
            })
            ->orderByDesc('nfe_entradas.id')
            ->orderByDesc('nfe_entrada_itens.id')
            ->get();

        $out = [];
        foreach ($produtoIds as $pid) {
            $mesmoForn = $rows->first(
                fn ($r) => (int) $r->produto_id === $pid && (int) $r->fornecedor_id === $fornecedorId
            );
            $qualquer = $rows->first(fn ($r) => (int) $r->produto_id === $pid);
            $pick = $mesmoForn ?? $qualquer;
            if ($pick === null) {
                continue;
            }
            $out[$pid] = [
                'p_ipi' => $pick->p_ipi !== null ? (string) $pick->p_ipi : null,
                'p_icms' => $pick->p_icms !== null ? (string) $pick->p_icms : null,
                'mesmo_fornecedor' => $mesmoForn !== null,
            ];
        }

        return $out;
    }

    private function icmsTabela(?string $destUf, ?string $emitUf, mixed $origem): ?string
    {
        if ($destUf === null || $emitUf === null) {
            return null;
        }

        if ($destUf === $emitUf) {
            return PadraoDecimal::roundHalfUp(
                self::ICMS_INTERNO[$destUf] ?? '18.00',
                PadraoDecimal::SCALE_PERCENT
            );
        }

        $orig = trim((string) $origem);
        // Mercadoria importada / similar → 4% interestadual (Res. Sen. 13/2012).
        if (in_array($orig, ['1', '2', '3', '8'], true)) {
            return PadraoDecimal::roundHalfUp('4.00', PadraoDecimal::SCALE_PERCENT);
        }

        // Sul/Sudeste (exceto ES como destino especial na prática comercial) → N/NE/CO: 7%; demais 12%.
        $emitSulSe = in_array($emitUf, self::REGIOES_SUL_SUDESTE, true) && $emitUf !== 'ES';
        $destNneCo = in_array($destUf, self::REGIOES_NORTE_NE_CO, true) || $destUf === 'ES';
        if ($emitSulSe && $destNneCo) {
            return PadraoDecimal::roundHalfUp('7.00', PadraoDecimal::SCALE_PERCENT);
        }

        return PadraoDecimal::roundHalfUp('12.00', PadraoDecimal::SCALE_PERCENT);
    }

    private function nullableAliq(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }
        $v = PadraoDecimal::parseStrict($raw, PadraoDecimal::SCALE_PERCENT);
        if ($v === null || bccomp($v, '0', PadraoDecimal::SCALE_PERCENT) <= 0) {
            return null;
        }

        return PadraoDecimal::roundHalfUp($v, PadraoDecimal::SCALE_PERCENT);
    }

    private function upperUf(mixed $uf): ?string
    {
        $v = strtoupper(trim((string) $uf));

        return strlen($v) === 2 ? $v : null;
    }
}
