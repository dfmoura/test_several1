<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Models\OrdemCompraItem;
use App\Models\Parceiro;
use App\Models\ProdutoFornecedorCodigo;
use App\Services\Fiscal\NfeCompraExtractor;
use App\Support\PadraoDecimal;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Assistência XML na entrada (UC-CPR-004 lean / BL-037).
 * Preview ≠ lançamento — humano confirma e chama EstoqueEntradaService::receber.
 */
class EstoqueEntradaXmlService
{
    public const MAX_FILE_KB = 5120;

    public function __construct(private readonly NfeCompraExtractor $extractor) {}

    /**
     * @return array<string, mixed>
     */
    public function preview(Empresa $empresa, OrdemCompra $oc, UploadedFile $file): array
    {
        if ($oc->empresa_id !== $empresa->id) {
            abort(404);
        }

        if (! in_array($oc->status, OrdemCompra::STATUSES_RECEBIVEIS, true)) {
            throw ValidationException::withMessages([
                'status' => ['Ordem de compra deve estar ABERTA ou PARCIAL para preview de XML.'],
            ]);
        }

        $content = (string) file_get_contents($file->getRealPath());
        try {
            $nfe = $this->extractor->extractCompra($content);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'file' => [$e->getMessage()],
            ]);
        }

        if ($nfe['itens'] === []) {
            throw ValidationException::withMessages([
                'file' => ['XML sem itens de produto (det/prod).'],
            ]);
        }

        $oc->load(['itens.produto', 'fornecedor']);
        /** @var list<array{nivel: string, codigo: string, mensagem: string}> $warnings */
        $warnings = [];

        $emitCnpj = preg_replace('/\D/', '', (string) ($nfe['emit']['cnpj_cpf'] ?? '')) ?? '';
        $fornCnpj = preg_replace('/\D/', '', (string) ($oc->fornecedor?->cnpj_cpf ?? '')) ?? '';
        if ($fornCnpj !== '' && $emitCnpj !== '' && $fornCnpj !== $emitCnpj) {
            $warnings[] = $this->warn(
                'ALERTA',
                'EMIT_FORNECEDOR_DIVERGENTE',
                'CNPJ do emitente no XML difere do fornecedor da OC — confira antes de receber.'
            );
        }
        if ($fornCnpj === '' && $emitCnpj !== '') {
            $warnings[] = $this->warn(
                'ALERTA',
                'FORNECEDOR_SEM_CNPJ',
                'Fornecedor da OC sem CNPJ cadastrado — não foi possível confrontar o emitente.'
            );
        }

        $destCnpj = preg_replace('/\D/', '', (string) ($nfe['dest_cnpj'] ?? '')) ?? '';
        $empCnpj = preg_replace('/\D/', '', (string) ($empresa->cnpj ?? '')) ?? '';
        if ($empCnpj !== '' && $destCnpj !== '' && $empCnpj !== $destCnpj) {
            $outraEmp = Empresa::query()
                ->where('situacao', 'ATIVA')
                ->where('id', '!=', $empresa->id)
                ->get(['id', 'codigo', 'nome_fantasia', 'razao_social', 'cnpj'])
                ->first(function (Empresa $e) use ($destCnpj) {
                    $c = preg_replace('/\D/', '', (string) ($e->cnpj ?? '')) ?? '';

                    return $c !== '' && $c === $destCnpj;
                });

            $msg = 'Destinatário do XML (CNPJ '.$this->maskCnpj($destCnpj).') difere da empresa ativa '
                .($empresa->codigo ? $empresa->codigo.' ' : '')
                .'(CNPJ '.$this->maskCnpj($empCnpj).'). Não lance neste livro.';
            if ($outraEmp) {
                $label = $outraEmp->codigo
                    .($outraEmp->nome_fantasia ? ' — '.$outraEmp->nome_fantasia : '');
                $msg .= ' Troque para a EMP '.$label.' (mesmo CNPJ do destinatário) e abra a OC nela.';
            } else {
                $msg .= ' Se o CNPJ não é desta instalação, a NF não deve entrar aqui.';
            }
            $warnings[] = $this->warn('ALERTA', 'DEST_CNPJ_DIVERGENTE', $msg);
        }

        $maps = ProdutoFornecedorCodigo::query()
            ->where('empresa_id', $empresa->id)
            ->where('fornecedor_id', $oc->fornecedor_id)
            ->get()
            ->keyBy('c_prod');

        $pendentes = $oc->itens
            ->filter(function (OrdemCompraItem $item) {
                $rest = bcsub((string) $item->qtde_pedida, (string) $item->qtde_recebida, PadraoDecimal::SCALE_QTY);

                return bccomp($rest, '0', PadraoDecimal::SCALE_QTY) > 0;
            })
            ->values();

        $usedOcItemIds = [];
        $linhas = [];

        foreach ($nfe['itens'] as $xmlItem) {
            $match = $this->sugerirMatch($xmlItem, $pendentes, $maps, $usedOcItemIds);
            if ($match['ordem_compra_item_id'] !== null) {
                $usedOcItemIds[] = $match['ordem_compra_item_id'];
            }

            $linhas[] = [
                'n_item' => $xmlItem['n_item'],
                'c_prod' => $xmlItem['c_prod'],
                'x_prod' => $xmlItem['x_prod'],
                'ncm' => $xmlItem['ncm'],
                'u_com' => $xmlItem['u_com'],
                'q_com' => $xmlItem['q_com'],
                'v_un_com' => $xmlItem['v_un_com'],
                'v_prod' => $xmlItem['v_prod'],
                'cfop' => $xmlItem['cfop'],
                'orig' => $xmlItem['orig'] ?? null,
                'cst_icms' => $xmlItem['cst_icms'] ?? null,
                'csosn' => $xmlItem['csosn'] ?? null,
                'p_icms' => $xmlItem['p_icms'] ?? null,
                'v_icms' => $xmlItem['v_icms'] ?? null,
                'v_ipi' => $xmlItem['v_ipi'] ?? null,
                'v_pis' => $xmlItem['v_pis'] ?? null,
                'v_cofins' => $xmlItem['v_cofins'] ?? null,
                'rastros' => $xmlItem['rastros'] ?? [],
                'match' => $match,
            ];
        }

        $sugeridosReceber = [];
        foreach ($linhas as $linha) {
            $ocItemId = $linha['match']['ordem_compra_item_id'] ?? null;
            if ($ocItemId === null) {
                continue;
            }
            if (! isset($sugeridosReceber[$ocItemId])) {
                $sugeridosReceber[$ocItemId] = '0';
            }
            $sugeridosReceber[$ocItemId] = PadraoDecimal::roundHalfUp(
                bcadd($sugeridosReceber[$ocItemId], (string) $linha['q_com'], PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );
        }

        $itensReceber = [];
        $valorItensSugerido = '0';
        foreach ($sugeridosReceber as $ocItemId => $qtde) {
            $ocItem = $pendentes->firstWhere('id', (int) $ocItemId);
            $rastro = $this->primeiroRastroDaOc($linhas, (int) $ocItemId);
            $itemSug = [
                'ordem_compra_item_id' => (int) $ocItemId,
                'qtde_recebida' => $qtde,
            ];
            if ($rastro && $ocItem?->produto?->controla_lote) {
                $itemSug['lote_codigo'] = $rastro['codigo'];
                $itemSug['lote_data_fabricacao'] = $rastro['data_fabricacao'];
                $itemSug['lote_data_validade'] = $rastro['data_validade'];
                $itemSug['lote_data_entrada'] = $nfe['data_emissao'] ?? now()->toDateString();
            }
            $itensReceber[] = $itemSug;
            if ($ocItem) {
                $linhaValor = PadraoDecimal::roundHalfUp(
                    bcmul($qtde, (string) $ocItem->valor_unitario, PadraoDecimal::SCALE_UNIT_PRICE + 4),
                    PadraoDecimal::SCALE_MONEY
                );
                $valorItensSugerido = bcadd($valorItensSugerido, $linhaValor, PadraoDecimal::SCALE_MONEY);
            }
        }
        $valorItensSugerido = PadraoDecimal::roundHalfUp($valorItensSugerido, PadraoDecimal::SCALE_MONEY);

        $parcelas = $nfe['parcelas'] ?? [];
        $somaParcelas = '0';
        foreach ($parcelas as $p) {
            $somaParcelas = bcadd($somaParcelas, (string) $p['valor'], PadraoDecimal::SCALE_MONEY);
        }
        $somaParcelas = PadraoDecimal::roundHalfUp($somaParcelas, PadraoDecimal::SCALE_MONEY);

        $totais = $nfe['totais'] ?? [];
        $valorNf = $nfe['valor_nf'] ?? ($totais['v_nf'] ?? null);
        if ($parcelas !== [] && $valorNf !== null && bccomp($somaParcelas, (string) $valorNf, PadraoDecimal::SCALE_MONEY) !== 0) {
            $warnings[] = $this->warn(
                'ALERTA',
                'PARCELAS_VS_VNF',
                "Soma das parcelas (R$ {$somaParcelas}) difere do vNF (R$ {$valorNf}) — confira antes de confirmar."
            );
        }
        if ($parcelas !== [] && bccomp($valorItensSugerido, '0', PadraoDecimal::SCALE_MONEY) > 0
            && bccomp($somaParcelas, $valorItensSugerido, PadraoDecimal::SCALE_MONEY) !== 0) {
            $diff = PadraoDecimal::roundHalfUp(
                bcsub($somaParcelas, $valorItensSugerido, PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            );
            $explicacao = $this->explicarDiffFiscal($diff, $totais);
            if ($explicacao !== null) {
                $warnings[] = $this->warn(
                    'INFO',
                    'PARCELAS_VS_OC_FISCAL_OK',
                    "Pagar R$ {$somaParcelas} (parcelas/vNF) × estoque R$ {$valorItensSugerido} (OC). "
                    ."Diferença R$ {$diff} explicada por {$explicacao}. "
                    .'Mantenha as parcelas da NF no financeiro; o MOV segue o valor da OC.'
                );
            } else {
                $warnings[] = $this->warn(
                    'ALERTA',
                    'PARCELAS_VS_OC',
                    "Parcelas da NF (R$ {$somaParcelas}) ≠ valor dos itens da OC (R$ {$valorItensSugerido}). "
                    .'Confira preço/qtde da OC ou se há custo não mapeado (frete FOB, ST, desconto).'
                );
            }
        }

        return [
            'nf' => [
                'chave' => $nfe['chave_nfe'],
                'numero' => $nfe['numero'],
                'serie' => $nfe['serie'],
                'data_emissao' => $nfe['data_emissao'],
                'vencimento_sugerido' => $nfe['vencimento_sugerido'],
                'valor_nf' => $nfe['valor_nf'],
                'totais' => $nfe['totais'] ?? null,
                'parcelas' => $parcelas,
                'destinatario' => [
                    'cnpj_cpf' => $nfe['dest_cnpj'] ?? $nfe['dest_cpf'] ?? null,
                    'ie' => $nfe['dest_ie'] ?? null,
                    'uf' => $nfe['dest_uf'] ?? null,
                ],
                'emitente' => [
                    'cnpj_cpf' => $nfe['emit']['cnpj_cpf'] ?? null,
                    'razao_social' => $nfe['emit']['razao_social'] ?? null,
                    'nome_fantasia' => $nfe['emit']['nome_fantasia'] ?? null,
                    'ie' => $nfe['emit']['ie'] ?? null,
                    'uf' => $nfe['emit']['uf'] ?? null,
                    'crt' => $nfe['emit']['crt'] ?? null,
                ],
                'nat_op' => $nfe['nat_op'] ?? null,
                'id_dest' => $nfe['id_dest'] ?? null,
                'modelo' => $nfe['modelo'] ?? null,
            ],
            'espelho' => $this->montarEspelho($nfe, $linhas),
            'warnings' => $warnings,
            'linhas' => $linhas,
            'sugerido_receber' => [
                'nf_chave' => $nfe['chave_nfe'],
                'nf_numero' => $nfe['numero'],
                'nf_data' => $nfe['data_emissao'],
                'nf_valor' => $nfe['valor_nf'],
                'nf_totais' => $nfe['totais'] ?? null,
                'vencimento' => $nfe['vencimento_sugerido'],
                'parcelas' => $parcelas,
                'itens' => $itensReceber,
            ],
            'oc_itens' => $pendentes->map(fn (OrdemCompraItem $item) => [
                'id' => $item->id,
                'produto_id' => $item->produto_id,
                'produto' => $item->produto ? [
                    'id' => $item->produto->id,
                    'codigo' => $item->produto->codigo,
                    'descricao_fiscal' => $item->produto->descricao_fiscal,
                    'ncm' => $item->produto->ncm,
                    'unidade_comercial' => $item->produto->unidade_comercial,
                ] : null,
                'qtde_pedida' => (string) $item->qtde_pedida,
                'qtde_recebida' => (string) $item->qtde_recebida,
                'qtde_pendente' => PadraoDecimal::roundHalfUp(
                    bcsub((string) $item->qtde_pedida, (string) $item->qtde_recebida, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                ),
                'unidade' => $item->unidade,
            ])->values()->all(),
        ];
    }

    /**
     * Persiste de-para cProd após receber (humano confirmou o vínculo).
     *
     * @param  list<array{c_prod: string, produto_id: int, x_prod?: ?string}>  $maps
     */
    public function persistMaps(Empresa $empresa, Parceiro|int $fornecedor, array $maps): void
    {
        $fornecedorId = $fornecedor instanceof Parceiro ? $fornecedor->id : $fornecedor;

        foreach ($maps as $row) {
            $cProd = trim((string) ($row['c_prod'] ?? ''));
            $produtoId = (int) ($row['produto_id'] ?? 0);
            if ($cProd === '' || $produtoId <= 0) {
                continue;
            }

            ProdutoFornecedorCodigo::query()->updateOrCreate(
                [
                    'empresa_id' => $empresa->id,
                    'fornecedor_id' => $fornecedorId,
                    'c_prod' => $cProd,
                ],
                [
                    'produto_id' => $produtoId,
                    'x_prod' => isset($row['x_prod']) ? $this->nullIfEmpty($row['x_prod']) : null,
                ]
            );
        }
    }

    /**
     * @param  array<string, mixed>  $xmlItem
     * @param  \Illuminate\Support\Collection<int, OrdemCompraItem>  $pendentes
     * @param  \Illuminate\Support\Collection<string, ProdutoFornecedorCodigo>  $maps
     * @param  list<int>  $usedOcItemIds
     * @return array{ordem_compra_item_id: ?int, produto_id: ?int, confianca: string, motivo: string}
     */
    private function sugerirMatch($xmlItem, $pendentes, $maps, array $usedOcItemIds): array
    {
        $cProd = (string) $xmlItem['c_prod'];

        // 1) De-para explícito
        $map = $maps->get($cProd);
        if ($map) {
            $item = $pendentes->first(function (OrdemCompraItem $i) use ($map, $usedOcItemIds) {
                return $i->produto_id === $map->produto_id
                    && ! in_array($i->id, $usedOcItemIds, true);
            });
            if ($item) {
                return [
                    'ordem_compra_item_id' => $item->id,
                    'produto_id' => $item->produto_id,
                    'confianca' => 'ALTA',
                    'motivo' => 'de-para cProd',
                ];
            }
        }

        // 2) Único item OC pendente com mesma qtde comercial
        $qCom = PadraoDecimal::roundHalfUp((string) $xmlItem['q_com'], PadraoDecimal::SCALE_QTY);
        $byQty = $pendentes->filter(function (OrdemCompraItem $i) use ($qCom, $usedOcItemIds) {
            if (in_array($i->id, $usedOcItemIds, true)) {
                return false;
            }
            $pend = PadraoDecimal::roundHalfUp(
                bcsub((string) $i->qtde_pedida, (string) $i->qtde_recebida, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );

            return bccomp($pend, $qCom, PadraoDecimal::SCALE_QTY) === 0;
        });
        if ($byQty->count() === 1) {
            /** @var OrdemCompraItem $item */
            $item = $byQty->first();

            return [
                'ordem_compra_item_id' => $item->id,
                'produto_id' => $item->produto_id,
                'confianca' => 'MEDIA',
                'motivo' => 'quantidade pendente igual',
            ];
        }

        // 3) NCM único entre pendentes
        $ncm = $xmlItem['ncm'] ?? null;
        if ($ncm) {
            $byNcm = $pendentes->filter(function (OrdemCompraItem $i) use ($ncm, $usedOcItemIds) {
                if (in_array($i->id, $usedOcItemIds, true)) {
                    return false;
                }
                $prodNcm = preg_replace('/\D/', '', (string) ($i->produto?->ncm ?? '')) ?? '';

                return $prodNcm !== '' && $prodNcm === $ncm;
            });
            if ($byNcm->count() === 1) {
                /** @var OrdemCompraItem $item */
                $item = $byNcm->first();

                return [
                    'ordem_compra_item_id' => $item->id,
                    'produto_id' => $item->produto_id,
                    'confianca' => 'BAIXA',
                    'motivo' => 'NCM único na OC',
                ];
            }
        }

        // 4) Único pendente restante
        $rest = $pendentes->filter(fn (OrdemCompraItem $i) => ! in_array($i->id, $usedOcItemIds, true));
        if ($rest->count() === 1) {
            /** @var OrdemCompraItem $item */
            $item = $rest->first();

            return [
                'ordem_compra_item_id' => $item->id,
                'produto_id' => $item->produto_id,
                'confianca' => 'BAIXA',
                'motivo' => 'único item pendente na OC',
            ];
        }

        return [
            'ordem_compra_item_id' => null,
            'produto_id' => null,
            'confianca' => 'NENHUMA',
            'motivo' => 'selecione o item da OC',
        ];
    }

    /**
     * Espelho só leitura — matéria-prima do livro, não escrituração.
     *
     * @param  array<string, mixed>  $nfe
     * @param  list<array<string, mixed>>  $linhas
     * @return array<string, mixed>
     */
    private function montarEspelho(array $nfe, array $linhas): array
    {
        $totais = $nfe['totais'] ?? [];

        return [
            'nat_op' => $nfe['nat_op'] ?? null,
            'id_dest' => $nfe['id_dest'] ?? null,
            'modelo' => $nfe['modelo'] ?? null,
            'serie' => $nfe['serie'] ?? null,
            'numero' => $nfe['numero'] ?? null,
            'emit_uf' => $nfe['emit']['uf'] ?? null,
            'emit_crt' => $nfe['emit']['crt'] ?? null,
            'totais' => [
                'v_bc' => $totais['v_bc'] ?? null,
                'v_icms' => $totais['v_icms'] ?? null,
                'v_ipi' => $totais['v_ipi'] ?? null,
                'v_pis' => $totais['v_pis'] ?? null,
                'v_cofins' => $totais['v_cofins'] ?? null,
                'v_st' => $totais['v_st'] ?? null,
                'v_nf' => $totais['v_nf'] ?? $nfe['valor_nf'] ?? null,
            ],
            'itens' => array_map(static function (array $linha): array {
                return [
                    'n_item' => $linha['n_item'],
                    'cfop' => $linha['cfop'] ?? null,
                    'ncm' => $linha['ncm'] ?? null,
                    'orig' => $linha['orig'] ?? null,
                    'cst' => $linha['cst_icms'] ?? $linha['csosn'] ?? null,
                    'p_icms' => $linha['p_icms'] ?? null,
                    'v_icms' => $linha['v_icms'] ?? null,
                    'v_ipi' => $linha['v_ipi'] ?? null,
                    'v_pis' => $linha['v_pis'] ?? null,
                    'v_cofins' => $linha['v_cofins'] ?? null,
                    'v_prod' => $linha['v_prod'] ?? null,
                ];
            }, $linhas),
        ];
    }

    private function nullIfEmpty(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }
        if (is_string($value) && trim($value) === '') {
            return null;
        }

        return $value;
    }

    /**
     * @param  list<array<string, mixed>>  $linhas
     * @return array{codigo: string, qtde: string, data_fabricacao: ?string, data_validade: ?string}|null
     */
    private function primeiroRastroDaOc(array $linhas, int $ocItemId): ?array
    {
        foreach ($linhas as $linha) {
            if ((int) ($linha['match']['ordem_compra_item_id'] ?? 0) !== $ocItemId) {
                continue;
            }
            $rastros = $linha['rastros'] ?? [];
            if (is_array($rastros) && $rastros !== []) {
                return $rastros[0];
            }
        }

        return null;
    }

    /**
     * @return array{nivel: string, codigo: string, mensagem: string}
     */
    private function warn(string $nivel, string $codigo, string $mensagem): array
    {
        return [
            'nivel' => $nivel,
            'codigo' => $codigo,
            'mensagem' => $mensagem,
        ];
    }

    /**
     * @param  array<string, mixed>  $totais
     */
    private function explicarDiffFiscal(string $diff, array $totais): ?string
    {
        $abs = bccomp($diff, '0', PadraoDecimal::SCALE_MONEY) < 0
            ? PadraoDecimal::roundHalfUp(bcmul($diff, '-1', PadraoDecimal::SCALE_MONEY + 2), PadraoDecimal::SCALE_MONEY)
            : $diff;

        $candidatos = [];
        foreach (['v_ipi' => 'IPI', 'v_frete' => 'frete', 'v_outro' => 'outras despesas', 'v_st' => 'ICMS-ST'] as $key => $label) {
            $v = isset($totais[$key]) && $totais[$key] !== null && $totais[$key] !== ''
                ? PadraoDecimal::roundHalfUp((string) $totais[$key], PadraoDecimal::SCALE_MONEY)
                : '0.00';
            if (bccomp($v, '0', PadraoDecimal::SCALE_MONEY) > 0) {
                $candidatos[] = ['valor' => $v, 'label' => $label];
            }
        }

        foreach ($candidatos as $c) {
            if (bccomp($abs, $c['valor'], PadraoDecimal::SCALE_MONEY) === 0) {
                return $c['label'].' da NF (R$ '.$c['valor'].')';
            }
        }

        // Combinações comuns: IPI+frete, IPI+outro
        $n = count($candidatos);
        for ($i = 0; $i < $n; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                $soma = PadraoDecimal::roundHalfUp(
                    bcadd($candidatos[$i]['valor'], $candidatos[$j]['valor'], PadraoDecimal::SCALE_MONEY + 2),
                    PadraoDecimal::SCALE_MONEY
                );
                if (bccomp($abs, $soma, PadraoDecimal::SCALE_MONEY) === 0) {
                    return $candidatos[$i]['label'].' + '.$candidatos[$j]['label']
                        .' (R$ '.$soma.')';
                }
            }
        }

        return null;
    }

    private function maskCnpj(string $digits): string
    {
        $d = preg_replace('/\D/', '', $digits) ?? '';
        if (strlen($d) !== 14) {
            return $d;
        }

        return substr($d, 0, 2).'.'.substr($d, 2, 3).'.'.substr($d, 5, 3).'/'
            .substr($d, 8, 4).'-'.substr($d, 12, 2);
    }
}
