<?php

namespace App\Services\Financeiro;

use App\Support\PadraoDecimal;

/**
 * Interpreta a condição travada no PED/ORC em parcelas (estudo 32 FATURAMENTO §4).
 * Sem catálogo COND- — texto canônico do snapshot.
 *
 * @phpstan-type ParcelaSpec array{parcela: int, dias: int, peso: string, rotulo: string, sinal: bool}
 */
final class CondicaoPagamentoParser
{
    /**
     * @return list<ParcelaSpec>
     */
    public function parse(?string $condicao): array
    {
        $c = trim((string) $condicao);
        if ($c === '') {
            return [$this->spec(1, 28, '1', '28 DDL (padrão)', false)];
        }

        $percentuais = $this->parsePercentuais($c);
        if ($percentuais !== []) {
            return $percentuais;
        }

        $semDdl = preg_replace('/\s*DDL\s*$/i', '', $c) ?? $c;
        if (preg_match('/^\s*\d+(?:\s*\/\s*\d+)+\s*$/', $semDdl) === 1) {
            $dias = array_map(static fn (string $p): int => (int) trim($p), preg_split('/\s*\/\s*/', trim($semDdl)) ?: []);
            $n = count($dias);
            $peso = bcdiv('1', (string) max($n, 1), 8);
            $out = [];
            foreach ($dias as $i => $d) {
                $out[] = $this->spec($i + 1, $d, $peso, $d.' DDL', false);
            }

            return $out;
        }

        $fold = $this->fold($c);
        if (preg_match('/\ba\s*vista\b|\bavista\b/', $fold) === 1) {
            return [$this->spec(1, 0, '1', 'À vista', false)];
        }

        if (preg_match('/(\d+)\s*ddl/i', $c, $m) === 1) {
            $d = (int) $m[1];

            return [$this->spec(1, $d, '1', $d.' DDL', false)];
        }

        return [$this->spec(1, 28, '1', '28 DDL (condição não reconhecida)', false)];
    }

    /**
     * Se o sinal já foi apropriado, remove parcelas de sinal e renormaliza o peso do restante.
     *
     * @param  list<ParcelaSpec>  $parcelas
     * @return list<ParcelaSpec>
     */
    public function aposAdiantamento(array $parcelas, bool $adiantamentoApropriado): array
    {
        if (! $adiantamentoApropriado) {
            return $parcelas;
        }

        $rest = array_values(array_filter($parcelas, static fn (array $p): bool => ! $p['sinal']));
        if ($rest === []) {
            return [];
        }

        $soma = '0';
        foreach ($rest as $p) {
            $soma = bcadd($soma, $p['peso'], 8);
        }
        if (bccomp($soma, '0', 8) <= 0) {
            return [];
        }

        $out = [];
        foreach ($rest as $i => $p) {
            $p['peso'] = bcdiv($p['peso'], $soma, 8);
            $p['parcela'] = $i + 1;
            $out[] = $p;
        }

        return $out;
    }

    /**
     * @param  list<ParcelaSpec>  $parcelas
     * @return list<array{parcela: int, dias: int, valor: string, vencimento: string, rotulo: string, sinal: bool}>
     */
    public function ratear(string $valor, array $parcelas, \DateTimeInterface $base): array
    {
        if ($parcelas === [] || bccomp($valor, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            return [];
        }

        $n = count($parcelas);
        $alocado = '0.00';
        $out = [];
        $diaBase = $base->format('Y-m-d');

        foreach ($parcelas as $i => $p) {
            $ultimo = $i === $n - 1;
            $v = $ultimo
                ? PadraoDecimal::roundHalfUp(bcsub($valor, $alocado, PadraoDecimal::SCALE_MONEY + 2), PadraoDecimal::SCALE_MONEY)
                : PadraoDecimal::roundHalfUp(bcmul($valor, $p['peso'], 8), PadraoDecimal::SCALE_MONEY);
            $alocado = bcadd($alocado, $v, PadraoDecimal::SCALE_MONEY);
            $venc = (new \DateTimeImmutable($diaBase))->modify('+'.((int) $p['dias']).' days')->format('Y-m-d');
            $out[] = [
                'parcela' => $i + 1,
                'dias' => (int) $p['dias'],
                'valor' => $v,
                'vencimento' => $venc,
                'rotulo' => $p['rotulo'],
                'sinal' => (bool) $p['sinal'],
            ];
        }

        return $out;
    }

    /**
     * @return list<ParcelaSpec>
     */
    private function parsePercentuais(string $condicao): array
    {
        $parts = preg_split('/\s*\+\s*|\s+e\s+/iu', $condicao) ?: [];
        if (count($parts) < 2 && preg_match('/%/', $condicao) !== 1) {
            return [];
        }

        $out = [];
        $somaPct = '0';
        foreach ($parts as $part) {
            if (preg_match('/(\d+(?:[.,]\d+)?)\s*%/u', $part, $m) !== 1) {
                continue;
            }
            $pct = str_replace(',', '.', $m[1]);
            $peso = bcdiv($pct, '100', 8);
            $fold = $this->fold($part);
            $sinal = str_contains($fold, 'sinal') || str_contains($fold, 'adiant');
            $dias = 0;
            $rotulo = $pct.'%';
            if (preg_match('/(\d+)\s*ddl/i', $part, $dm) === 1) {
                $dias = (int) $dm[1];
                $rotulo .= ' '.$dias.' DDL';
            } elseif (preg_match('/a\s*vista|avista/', $fold) === 1) {
                $rotulo .= ' à vista';
            } elseif ($sinal) {
                $rotulo .= ' sinal';
            }
            $somaPct = bcadd($somaPct, $pct, 4);
            $out[] = $this->spec(count($out) + 1, $dias, $peso, $rotulo, $sinal);
        }

        if ($out === []) {
            return [];
        }

        if (bccomp($somaPct, '0', 4) <= 0) {
            return [];
        }

        return $out;
    }

    /**
     * @return ParcelaSpec
     */
    private function spec(int $parcela, int $dias, string $peso, string $rotulo, bool $sinal): array
    {
        return [
            'parcela' => $parcela,
            'dias' => $dias,
            'peso' => $peso,
            'rotulo' => $rotulo,
            'sinal' => $sinal,
        ];
    }

    private function fold(string $s): string
    {
        $map = [
            'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a',
            'é' => 'e', 'ê' => 'e',
            'í' => 'i',
            'ó' => 'o', 'ô' => 'o', 'õ' => 'o',
            'ú' => 'u',
            'ç' => 'c',
        ];

        return strtr(mb_strtolower($s), $map);
    }
}
