<?php

namespace App\Support;

use App\Models\Orcamento;
use App\Models\OrcamentoItem;
use App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Escolha da escada no aceite do cliente (ADR_ORC_ITENS).
 *
 * N=1 / legado: um `faixa_index` no documento — contrato histórico intacto.
 * N>1: uma faixa por posição; o índice do cabeçalho espelha o 1º item.
 */
final class OrcamentoAceiteFaixas
{
    /**
     * @param  array{faixa_index?: int|string|null, faixas_itens?: mixed}  $data
     * @return array{header: int, por_ordem: array<int, int>}
     */
    public static function resolver(Orcamento $orcamento, array $data): array
    {
        $orcamento->loadMissing('itens');
        $itens = $orcamento->itens->sortBy('ordem')->values();
        $mapa = self::mapaDoPayload($data['faixas_itens'] ?? null);

        if ($mapa !== []) {
            return self::resolverMapa($orcamento, $itens, $mapa);
        }

        return self::resolverIndiceDocumento($orcamento, $itens, $data);
    }

    /**
     * @param  array<int, int>  $porOrdem
     */
    public static function persistir(Orcamento $orcamento, array $porOrdem): void
    {
        $orcamento->loadMissing('itens');
        foreach ($orcamento->itens as $item) {
            $ordem = (int) $item->ordem;
            $item->aceite_faixa_index = array_key_exists($ordem, $porOrdem)
                ? $porOrdem[$ordem]
                : null;
            $item->save();
        }
    }

    public static function limpar(Orcamento $orcamento): void
    {
        OrcamentoItem::query()
            ->where('orcamento_id', $orcamento->id)
            ->update(['aceite_faixa_index' => null]);
    }

    public static function indiceDoItem(Orcamento $orcamento, int $ordem, int $fallback): int
    {
        $orcamento->loadMissing('itens');
        $item = $orcamento->itens->firstWhere('ordem', $ordem);
        if ($item !== null && $item->aceite_faixa_index !== null) {
            return (int) $item->aceite_faixa_index;
        }

        return $fallback;
    }

    /**
     * Base comercial do sinal: Σ faixas escolhidas (N>1) ou faixa do documento (N=1).
     */
    public static function valorBaseAdiantamento(Orcamento $orcamento, int $headerIndex): string
    {
        $orcamento->loadMissing('itens');
        $itens = $orcamento->itens->sortBy('ordem')->values();
        if ($itens->count() > 1) {
            $soma = '0';
            foreach ($itens as $item) {
                $idx = $item->aceite_faixa_index;
                $result = is_array($item->result_snapshot) ? $item->result_snapshot : [];
                if ($idx === null) {
                    $idx = self::indiceNaEscada($result, $headerIndex);
                }
                $total = self::totalFaixaJob(
                    is_array($item->input_snapshot) ? $item->input_snapshot : [],
                    $result,
                    (int) $idx,
                );
                $soma = bcadd($soma, $total, 8);
            }

            return PadraoDecimal::roundHalfUp($soma, PadraoDecimal::SCALE_MONEY);
        }

        return self::totalFaixaJob(
            is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [],
            is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [],
            $headerIndex,
        );
    }

    /**
     * Chave estável do PIX: N=1 permanece `f{índice}`; N>1 distingue o mapa.
     */
    public static function fingerprint(Orcamento $orcamento, int $headerIndex): string
    {
        $orcamento->loadMissing('itens');
        $itens = $orcamento->itens->sortBy('ordem')->values();
        if ($itens->count() <= 1) {
            return (string) $headerIndex;
        }

        $parts = [];
        foreach ($itens as $item) {
            $idx = $item->aceite_faixa_index;
            if ($idx === null) {
                $idx = self::indiceNaEscada(
                    is_array($item->result_snapshot) ? $item->result_snapshot : [],
                    $headerIndex,
                );
            }
            $parts[] = ((int) $item->ordem).':'.((int) $idx);
        }

        return implode('+', $parts);
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $result
     */
    public static function totalFaixaJob(array $input, array $result, int $faixaIndex): string
    {
        $fx = self::faixaDoResult($result, $faixaIndex, 'adiantamento');
        $facaNova = (bool) ($result['faca_nova'] ?? $input['faca_nova'] ?? false);
        $valorFaca = $facaNova ? (float) ($result['valor_faca_nova'] ?? $input['valor_faca_nova'] ?? 0) : 0.0;
        $valorArtes = (float) ($result['valor_artes']
            ?? ModelosComposicao::somaValorArte($input['modelos_composicao'] ?? []));
        $extras = $valorFaca + $valorArtes;
        if ($extras > 0 && ($fx['valor_total_com_faca'] ?? null) === null) {
            $fx['valor_total_com_faca'] = (float) ($fx['valor_total'] ?? 0) + $extras;
        }

        return OrcamentoFreteEstimadoService::totalPropostaFaixa($fx);
    }

    /**
     * @param  Collection<int, OrcamentoItem>  $itens
     * @param  array<int, int>  $mapa
     * @return array{header: int, por_ordem: array<int, int>}
     */
    private static function resolverMapa(Orcamento $orcamento, Collection $itens, array $mapa): array
    {
        if ($itens->isEmpty()) {
            if (! array_key_exists(1, $mapa)) {
                throw ValidationException::withMessages([
                    'faixas_itens' => ['Selecione a quantidade que deseja aprovar.'],
                ]);
            }
            self::assertFaixaNoResult(
                is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [],
                $mapa[1],
            );

            return ['header' => $mapa[1], 'por_ordem' => [1 => $mapa[1]]];
        }

        $porOrdem = [];
        foreach ($itens as $item) {
            $ordem = (int) $item->ordem;
            if (! array_key_exists($ordem, $mapa)) {
                throw ValidationException::withMessages([
                    'faixas_itens' => ['Selecione a quantidade de cada posição.'],
                ]);
            }
            $idx = $mapa[$ordem];
            self::assertFaixaNoResult(
                is_array($item->result_snapshot) ? $item->result_snapshot : [],
                $idx,
            );
            $porOrdem[$ordem] = $idx;
        }

        foreach (array_keys($mapa) as $ordem) {
            if ($itens->firstWhere('ordem', $ordem) === null) {
                throw ValidationException::withMessages([
                    'faixas_itens' => ['Posição inexistente na proposta.'],
                ]);
            }
        }

        $primeiro = $itens->first();
        $header = $primeiro !== null
            ? $porOrdem[(int) $primeiro->ordem]
            : (int) reset($porOrdem);

        return ['header' => $header, 'por_ordem' => $porOrdem];
    }

    /**
     * @param  Collection<int, OrcamentoItem>  $itens
     * @param  array{faixa_index?: int|string|null}  $data
     * @return array{header: int, por_ordem: array<int, int>}
     */
    private static function resolverIndiceDocumento(Orcamento $orcamento, Collection $itens, array $data): array
    {
        $idx = (int) ($data['faixa_index'] ?? -1);
        self::assertFaixaNoResult(
            is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [],
            $idx,
        );

        $porOrdem = [];
        if ($itens->isEmpty()) {
            $porOrdem[1] = $idx;
        } else {
            foreach ($itens as $item) {
                $result = is_array($item->result_snapshot) ? $item->result_snapshot : [];
                $porOrdem[(int) $item->ordem] = self::indiceNaEscada($result, $idx);
            }
        }

        return ['header' => $idx, 'por_ordem' => $porOrdem];
    }

    /**
     * @param  mixed  $raw
     * @return array<int, int>
     */
    private static function mapaDoPayload(mixed $raw): array
    {
        if (! is_array($raw) || $raw === []) {
            return [];
        }

        $mapa = [];
        foreach ($raw as $row) {
            if (! is_array($row)) {
                throw ValidationException::withMessages([
                    'faixas_itens' => ['Informe ordem e faixa de cada posição.'],
                ]);
            }
            $ordem = (int) ($row['ordem'] ?? 0);
            if ($ordem < 1 || ! array_key_exists('faixa_index', $row)) {
                throw ValidationException::withMessages([
                    'faixas_itens' => ['Informe ordem e faixa de cada posição.'],
                ]);
            }
            if (array_key_exists($ordem, $mapa)) {
                throw ValidationException::withMessages([
                    'faixas_itens' => ['Cada posição pode ter só uma faixa escolhida.'],
                ]);
            }
            $mapa[$ordem] = (int) $row['faixa_index'];
        }

        return $mapa;
    }

    /** @param  array<string, mixed>  $result */
    private static function assertFaixaNoResult(array $result, int $faixaIndex): void
    {
        $faixas = $result['faixas'] ?? [];
        if (! is_array($faixas) || ! array_key_exists($faixaIndex, $faixas) || ! is_array($faixas[$faixaIndex])) {
            throw ValidationException::withMessages([
                'faixa_index' => ['Selecione a quantidade que deseja aprovar.'],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $result
     * @return array<string, mixed>
     */
    private static function faixaDoResult(array $result, int $faixaIndex, string $contexto): array
    {
        $faixas = $result['faixas'] ?? [];
        if (! is_array($faixas) || ! array_key_exists($faixaIndex, $faixas) || ! is_array($faixas[$faixaIndex])) {
            $campo = $contexto === 'adiantamento' ? 'faixa_index' : 'faixas_itens';
            $msg = $contexto === 'adiantamento'
                ? 'Faixa aprovada inválida para adiantamento.'
                : 'Selecione a quantidade que deseja aprovar.';
            throw ValidationException::withMessages([$campo => [$msg]]);
        }

        return $faixas[$faixaIndex];
    }

    /** @param  array<string, mixed>  $result */
    private static function indiceNaEscada(array $result, int $preferido): int
    {
        $faixas = $result['faixas'] ?? [];
        if (is_array($faixas) && array_key_exists($preferido, $faixas) && is_array($faixas[$preferido])) {
            return $preferido;
        }
        if (is_array($faixas) && array_key_exists(0, $faixas) && is_array($faixas[0])) {
            return 0;
        }

        throw ValidationException::withMessages([
            'faixa_index' => ['Selecione a quantidade que deseja aprovar.'],
        ]);
    }
}
