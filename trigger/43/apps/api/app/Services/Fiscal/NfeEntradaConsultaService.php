<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\NfeEntrada;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Consulta de NF-e vinculadas (espelho pós-receber / já vinculadas). Somente leitura.
 * Norma: ADR_ENTRADA_XML_ESPELHO · não é escrituração · não é caixa DF-e.
 */
class NfeEntradaConsultaService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function list(
        Empresa $empresa,
        ?string $q = null,
        ?int $ano = null,
    ): array {
        $query = NfeEntrada::query()
            ->where('empresa_id', $empresa->id)
            ->with([
                'ordemCompra:id,codigo,status',
                'movimento:id,codigo',
                'fornecedor:id,codigo,razao_social',
            ])
            ->orderByDesc('data_emissao')
            ->orderByDesc('id');

        if ($ano !== null && $ano > 0) {
            $query->whereYear('data_emissao', $ano);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $digits = preg_replace('/\D+/', '', $q) ?: null;
            $query->where(function ($inner) use ($like, $digits) {
                $inner->where('chave', 'like', $like)
                    ->orWhere('numero', 'like', $like)
                    ->orWhere('serie', 'like', $like)
                    ->orWhere('emit_nome', 'like', $like)
                    ->orWhereHas('ordemCompra', fn ($oc) => $oc->where('codigo', 'like', $like));
                if ($digits !== null && $digits !== '') {
                    $inner->orWhere('emit_cnpj', 'like', '%'.$digits.'%')
                        ->orWhere('chave', 'like', '%'.$digits.'%')
                        ->orWhere('numero', 'like', '%'.$digits.'%');
                }
            });
        }

        return $query->get()
            ->map(fn (NfeEntrada $e) => $this->toOut($e, detalhe: false))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function show(NfeEntrada $entrada): array
    {
        $entrada->loadMissing([
            'ordemCompra:id,codigo,status',
            'movimento:id,codigo',
            'fornecedor:id,codigo,razao_social',
            'itens',
        ]);

        return $this->toOut($entrada, detalhe: true);
    }

    /**
     * Stream do XML privado já guardado no receber() — sem SEFAZ.
     *
     * @return \Symfony\Component\HttpFoundation\StreamedResponse
     */
    public function downloadXml(Empresa $empresa, NfeEntrada $entrada)
    {
        if ($entrada->empresa_id !== $empresa->id) {
            abort(404);
        }

        if (! filled($entrada->xml_path)) {
            throw ValidationException::withMessages([
                'xml' => ['Esta NF-e recebida não tem XML armazenado.'],
            ]);
        }

        $disk = Storage::disk(NfeEntradaService::DISK);
        if (! $disk->exists($entrada->xml_path)) {
            throw ValidationException::withMessages([
                'xml' => ['Arquivo XML não encontrado no cofre da empresa.'],
            ]);
        }

        $chave = preg_replace('/\D/', '', (string) ($entrada->chave ?? '')) ?: null;
        $filename = $chave !== null && strlen($chave) === 44
            ? 'NFe-'.$chave.'.xml'
            : 'NFe-entrada-'.$entrada->id.'.xml';

        return $disk->download($entrada->xml_path, $filename, [
            'Content-Type' => 'application/xml; charset=utf-8',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function toOut(NfeEntrada $entrada, bool $detalhe): array
    {
        $totais = is_array($entrada->totais) ? $entrada->totais : [];
        $base = NfeEntradaService::toOut($entrada, $detalhe) ?? [];

        $out = array_merge($base, [
            'data_emissao' => optional($entrada->data_emissao)?->format('Y-m-d'),
            'emit_cnpj' => $entrada->emit_cnpj,
            'valor_nf' => $totais['v_nf'] ?? null,
            'ordem_compra' => $entrada->ordemCompra
                ? [
                    'id' => $entrada->ordemCompra->id,
                    'codigo' => $entrada->ordemCompra->codigo,
                    'status' => $entrada->ordemCompra->status,
                ]
                : null,
            'movimento' => $entrada->movimento
                ? [
                    'id' => $entrada->movimento->id,
                    'codigo' => $entrada->movimento->codigo,
                ]
                : null,
            'fornecedor' => $entrada->fornecedor
                ? [
                    'id' => $entrada->fornecedor->id,
                    'codigo' => $entrada->fornecedor->codigo,
                    'razao_social' => $entrada->fornecedor->razao_social,
                ]
                : null,
        ]);

        if ($detalhe) {
            $out['dest_cnpj'] = $entrada->dest_cnpj;
            $out['dest_ie'] = $entrada->dest_ie;
            $out['dest_uf'] = $entrada->dest_uf;
            $out['protocolo'] = $entrada->protocolo;
            $out['c_stat'] = $entrada->c_stat;
            $out['nat_op'] = $entrada->nat_op;
        }

        return $out;
    }
}
