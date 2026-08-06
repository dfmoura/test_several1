<?php

namespace App\Services\Relatorio;

/**
 * Traduz Spec validada para resumo em português (UI de conferência).
 */
class RelatorioResumoLegivel
{
    public function __construct(private readonly RelatorioCatalogo $catalogo) {}

    /**
     * @param  array<string, mixed>  $spec
     * @param  array<string, mixed>  $flags
     * @param  list<string>  $avisos
     */
    public function resumir(array $spec, array $flags, array $avisos = [], ?int $totalEstimado = null): string
    {
        $cat = $this->catalogo->forFlags($flags);
        $fonteId = (string) ($spec['fonte'] ?? '');
        $fonteLabel = match ($fonteId) {
            'orcamentos' => 'Orçamentos',
            'parceiros' => 'Parceiros',
            'produtos' => 'Produtos',
            'facas' => 'Mapa de facas',
            default => $fonteId,
        };
        $campos = $cat['fontes'][$fonteId]['campos'] ?? [];

        $colunas = collect($spec['colunas'] ?? [])
            ->map(fn ($c) => $campos[$c]['label'] ?? $c)
            ->implode(', ');

        $filtros = collect($spec['filtros'] ?? [])->map(function ($f) use ($campos) {
            $label = $campos[$f['campo']]['label'] ?? $f['campo'];
            $valor = is_array($f['valor']) ? json_encode($f['valor'], JSON_UNESCAPED_UNICODE) : (string) $f['valor'];

            return "{$label} {$f['op']} {$valor}";
        })->implode('; ');

        $ordenacao = collect($spec['ordenacao'] ?? [])->map(function ($o) use ($campos) {
            $label = $campos[$o['campo']]['label'] ?? $o['campo'];
            $dir = $o['dir'] === 'desc' ? 'maior → menor' : 'menor → maior';

            return "{$label} ({$dir})";
        })->implode('; ');

        $linhas = [
            "Fonte ......... {$fonteLabel}",
            'Título ........ '.($spec['titulo'] ?? 'Relatório'),
            'Colunas ....... '.($colunas !== '' ? $colunas : '—'),
            'Filtros ....... '.($filtros !== '' ? $filtros : 'nenhum'),
            'Ordenação ..... '.($ordenacao !== '' ? $ordenacao : 'padrão da fonte'),
            'Limite ........ '.($spec['limite'] ?? RelatorioCatalogo::LIMITE_PADRAO)
                .($totalEstimado !== null ? " (de ~{$totalEstimado} elegíveis)" : ''),
        ];

        if ($avisos !== []) {
            $linhas[] = 'Avisos ........ '.implode(' · ', $avisos);
        }

        return implode("\n", $linhas);
    }
}
