<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueLote;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Support\PadraoDecimal;
use Illuminate\Validation\ValidationException;

/**
 * Único escritor de estoque_saldos (ADR compras/estoque + AJU + lote).
 * Custo médio permanece no SKU; lote só altera qtde rastreável.
 */
class EstoqueSaldoWriter
{
    /**
     * Entrada valorizada (compra): atualiza qtde e custo médio móvel.
     *
     * @param  array{codigo?: string, data_entrada?: string, data_validade?: ?string, data_fabricacao?: ?string, lote_id?: int, nf_numero?: ?string, origem_tipo?: string, origem_id?: ?int}|null  $loteRef
     * @return array{custo_medio_apos: string, lote_id: ?int}
     */
    public function aplicarEntrada(
        Empresa $empresa,
        Produto $produto,
        string $qtdeInt,
        string $valorTotalItem,
        ?array $loteRef = null
    ): array {
        $saldo = $this->lockSaldo($empresa, $produto);

        $qtdeAnt = $saldo ? (string) $saldo->qtde : '0';
        $custoAnt = $saldo ? (string) $saldo->custo_medio : '0';

        $qtdeNova = PadraoDecimal::roundHalfUp(
            bcadd($qtdeAnt, $qtdeInt, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );

        if (bccomp($qtdeNova, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            $custoMedio = PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_UNIT_PRICE);
        } else {
            $valorEstoqueAnt = bcmul($qtdeAnt, $custoAnt, PadraoDecimal::SCALE_UNIT_PRICE + 6);
            $valorEstoqueNovo = bcadd($valorEstoqueAnt, $valorTotalItem, PadraoDecimal::SCALE_UNIT_PRICE + 6);
            $custoMedio = PadraoDecimal::roundHalfUp(
                bcdiv($valorEstoqueNovo, $qtdeNova, PadraoDecimal::SCALE_UNIT_PRICE + 6),
                PadraoDecimal::SCALE_UNIT_PRICE
            );
        }

        $this->persist($empresa, $produto, $saldo, $qtdeNova, $custoMedio);
        $loteId = $this->entrarLote($empresa, $produto, $qtdeInt, $loteRef, 'entrada');
        $this->assertConsistenciaLotes($empresa, $produto);

        return [
            'custo_medio_apos' => $custoMedio,
            'lote_id' => $loteId,
        ];
    }

    /**
     * Ajuste por contagem: delta em unidade_interna (positivo = entrada, negativo = saída).
     * Valoriza pelo custo médio vigente (não altera CM em saída; zera se saldo zerar).
     *
     * @param  array{codigo?: string, data_entrada?: string, data_validade?: ?string, data_fabricacao?: ?string, lote_id?: int, origem_tipo?: string, origem_id?: ?int}|null  $loteRef
     * @param  list<array{codigo: string, qtde: string, data_entrada?: string, data_validade?: ?string, data_fabricacao?: ?string}>|null  $lotePayload
     * @return array{custo_medio_apos: string, valor_total: string, valor_unitario: string, alocacoes: list<array{lote_id: ?int, qtde: string}>}
     */
    public function aplicarAjuste(
        Empresa $empresa,
        Produto $produto,
        string $qtdeDelta,
        ?array $loteRef = null,
        ?array $lotePayload = null
    ): array {
        if (bccomp($qtdeDelta, '0', PadraoDecimal::SCALE_QTY) === 0) {
            throw ValidationException::withMessages([
                'qtde_diferenca' => ['Diferença zero não gera movimento de ajuste.'],
            ]);
        }

        $saldo = $this->lockSaldo($empresa, $produto);
        $qtdeAnt = $saldo ? (string) $saldo->qtde : '0';
        $custoAnt = $saldo ? (string) $saldo->custo_medio : '0';

        $qtdeNova = PadraoDecimal::roundHalfUp(
            bcadd($qtdeAnt, $qtdeDelta, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );

        if (bccomp($qtdeNova, '0', PadraoDecimal::SCALE_QTY) < 0) {
            throw ValidationException::withMessages([
                'qtde_contada' => ["Ajuste resultaria em saldo negativo (sistema {$qtdeAnt})."],
            ]);
        }

        $qtdeAbs = bccomp($qtdeDelta, '0', PadraoDecimal::SCALE_QTY) < 0
            ? bcmul($qtdeDelta, '-1', PadraoDecimal::SCALE_QTY)
            : $qtdeDelta;

        $valorUnitario = PadraoDecimal::roundHalfUp($custoAnt, PadraoDecimal::SCALE_UNIT_PRICE);
        $valorTotal = PadraoDecimal::roundHalfUp(
            bcmul($qtdeAbs, $valorUnitario, PadraoDecimal::SCALE_UNIT_PRICE + 4),
            PadraoDecimal::SCALE_MONEY
        );

        if (bccomp($qtdeNova, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            $custoMedio = PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_UNIT_PRICE);
        } elseif (bccomp($qtdeDelta, '0', PadraoDecimal::SCALE_QTY) > 0 && bccomp($custoAnt, '0', PadraoDecimal::SCALE_UNIT_PRICE) === 0) {
            $custoMedio = PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_UNIT_PRICE);
        } else {
            $custoMedio = $valorUnitario;
        }

        $this->persist($empresa, $produto, $saldo, $qtdeNova, $custoMedio);

        $positivo = bccomp($qtdeDelta, '0', PadraoDecimal::SCALE_QTY) > 0;
        $alocacoes = $this->aplicarLotesAjuste(
            $empresa,
            $produto,
            $qtdeAbs,
            $positivo,
            $loteRef,
            $lotePayload
        );
        $this->assertConsistenciaLotes($empresa, $produto);

        return [
            'custo_medio_apos' => $custoMedio,
            'valor_total' => $valorTotal,
            'valor_unitario' => $valorUnitario,
            'alocacoes' => $alocacoes,
        ];
    }

    /**
     * Saída para produção (MP/EMB): reduz saldo valorizando pelo custo médio vigente.
     *
     * @return array{custo_medio_apos: string, valor_total: string, valor_unitario: string, alocacoes: list<array{lote_id: ?int, qtde: string}>}
     */
    public function aplicarSaida(Empresa $empresa, Produto $produto, string $qtdeSaida, ?int $loteId = null): array
    {
        if (bccomp($qtdeSaida, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde' => ['Quantidade de saída deve ser maior que zero.'],
            ]);
        }

        $saldo = $this->lockSaldo($empresa, $produto);
        $qtdeAnt = $saldo ? (string) $saldo->qtde : '0';
        $custoAnt = $saldo ? (string) $saldo->custo_medio : '0';

        if (bccomp($qtdeAnt, $qtdeSaida, PadraoDecimal::SCALE_QTY) < 0) {
            throw ValidationException::withMessages([
                'qtde' => ["Saldo insuficiente (disponível {$qtdeAnt})."],
            ]);
        }

        $qtdeNova = PadraoDecimal::roundHalfUp(
            bcsub($qtdeAnt, $qtdeSaida, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );

        $valorUnitario = PadraoDecimal::roundHalfUp($custoAnt, PadraoDecimal::SCALE_UNIT_PRICE);
        $valorTotal = PadraoDecimal::roundHalfUp(
            bcmul($qtdeSaida, $valorUnitario, PadraoDecimal::SCALE_UNIT_PRICE + 4),
            PadraoDecimal::SCALE_MONEY
        );

        $custoMedio = bccomp($qtdeNova, '0', PadraoDecimal::SCALE_QTY) <= 0
            ? PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_UNIT_PRICE)
            : $valorUnitario;

        $this->persist($empresa, $produto, $saldo, $qtdeNova, $custoMedio);
        $alocacoes = $this->baixarLotes($empresa, $produto, $qtdeSaida, $loteId);
        $this->assertConsistenciaLotes($empresa, $produto);

        return [
            'custo_medio_apos' => $custoMedio,
            'valor_total' => $valorTotal,
            'valor_unitario' => $valorUnitario,
            'alocacoes' => $alocacoes,
        ];
    }

    /**
     * Entrada de sobra ou PA: aumenta saldo.
     * Se $valorUnitario for null, usa custo médio vigente (sobra do mesmo SKU).
     *
     * @param  array{codigo?: string, data_entrada?: string, data_validade?: ?string, data_fabricacao?: ?string, lote_id?: int, origem_tipo?: string, origem_id?: ?int}|null  $loteRef
     * @return array{custo_medio_apos: string, valor_total: string, valor_unitario: string, lote_id: ?int}
     */
    public function aplicarEntradaUnitario(
        Empresa $empresa,
        Produto $produto,
        string $qtde,
        ?string $valorUnitario = null,
        ?array $loteRef = null
    ): array {
        if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde' => ['Quantidade de entrada deve ser maior que zero.'],
            ]);
        }

        $saldo = $this->lockSaldo($empresa, $produto);
        $qtdeAnt = $saldo ? (string) $saldo->qtde : '0';
        $custoAnt = $saldo ? (string) $saldo->custo_medio : '0';

        $unit = $valorUnitario !== null && $valorUnitario !== ''
            ? PadraoDecimal::roundHalfUp($valorUnitario, PadraoDecimal::SCALE_UNIT_PRICE)
            : PadraoDecimal::roundHalfUp($custoAnt, PadraoDecimal::SCALE_UNIT_PRICE);

        $valorTotalItem = PadraoDecimal::roundHalfUp(
            bcmul($qtde, $unit, PadraoDecimal::SCALE_UNIT_PRICE + 4),
            PadraoDecimal::SCALE_MONEY
        );

        $aplicado = $this->aplicarEntrada($empresa, $produto, $qtde, $valorTotalItem, $loteRef);

        return [
            'custo_medio_apos' => $aplicado['custo_medio_apos'],
            'valor_total' => $valorTotalItem,
            'valor_unitario' => $unit,
            'lote_id' => $aplicado['lote_id'],
        ];
    }

    /**
     * Amarrar lotes a saldo já existente (implantação / teste). Não mexe no SKU.
     *
     * @param  list<array{codigo: string, qtde: string, data_entrada?: string, data_validade?: ?string, data_fabricacao?: ?string}>  $linhas
     */
    public function backfillLotes(Empresa $empresa, Produto $produto, array $linhas): void
    {
        if (! $produto->controla_lote || $linhas === []) {
            return;
        }

        $this->lockSaldo($empresa, $produto);

        foreach ($linhas as $linha) {
            $this->entrarLote($empresa, $produto, (string) $linha['qtde'], [
                'codigo' => (string) $linha['codigo'],
                'data_entrada' => (string) ($linha['data_entrada'] ?? now()->toDateString()),
                'data_validade' => $linha['data_validade'] ?? null,
                'data_fabricacao' => $linha['data_fabricacao'] ?? null,
                'origem_tipo' => EstoqueLote::ORIGEM_BACKFILL,
            ], 'backfill');
        }

        $this->assertConsistenciaLotes($empresa, $produto);
    }

    private function lockSaldo(Empresa $empresa, Produto $produto): ?EstoqueSaldo
    {
        return EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->lockForUpdate()
            ->first();
    }

    private function persist(
        Empresa $empresa,
        Produto $produto,
        ?EstoqueSaldo $saldo,
        string $qtdeNova,
        string $custoMedio
    ): void {
        $unidade = $produto->unidade_interna ?? 'UN';

        if ($saldo) {
            $saldo->qtde = $qtdeNova;
            $saldo->custo_medio = $custoMedio;
            $saldo->unidade = $unidade;
            $saldo->save();
        } else {
            EstoqueSaldo::query()->create([
                'empresa_id' => $empresa->id,
                'produto_id' => $produto->id,
                'qtde' => $qtdeNova,
                'unidade' => $unidade,
                'custo_medio' => $custoMedio,
            ]);
        }

        $produto->custo_medio = $custoMedio;
        $produto->save();
    }

    /**
     * @param  array<string, mixed>|null  $loteRef
     */
    private function entrarLote(
        Empresa $empresa,
        Produto $produto,
        string $qtde,
        ?array $loteRef,
        string $contexto
    ): ?int {
        if (! $produto->controla_lote) {
            return null;
        }

        $ref = $this->normalizarLoteRef($produto, $loteRef, $contexto, $qtde);
        $lote = $this->encontrarOuCriarLote($empresa, $produto, $ref);

        $nova = PadraoDecimal::roundHalfUp(
            bcadd((string) $lote->qtde, $qtde, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );
        $lote->qtde = $nova;
        $lote->save();

        return (int) $lote->id;
    }

    /**
     * @param  array<string, mixed>|null  $loteRef
     * @param  list<array<string, mixed>>|null  $lotePayload
     * @return list<array{lote_id: ?int, qtde: string}>
     */
    private function aplicarLotesAjuste(
        Empresa $empresa,
        Produto $produto,
        string $qtdeAbs,
        bool $positivo,
        ?array $loteRef,
        ?array $lotePayload
    ): array {
        if (! $produto->controla_lote) {
            return [['lote_id' => null, 'qtde' => $qtdeAbs]];
        }

        if (is_array($lotePayload) && $lotePayload !== []) {
            $soma = '0';
            $alocacoes = [];
            foreach ($lotePayload as $idx => $linha) {
                $q = PadraoDecimal::roundHalfUp((string) ($linha['qtde'] ?? '0'), PadraoDecimal::SCALE_QTY);
                if (bccomp($q, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                    throw ValidationException::withMessages([
                        "lote_payload.{$idx}.qtde" => ['Quantidade do lote deve ser maior que zero.'],
                    ]);
                }
                $soma = bcadd($soma, $q, PadraoDecimal::SCALE_QTY);
                if ($positivo) {
                    $loteId = $this->entrarLote($empresa, $produto, $q, $linha, 'ajuste');
                } else {
                    $baixado = $this->baixarLotes(
                        $empresa,
                        $produto,
                        $q,
                        isset($linha['lote_id']) ? (int) $linha['lote_id'] : null
                    );
                    $loteId = $baixado[0]['lote_id'] ?? null;
                }
                $alocacoes[] = ['lote_id' => $loteId, 'qtde' => $q];
            }
            if (bccomp($soma, $qtdeAbs, PadraoDecimal::SCALE_QTY) !== 0) {
                throw ValidationException::withMessages([
                    'lote_payload' => ["Soma dos lotes ({$soma}) deve igualar a diferença ({$qtdeAbs})."],
                ]);
            }

            return $alocacoes;
        }

        if ($positivo) {
            $loteId = $this->entrarLote($empresa, $produto, $qtdeAbs, $loteRef, 'ajuste');

            return [['lote_id' => $loteId, 'qtde' => $qtdeAbs]];
        }

        return $this->baixarLotes(
            $empresa,
            $produto,
            $qtdeAbs,
            isset($loteRef['lote_id']) ? (int) $loteRef['lote_id'] : null
        );
    }

    /**
     * @return list<array{lote_id: ?int, qtde: string}>
     */
    private function baixarLotes(Empresa $empresa, Produto $produto, string $qtde, ?int $loteId): array
    {
        if (! $produto->controla_lote) {
            return [['lote_id' => null, 'qtde' => $qtde]];
        }

        if ($loteId) {
            $lote = EstoqueLote::query()
                ->where('empresa_id', $empresa->id)
                ->where('produto_id', $produto->id)
                ->where('id', $loteId)
                ->lockForUpdate()
                ->first();
            if (! $lote) {
                throw ValidationException::withMessages([
                    'lote_id' => ['Lote não encontrado para este produto.'],
                ]);
            }
            $this->debitarLote($lote, $qtde);

            return [['lote_id' => (int) $lote->id, 'qtde' => $qtde]];
        }

        $lotes = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->where('qtde', '>', 0)
            ->orderByRaw('data_validade IS NULL')
            ->orderBy('data_validade')
            ->orderBy('data_entrada')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        $restante = $qtde;
        $alocacoes = [];
        foreach ($lotes as $lote) {
            if (bccomp($restante, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                break;
            }
            $disp = PadraoDecimal::roundHalfUp((string) $lote->qtde, PadraoDecimal::SCALE_QTY);
            $usar = bccomp($disp, $restante, PadraoDecimal::SCALE_QTY) <= 0 ? $disp : $restante;
            $this->debitarLote($lote, $usar);
            $alocacoes[] = ['lote_id' => (int) $lote->id, 'qtde' => $usar];
            $restante = PadraoDecimal::roundHalfUp(
                bcsub($restante, $usar, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );
        }

        if (bccomp($restante, '0', PadraoDecimal::SCALE_QTY) > 0) {
            throw ValidationException::withMessages([
                'lote' => ["Saldo de lote insuficiente (faltam {$restante}). Informe o lote ou receba a entrada com lote."],
            ]);
        }

        return $alocacoes;
    }

    private function debitarLote(EstoqueLote $lote, string $qtde): void
    {
        $disp = PadraoDecimal::roundHalfUp((string) $lote->qtde, PadraoDecimal::SCALE_QTY);
        if (bccomp($disp, $qtde, PadraoDecimal::SCALE_QTY) < 0) {
            throw ValidationException::withMessages([
                'lote' => ["Lote {$lote->codigo} insuficiente (disponível {$disp})."],
            ]);
        }
        $lote->qtde = PadraoDecimal::roundHalfUp(
            bcsub($disp, $qtde, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );
        $lote->save();
    }

    /**
     * @param  array<string, mixed>|null  $loteRef
     * @return array{codigo: string, data_entrada: string, data_validade: ?string, data_fabricacao: ?string, lote_id?: int, nf_numero?: ?string, origem_tipo: string, origem_id: ?int}
     */
    private function normalizarLoteRef(Produto $produto, ?array $loteRef, string $contexto, string $qtde): array
    {
        $loteRef = $loteRef ?? [];
        $codigo = trim((string) ($loteRef['codigo'] ?? $loteRef['lote_codigo'] ?? ''));

        if ($codigo === '' && isset($loteRef['lote_id'])) {
            $existente = EstoqueLote::query()->find((int) $loteRef['lote_id']);
            if ($existente && (int) $existente->produto_id === (int) $produto->id) {
                $codigo = (string) $existente->codigo;
            }
        }

        if ($codigo === '') {
            if ($contexto === 'ajuste' || $contexto === 'backfill') {
                $codigo = strtoupper($contexto === 'backfill' ? 'VIR' : 'AJU').'-'.$produto->codigo.'-'.now()->format('Ymd');
            } else {
                throw ValidationException::withMessages([
                    'lote_codigo' => ['Informe o lote do fornecedor (SKU controla lote).'],
                ]);
            }
        }

        $entrada = (string) ($loteRef['data_entrada'] ?? $loteRef['lote_data_entrada'] ?? now()->toDateString());
        $validade = $loteRef['data_validade'] ?? $loteRef['lote_data_validade'] ?? null;
        $validade = $validade !== null && $validade !== '' ? (string) $validade : null;
        $fab = $loteRef['data_fabricacao'] ?? $loteRef['lote_data_fabricacao'] ?? null;
        $fab = $fab !== null && $fab !== '' ? (string) $fab : null;

        if ($produto->controla_validade && $validade === null && $produto->prazo_validade_dias) {
            $validade = date('Y-m-d', strtotime($entrada.' +'.((int) $produto->prazo_validade_dias).' days'));
        }

        if ($produto->controla_validade && $validade === null) {
            throw ValidationException::withMessages([
                'lote_data_validade' => ['Informe o vencimento (SKU controla validade).'],
            ]);
        }

        unset($qtde);

        return [
            'codigo' => mb_substr($codigo, 0, 60),
            'data_entrada' => $entrada,
            'data_validade' => $validade,
            'data_fabricacao' => $fab,
            'lote_id' => isset($loteRef['lote_id']) ? (int) $loteRef['lote_id'] : null,
            'nf_numero' => isset($loteRef['nf_numero']) ? (string) $loteRef['nf_numero'] : null,
            'origem_tipo' => (string) ($loteRef['origem_tipo'] ?? match ($contexto) {
                'ajuste' => EstoqueLote::ORIGEM_AJUSTE,
                'backfill' => EstoqueLote::ORIGEM_BACKFILL,
                default => EstoqueLote::ORIGEM_ENTRADA_COMPRA,
            }),
            'origem_id' => isset($loteRef['origem_id']) ? (int) $loteRef['origem_id'] : null,
        ];
    }

    /**
     * @param  array{codigo: string, data_entrada: string, data_validade: ?string, data_fabricacao: ?string, lote_id?: ?int, nf_numero?: ?string, origem_tipo: string, origem_id: ?int}  $ref
     */
    private function encontrarOuCriarLote(Empresa $empresa, Produto $produto, array $ref): EstoqueLote
    {
        $query = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->lockForUpdate();

        if (! empty($ref['lote_id'])) {
            $lote = (clone $query)->where('id', $ref['lote_id'])->first();
            if ($lote) {
                return $lote;
            }
        }

        $lote = (clone $query)->where('codigo', $ref['codigo'])->first();
        if ($lote) {
            return $lote;
        }

        return EstoqueLote::query()->create([
            'empresa_id' => $empresa->id,
            'produto_id' => $produto->id,
            'codigo' => $ref['codigo'],
            'data_entrada' => $ref['data_entrada'],
            'data_fabricacao' => $ref['data_fabricacao'],
            'data_validade' => $ref['data_validade'],
            'qtde' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY),
            'unidade' => $produto->unidade_interna ?? 'UN',
            'origem_tipo' => $ref['origem_tipo'],
            'origem_id' => $ref['origem_id'],
            'nf_numero' => $ref['nf_numero'] ?? null,
        ]);
    }

    private function assertConsistenciaLotes(Empresa $empresa, Produto $produto): void
    {
        if (! $produto->controla_lote) {
            return;
        }

        $sku = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->value('qtde');
        $skuQtde = PadraoDecimal::roundHalfUp((string) ($sku ?? '0'), PadraoDecimal::SCALE_QTY);

        $lotes = (string) EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->sum('qtde');
        $lotesQtde = PadraoDecimal::roundHalfUp($lotes, PadraoDecimal::SCALE_QTY);

        if (bccomp($skuQtde, $lotesQtde, PadraoDecimal::SCALE_QTY) !== 0) {
            throw ValidationException::withMessages([
                'lote' => [
                    "Inconsistência lote × saldo SKU (lotes {$lotesQtde} / SKU {$skuQtde}).",
                ],
            ]);
        }
    }
}
