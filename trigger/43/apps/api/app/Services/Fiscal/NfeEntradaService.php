<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\NfeEntrada;
use App\Models\NfeEntradaItem;
use App\Models\OrdemCompra;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Persiste XML + snapshot na entrada (ADR-039-CPR-004). Não escrituração.
 */
class NfeEntradaService
{
    public const DISK = 'local';

    public function __construct(private readonly NfeCompraExtractor $extractor) {}

    /**
     * @return array<string, mixed>
     */
    public function interpretar(string $xmlContent): array
    {
        try {
            return $this->extractor->extractCompra($xmlContent);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'xml' => [$e->getMessage()],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $nfe
     * @param  list<array{c_prod: string, produto_id: int, x_prod?: ?string}>  $cprodMaps
     */
    public function gravar(
        Empresa $empresa,
        EstoqueMovimento $movimento,
        OrdemCompra $oc,
        string $xmlContent,
        array $nfe,
        array $cprodMaps = [],
    ): NfeEntrada {
        $chave = $nfe['chave_nfe'] ?? null;
        if (! is_string($chave) || strlen($chave) !== 44) {
            throw ValidationException::withMessages([
                'xml' => ['XML sem chave de acesso de 44 dígitos — não é possível guardar o espelho fiscal.'],
            ]);
        }

        $dup = NfeEntrada::query()
            ->where('empresa_id', $empresa->id)
            ->where('chave', $chave)
            ->exists();
        if ($dup) {
            throw ValidationException::withMessages([
                'xml' => ['Espelho fiscal desta chave já existe nesta empresa.'],
            ]);
        }

        $path = sprintf('nfe-entradas/%d/%s.xml', $empresa->id, $chave);
        Storage::disk(self::DISK)->put($path, $xmlContent);

        try {
            $produtoPorCprod = [];
            foreach ($cprodMaps as $map) {
                $c = trim((string) ($map['c_prod'] ?? ''));
                $pid = (int) ($map['produto_id'] ?? 0);
                if ($c !== '' && $pid > 0) {
                    $produtoPorCprod[$c] = $pid;
                }
            }

            $entrada = NfeEntrada::query()->create([
                'empresa_id' => $empresa->id,
                'movimento_id' => $movimento->id,
                'ordem_compra_id' => $oc->id,
                'fornecedor_id' => $oc->fornecedor_id,
                'chave' => $chave,
                'modelo' => $nfe['modelo'] ?? null,
                'serie' => $nfe['serie'] ?? null,
                'numero' => $nfe['numero'] ?? null,
                'data_emissao' => $nfe['data_emissao'] ?? null,
                'nat_op' => $nfe['nat_op'] ?? null,
                'id_dest' => $nfe['id_dest'] ?? null,
                'fin_nfe' => $nfe['fin_nfe'] ?? null,
                'emit_cnpj' => $nfe['emit']['cnpj_cpf'] ?? null,
                'emit_ie' => $nfe['emit']['ie'] ?? null,
                'emit_uf' => $nfe['emit']['uf'] ?? null,
                'emit_crt' => $nfe['emit']['crt'] ?? null,
                'emit_nome' => $nfe['emit']['razao_social'] ?? null,
                'dest_cnpj' => $nfe['dest_cnpj'] ?? $nfe['dest_cpf'] ?? null,
                'dest_ie' => $nfe['dest_ie'] ?? null,
                'dest_uf' => $nfe['dest_uf'] ?? null,
                'totais' => $nfe['totais'] ?? null,
                'xml_path' => $path,
                'xml_sha256' => hash('sha256', $xmlContent),
                'protocolo' => $nfe['protocolo']['n_prot'] ?? null,
                'c_stat' => $nfe['protocolo']['c_stat'] ?? null,
            ]);

            $ordem = 1;
            foreach ($nfe['itens'] as $item) {
                $cProd = (string) ($item['c_prod'] ?? '');
                NfeEntradaItem::query()->create([
                    'nfe_entrada_id' => $entrada->id,
                    'produto_id' => $produtoPorCprod[$cProd] ?? null,
                    'n_item' => (int) ($item['n_item'] ?? $ordem),
                    'c_prod' => $cProd,
                    'x_prod' => $item['x_prod'] ?? null,
                    'ncm' => $item['ncm'] ?? null,
                    'cest' => $item['cest'] ?? null,
                    'cfop' => $item['cfop'] ?? null,
                    'u_com' => $item['u_com'] ?? null,
                    'q_com' => $item['q_com'] ?? null,
                    'v_un_com' => $item['v_un_com'] ?? null,
                    'v_prod' => $item['v_prod'] ?? null,
                    'u_trib' => $item['u_trib'] ?? null,
                    'q_trib' => $item['q_trib'] ?? null,
                    'orig' => $item['orig'] ?? null,
                    'cst_icms' => $item['cst_icms'] ?? null,
                    'csosn' => $item['csosn'] ?? null,
                    'v_bc' => $item['v_bc'] ?? null,
                    'p_icms' => $item['p_icms'] ?? null,
                    'v_icms' => $item['v_icms'] ?? null,
                    'v_bc_st' => $item['v_bc_st'] ?? null,
                    'v_icms_st' => $item['v_icms_st'] ?? null,
                    'cst_ipi' => $item['cst_ipi'] ?? null,
                    'p_ipi' => $item['p_ipi'] ?? null,
                    'v_ipi' => $item['v_ipi'] ?? null,
                    'cst_pis' => $item['cst_pis'] ?? null,
                    'p_pis' => $item['p_pis'] ?? null,
                    'v_pis' => $item['v_pis'] ?? null,
                    'cst_cofins' => $item['cst_cofins'] ?? null,
                    'p_cofins' => $item['p_cofins'] ?? null,
                    'v_cofins' => $item['v_cofins'] ?? null,
                    'v_frete' => $item['v_frete'] ?? null,
                    'v_desc' => $item['v_desc'] ?? null,
                    'v_outro' => $item['v_outro'] ?? null,
                    'impostos' => $item['impostos'] ?? null,
                    'ordem' => $ordem,
                ]);
                $ordem++;
            }

            return $entrada;
        } catch (\Throwable $e) {
            Storage::disk(self::DISK)->delete($path);
            throw $e;
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    /**
     * @return array<string, mixed>|null
     */
    public static function toOut(?NfeEntrada $entrada, bool $detalhe = false): ?array
    {
        if ($entrada === null) {
            return null;
        }

        $out = [
            'id' => $entrada->id,
            'chave' => $entrada->chave,
            'modelo' => $entrada->modelo,
            'serie' => $entrada->serie,
            'numero' => $entrada->numero,
            'nat_op' => $entrada->nat_op,
            'id_dest' => $entrada->id_dest,
            'emit_uf' => $entrada->emit_uf,
            'emit_crt' => $entrada->emit_crt,
            'emit_nome' => $entrada->emit_nome,
            'xml_armazenado' => $entrada->xml_path !== null && $entrada->xml_path !== '',
        ];

        if (! $detalhe) {
            return $out;
        }

        $entrada->loadMissing('itens');
        $totais = is_array($entrada->totais) ? $entrada->totais : [];
        $out['espelho'] = [
            'nat_op' => $entrada->nat_op,
            'id_dest' => $entrada->id_dest,
            'modelo' => $entrada->modelo,
            'serie' => $entrada->serie,
            'numero' => $entrada->numero,
            'emit_uf' => $entrada->emit_uf,
            'emit_crt' => $entrada->emit_crt,
            'totais' => [
                'v_bc' => $totais['v_bc'] ?? null,
                'v_icms' => $totais['v_icms'] ?? null,
                'v_ipi' => $totais['v_ipi'] ?? null,
                'v_pis' => $totais['v_pis'] ?? null,
                'v_cofins' => $totais['v_cofins'] ?? null,
                'v_st' => $totais['v_st'] ?? null,
                'v_nf' => $totais['v_nf'] ?? null,
            ],
            'itens' => $entrada->itens->map(fn (NfeEntradaItem $item) => [
                'n_item' => (int) $item->n_item,
                'cfop' => $item->cfop,
                'ncm' => $item->ncm,
                'orig' => $item->orig,
                'cst' => $item->cst_icms ?? $item->csosn,
                'p_icms' => $item->p_icms,
                'v_icms' => $item->v_icms,
                'v_ipi' => $item->v_ipi,
                'v_pis' => $item->v_pis,
                'v_cofins' => $item->v_cofins,
                'v_prod' => $item->v_prod,
            ])->values()->all(),
        ];

        return $out;
    }
}
