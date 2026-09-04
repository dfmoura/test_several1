<?php

namespace App\Services\Compras;

use App\Models\DfeDocumento;
use App\Models\DfeSyncEstado;
use App\Models\Empresa;

/**
 * Caixa DF-e — leitura local (BL-090). Sem chamada SEFAZ.
 * Norma: docs/ADR_CAIXA_DFE_NFE_DESTINADAS.md
 */
class DfeCaixaService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function list(
        Empresa $empresa,
        ?string $q = null,
        ?string $situacao = null,
        ?int $ano = null,
    ): array {
        $query = DfeDocumento::query()
            ->where('empresa_id', $empresa->id)
            ->with(['ordemCompra:id,codigo,status'])
            ->orderByDesc('data_emissao')
            ->orderByDesc('id');

        if ($situacao !== null && $situacao !== '') {
            $query->where('situacao', $situacao);
        }

        if ($ano !== null && $ano > 0) {
            $query->whereYear('data_emissao', $ano);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $digits = preg_replace('/\D+/', '', $q) ?: null;
            $query->where(function ($inner) use ($like, $digits) {
                $inner->where('chave', 'like', $like)
                    ->orWhere('numero', 'like', $like)
                    ->orWhere('emit_nome', 'like', $like)
                    ->orWhere('nsu', 'like', $like);
                if ($digits !== null && $digits !== '') {
                    $inner->orWhere('emit_cnpj', 'like', '%'.$digits.'%')
                        ->orWhere('chave', 'like', '%'.$digits.'%');
                }
            });
        }

        return $query->get()->map(fn (DfeDocumento $doc) => $this->toOut($doc))->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function show(DfeDocumento $doc): array
    {
        $doc->loadMissing(['ordemCompra:id,codigo,status']);

        return $this->toOut($doc, detalhe: true);
    }

    /**
     * Estado do sync (sempre local). Cria linha IDLE sob demanda.
     *
     * @return array<string, mixed>
     */
    public function syncEstado(Empresa $empresa): array
    {
        $estado = DfeSyncEstado::query()->firstOrCreate(
            ['empresa_id' => $empresa->id],
            [
                'ultimo_nsu' => '0',
                'sync_status' => DfeSyncEstado::STATUS_IDLE,
                'ano_alvo_hidratacao' => (int) now()->year,
            ],
        );

        return [
            'empresa_id' => $estado->empresa_id,
            'ultimo_nsu' => $estado->ultimo_nsu,
            'max_nsu' => $estado->max_nsu,
            'sync_status' => $estado->sync_status,
            'sync_mensagem' => $estado->sync_mensagem,
            'ultima_sync_em' => optional($estado->ultima_sync_em)?->toIso8601String(),
            'primeira_hidratacao_completa' => (bool) $estado->primeira_hidratacao_completa,
            'ano_alvo_hidratacao' => $estado->ano_alvo_hidratacao,
            'total_documentos' => DfeDocumento::query()->where('empresa_id', $empresa->id)->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(DfeDocumento $doc, bool $detalhe = false): array
    {
        $out = [
            'id' => $doc->id,
            'empresa_id' => $doc->empresa_id,
            'nsu' => $doc->nsu,
            'schema_dfe' => $doc->schema_dfe,
            'chave' => $doc->chave,
            'modelo' => $doc->modelo,
            'serie' => $doc->serie,
            'numero' => $doc->numero,
            'data_emissao' => optional($doc->data_emissao)?->format('Y-m-d'),
            'emit_cnpj' => $doc->emit_cnpj,
            'emit_nome' => $doc->emit_nome,
            'valor_total' => $doc->valor_total !== null ? (string) $doc->valor_total : null,
            'situacao' => $doc->situacao,
            'ordem_compra_id' => $doc->ordem_compra_id,
            'ordem_compra' => $doc->ordemCompra ? [
                'id' => $doc->ordemCompra->id,
                'codigo' => $doc->ordemCompra->codigo,
                'status' => $doc->ordemCompra->status,
            ] : null,
            'tem_xml' => $doc->temXml(),
            'created_at' => optional($doc->created_at)?->toIso8601String(),
            'updated_at' => optional($doc->updated_at)?->toIso8601String(),
        ];

        if ($detalhe) {
            $out['resumo'] = $doc->resumo;
            $out['xml_disponivel'] = $doc->temXml();
            $busca = is_array($doc->resumo) ? ($doc->resumo['xml_busca'] ?? null) : null;
            $out['xml_busca'] = $busca;
            $out['xml_busca_msg'] = is_array($doc->resumo) ? ($doc->resumo['xml_busca_msg'] ?? null) : null;
        }

        return $out;
    }
}
