<?php

namespace App\Services\Fiscal\Sefaz;

use App\Services\Fiscal\NfeChaveAcesso;
use RuntimeException;

/**
 * Resolve URLs do autorizador por UF + ambiente.
 * SVRS cobre a maioria; MG/SP/PR/RS/etc. com endpoints próprios quando conhecidos.
 */
final class SefazNfeUrlResolver
{
    /** UFs que usam SVRS (autorização + eventos). */
    private const SVRS = [
        'AC', 'AL', 'AP', 'DF', 'ES', 'PB', 'RJ', 'RN', 'RO', 'RR', 'SC', 'SE', 'TO',
    ];

    /**
     * @return array{autorizacao: string, ret_autorizacao: string, evento: string}
     */
    public function urls(string $uf, int $tpAmb): array
    {
        $uf = strtoupper(trim($uf));
        $stage = $tpAmb === 1 ? 'production' : 'homolog';
        $map = config('erp.nfe.urls.'.$stage, []);
        if (! is_array($map)) {
            $map = [];
        }

        $key = $this->autorizadorKey($uf);
        $block = $map[$key] ?? $map['SVRS'] ?? null;
        if (! is_array($block)
            || empty($block['autorizacao'])
            || empty($block['ret_autorizacao'])
            || empty($block['evento'])) {
            throw new RuntimeException('URLs SEFAZ NF-e não configuradas para UF '.$uf.' ('.$stage.').');
        }

        return [
            'autorizacao' => (string) $block['autorizacao'],
            'ret_autorizacao' => (string) $block['ret_autorizacao'],
            'evento' => (string) $block['evento'],
        ];
    }

    public function cuf(string $uf): string
    {
        return NfeChaveAcesso::cuf($uf);
    }

    public function autorizadorKey(string $uf): string
    {
        $uf = strtoupper(trim($uf));
        if (in_array($uf, self::SVRS, true)) {
            return 'SVRS';
        }

        return match ($uf) {
            'MG', 'SP', 'PR', 'RS', 'MT', 'MS', 'GO', 'BA', 'PE', 'CE', 'AM', 'MA', 'PI' => $uf,
            default => 'SVRS',
        };
    }
}
