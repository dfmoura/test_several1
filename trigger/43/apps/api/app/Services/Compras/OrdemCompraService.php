<?php

namespace App\Services\Compras;

use App\Models\CompraNecessidade;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Models\OrdemCompraItem;
use App\Models\OrdemCompraItemComposicao;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Fiscal\NfeEntradaService;
use App\Support\BobinaAreaComercial;
use App\Support\NfeExactDimensoes;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrdemCompraService
{
    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly OrdemCompraEmailService $email,
        private readonly OcImpostoEstimativaService $impostoEstimativa,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $status = null, ?int $fornecedorId = null): array
    {
        $query = OrdemCompra::query()
            ->with([
                'fornecedor:id,codigo,razao_social,nome_fantasia,cnpj_cpf,email,telefone',
                'transportador:id,codigo,razao_social,nome_fantasia,cnpj_cpf,ie,logradouro,numero,complemento,bairro,municipio,uf,cep,telefone,email',
                'itens.produto:id,codigo,descricao_fiscal,descricao_comercial,familia',
                'itens.composicoes',
                ...OrdemCompra::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }

        if ($fornecedorId) {
            $query->where('fornecedor_id', $fornecedorId);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('observacao', 'like', $like)
                    ->orWhereHas('fornecedor', function ($fq) use ($like) {
                        $fq->where('codigo', 'like', $like)
                            ->orWhere('razao_social', 'like', $like)
                            ->orWhere('nome_fantasia', 'like', $like);
                    });
            });
        }

        return $query->get()->map(fn (OrdemCompra $oc) => $this->toOut($oc))->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $fornecedor = $this->assertFornecedor($empresa, (int) $data['fornecedor_id']);
        $modFrete = $this->resolveModFrete($data['mod_frete'] ?? null);
        $transportador = $this->resolveTransportador(
            $empresa,
            isset($data['transportador_id']) ? (int) $data['transportador_id'] : null,
            $modFrete,
        );
        $necessidade = null;
        if (! empty($data['necessidade_id'])) {
            $necessidade = CompraNecessidade::query()
                ->where('empresa_id', $empresa->id)
                ->where('id', (int) $data['necessidade_id'])
                ->first();
            if (! $necessidade) {
                throw ValidationException::withMessages([
                    'necessidade_id' => ['Necessidade inválida para a empresa.'],
                ]);
            }
        }

        $itensPayload = $this->normalizeItens($empresa, $fornecedor, $data['itens'] ?? []);

        $oc = DB::transaction(function () use ($empresa, $data, $fornecedor, $transportador, $modFrete, $necessidade, $itensPayload) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'OC-'.$ano, 5);

            $valorTotal = '0';
            $valorIpi = '0';
            $valorIcms = '0';
            foreach ($itensPayload as $item) {
                $valorTotal = bcadd($valorTotal, $item['valor_total'], PadraoDecimal::SCALE_MONEY);
                $valorIpi = bcadd($valorIpi, $item['valor_ipi'], PadraoDecimal::SCALE_MONEY);
                $valorIcms = bcadd($valorIcms, $item['valor_icms'], PadraoDecimal::SCALE_MONEY);
            }
            $valorTotal = PadraoDecimal::roundHalfUp($valorTotal, PadraoDecimal::SCALE_MONEY);
            $valorIpi = PadraoDecimal::roundHalfUp($valorIpi, PadraoDecimal::SCALE_MONEY);
            $valorIcms = PadraoDecimal::roundHalfUp($valorIcms, PadraoDecimal::SCALE_MONEY);

            $oc = OrdemCompra::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'fornecedor_id' => $fornecedor->id,
                'transportador_id' => $transportador?->id,
                'cotacao_id' => $data['cotacao_id'] ?? null,
                'necessidade_id' => $necessidade?->id,
                'origem' => $data['origem'] ?? OrdemCompra::ORIGEM_DIRETA,
                'urgente' => (bool) ($data['urgente'] ?? false),
                'status' => OrdemCompra::STATUS_RASCUNHO,
                'condicao_pagamento' => $this->nullIfEmpty($data['condicao_pagamento'] ?? null),
                'previsao_entrega' => $data['previsao_entrega'] ?? null,
                'valor_total' => $valorTotal,
                'valor_frete' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY),
                'mod_frete' => $modFrete,
                'valor_ipi' => $valorIpi,
                'valor_icms' => $valorIcms,
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
            ]);

            foreach ($itensPayload as $item) {
                $this->persistItem($oc->id, $item);
            }

            if ($necessidade && $necessidade->status === CompraNecessidade::STATUS_ABERTA) {
                $necessidade->status = CompraNecessidade::STATUS_ATENDIDA;
                $necessidade->save();
            }

            return $oc;
        });

        return $this->show($oc);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(OrdemCompra $oc, Empresa $empresa, array $data): array
    {
        $this->assertEditavel($oc);
        $fornecedor = $this->assertFornecedor($empresa, (int) $data['fornecedor_id']);
        $modFrete = $this->resolveModFrete($data['mod_frete'] ?? null);
        $transportador = $this->resolveTransportador(
            $empresa,
            isset($data['transportador_id']) ? (int) $data['transportador_id'] : null,
            $modFrete,
        );
        $itensPayload = $this->normalizeItens($empresa, $fornecedor, $data['itens'] ?? []);

        DB::transaction(function () use ($oc, $data, $fornecedor, $transportador, $modFrete, $itensPayload) {
            $valorTotal = '0';
            $valorIpi = '0';
            $valorIcms = '0';
            foreach ($itensPayload as $item) {
                $valorTotal = bcadd($valorTotal, $item['valor_total'], PadraoDecimal::SCALE_MONEY);
                $valorIpi = bcadd($valorIpi, $item['valor_ipi'], PadraoDecimal::SCALE_MONEY);
                $valorIcms = bcadd($valorIcms, $item['valor_icms'], PadraoDecimal::SCALE_MONEY);
            }
            $valorTotal = PadraoDecimal::roundHalfUp($valorTotal, PadraoDecimal::SCALE_MONEY);
            $valorIpi = PadraoDecimal::roundHalfUp($valorIpi, PadraoDecimal::SCALE_MONEY);
            $valorIcms = PadraoDecimal::roundHalfUp($valorIcms, PadraoDecimal::SCALE_MONEY);

            $oc->fornecedor_id = $fornecedor->id;
            $oc->transportador_id = $transportador?->id;
            $oc->urgente = (bool) ($data['urgente'] ?? false);
            $oc->condicao_pagamento = $this->nullIfEmpty($data['condicao_pagamento'] ?? null);
            $oc->previsao_entrega = $data['previsao_entrega'] ?? null;
            $oc->valor_total = $valorTotal;
            $oc->valor_frete = PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY);
            $oc->mod_frete = $modFrete;
            $oc->valor_ipi = $valorIpi;
            $oc->valor_icms = $valorIcms;
            $oc->observacao = $this->nullIfEmpty($data['observacao'] ?? null);
            $oc->save();

            $oc->itens()->delete();
            foreach ($itensPayload as $item) {
                $this->persistItem($oc->id, $item);
            }
        });

        return $this->show($oc->fresh());
    }

    public function destroy(OrdemCompra $oc): void
    {
        $this->assertEditavel($oc);

        DB::transaction(function () use ($oc) {
            $oc->status = OrdemCompra::STATUS_CANCELADA;
            $oc->save();
            $oc->delete();
        });
    }

    /**
     * Formaliza a OC (RASCUNHO → ABERTA) e tenta e-mail ao fornecedor (fail-soft).
     *
     * @return array<string, mixed>
     */
    public function enviar(OrdemCompra $oc, Empresa $empresa, bool $reenviarEmail = false): array
    {
        if ($oc->status === OrdemCompra::STATUS_RASCUNHO) {
            $oc->status = OrdemCompra::STATUS_ABERTA;
            $oc->enviado_em = now();
            $oc->save();
        } elseif (! in_array($oc->status, OrdemCompra::STATUSES_RECEBIVEIS, true)) {
            throw ValidationException::withMessages([
                'status' => ['Só é possível enviar OC em rascunho (ou reenviar e-mail se já estiver aberta/parcial).'],
            ]);
        } elseif (! $reenviarEmail) {
            throw ValidationException::withMessages([
                'status' => ['OC já enviada. Use reenviar e-mail se precisar disparar de novo.'],
            ]);
        }

        $emailMeta = $this->email->tentarEnviar($oc->fresh(), $empresa);
        $out = $this->show($oc->fresh());
        $out['email_enviado'] = $emailMeta['enviado'];
        $out['email_destino'] = $emailMeta['destino'];
        $out['email_motivo'] = $emailMeta['motivo'];

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public function show(OrdemCompra $oc): array
    {
        $oc->load([
            'fornecedor',
            'itens.produto:id,codigo,descricao_fiscal,descricao_comercial,familia,unidade_comercial,unidade_interna,fator_conversao,controla_lote,controla_validade,prazo_validade_dias,ncm,origem,cest',
            'itens.composicoes',
            'necessidade:id,codigo,status',
            'cotacao:id,codigo,status',
            'movimentos.nfeEntrada.itens',
            'empresa:id,codigo,razao_social,nome_fantasia,cnpj,email,telefone,logradouro,numero,complemento,bairro,municipio,uf,cep,ie,crt,regime',
            ...OrdemCompra::userStampWith(),
        ]);

        return $this->toOut($oc);
    }

    /**
     * Sugestão automática de alíquotas (última NF + tabela UF×UF).
     *
     * @param  list<int>  $produtoIds
     * @return array<string, mixed>
     */
    public function estimarImpostos(Empresa $empresa, int $fornecedorId, array $produtoIds): array
    {
        $fornecedor = $this->assertFornecedor($empresa, $fornecedorId);

        return $this->impostoEstimativa->estimar($empresa, $fornecedor, $produtoIds);
    }

    /**
     * @return array<string, mixed>
     */
    public function cancel(OrdemCompra $oc): array
    {
        if ($oc->status === OrdemCompra::STATUS_CANCELADA) {
            throw ValidationException::withMessages([
                'status' => ['Ordem de compra já cancelada.'],
            ]);
        }

        if (in_array($oc->status, [OrdemCompra::STATUS_PARCIAL, OrdemCompra::STATUS_RECEBIDA], true)) {
            throw ValidationException::withMessages([
                'status' => ['Não é possível cancelar OC com recebimento.'],
            ]);
        }

        $oc->status = OrdemCompra::STATUS_CANCELADA;
        $oc->save();

        return $this->show($oc);
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(OrdemCompra $oc): array
    {
        $oc->loadMissing([
            'fornecedor',
            'transportador',
            'itens.produto:id,codigo,descricao_fiscal,descricao_comercial,familia,unidade_comercial,unidade_interna,fator_conversao,controla_lote,controla_validade,prazo_validade_dias,ncm,origem,cest',
            'itens.composicoes',
            'empresa:id,codigo,razao_social,nome_fantasia,cnpj,email,telefone,logradouro,numero,complemento,bairro,municipio,uf,cep,ie,crt,regime',
            ...OrdemCompra::userStampWith(),
        ]);

        $fornecedor = $oc->fornecedor;
        $transportador = $oc->transportador;
        $empresa = $oc->relationLoaded('empresa') ? $oc->empresa : null;
        $empUf = $empresa?->uf ? strtoupper(trim((string) $empresa->uf)) : null;
        $fornUf = $fornecedor?->uf ? strtoupper(trim((string) $fornecedor->uf)) : null;
        $idDest = $empUf && $fornUf ? ($empUf === $fornUf ? '1' : '2') : null;

        return [
            'id' => $oc->id,
            'empresa_id' => $oc->empresa_id,
            'codigo' => $oc->codigo,
            'fornecedor_id' => $oc->fornecedor_id,
            'fornecedor' => $fornecedor ? [
                'id' => $fornecedor->id,
                'codigo' => $fornecedor->codigo,
                'razao_social' => $fornecedor->razao_social,
                'nome_fantasia' => $fornecedor->nome_fantasia,
                'cnpj_cpf' => $fornecedor->cnpj_cpf,
                'email' => $fornecedor->email,
                'telefone' => $fornecedor->telefone,
                'logradouro' => $fornecedor->logradouro,
                'numero' => $fornecedor->numero,
                'complemento' => $fornecedor->complemento,
                'bairro' => $fornecedor->bairro,
                'municipio' => $fornecedor->municipio,
                'uf' => $fornecedor->uf,
                'cep' => $fornecedor->cep,
                'ie' => $fornecedor->ie,
                'ind_ie_dest' => $fornecedor->ind_ie_dest,
                'ie_status' => $fornecedor->ie_status,
                'regime' => $fornecedor->regime,
                'suframa' => $fornecedor->suframa,
                'finalidade' => $fornecedor->finalidade ?? null,
                'cfop_entrada_padrao' => $fornecedor->cfop_entrada_padrao ?? null,
            ] : null,
            'transportador_id' => $oc->transportador_id,
            'transportador' => $transportador ? $this->parceiroResumo($transportador) : null,
            'empresa' => $empresa ? [
                'id' => $empresa->id,
                'codigo' => $empresa->codigo,
                'razao_social' => $empresa->razao_social,
                'nome_fantasia' => $empresa->nome_fantasia,
                'cnpj' => $empresa->cnpj,
                'email' => $empresa->email,
                'telefone' => $empresa->telefone,
                'logradouro' => $empresa->logradouro,
                'numero' => $empresa->numero,
                'complemento' => $empresa->complemento,
                'bairro' => $empresa->bairro,
                'municipio' => $empresa->municipio,
                'uf' => $empresa->uf,
                'cep' => $empresa->cep,
                'ie' => $empresa->ie ?? null,
                'crt' => $empresa->crt ?? null,
                'regime' => $empresa->regime ?? null,
            ] : null,
            'operacao' => [
                'id_dest' => $idDest,
                'id_dest_label' => $idDest === '1' ? 'Interna' : ($idDest === '2' ? 'Interestadual' : null),
                'empresa_uf' => $empUf,
                'fornecedor_uf' => $fornUf,
            ],
            'cotacao_id' => $oc->cotacao_id,
            'necessidade_id' => $oc->necessidade_id,
            'origem' => $oc->origem,
            'urgente' => (bool) $oc->urgente,
            'status' => $oc->status,
            'editavel' => $oc->isEditavel(),
            'condicao_pagamento' => $oc->condicao_pagamento,
            'previsao_entrega' => optional($oc->previsao_entrega)?->format('Y-m-d'),
            'valor_total' => (string) $oc->valor_total,
            'valor_frete' => PadraoDecimal::roundHalfUp((string) ($oc->valor_frete ?? '0'), PadraoDecimal::SCALE_MONEY),
            'mod_frete' => $oc->mod_frete,
            'mod_frete_label' => OrdemCompra::modFreteLabel($oc->mod_frete),
            'valor_ipi' => PadraoDecimal::roundHalfUp((string) ($oc->valor_ipi ?? '0'), PadraoDecimal::SCALE_MONEY),
            'valor_icms' => PadraoDecimal::roundHalfUp((string) ($oc->valor_icms ?? '0'), PadraoDecimal::SCALE_MONEY),
            'valor_previsto' => PadraoDecimal::roundHalfUp(
                bcadd((string) $oc->valor_total, (string) ($oc->valor_ipi ?? '0'), PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            ),
            'observacao' => $oc->observacao,
            'enviado_em' => optional($oc->enviado_em)?->toIso8601String(),
            'itens' => $oc->itens->map(fn (OrdemCompraItem $item) => [
                'id' => $item->id,
                'produto_id' => $item->produto_id,
                'produto' => $item->produto ? [
                    'id' => $item->produto->id,
                    'codigo' => $item->produto->codigo,
                    'descricao_fiscal' => $item->produto->descricao_fiscal,
                    'descricao_comercial' => $item->produto->descricao_comercial,
                    'familia' => $item->produto->familia,
                    'ncm' => $item->produto->ncm,
                    'cest' => $item->produto->cest ?? null,
                    'origem' => $item->produto->origem,
                    'unidade_comercial' => $item->produto->unidade_comercial,
                    'unidade_interna' => $item->produto->unidade_interna,
                    'fator_conversao' => (string) ($item->produto->fator_conversao ?? '1'),
                    'controla_lote' => (bool) $item->produto->controla_lote,
                    'controla_validade' => (bool) $item->produto->controla_validade,
                    'prazo_validade_dias' => $item->produto->prazo_validade_dias,
                ] : null,
                'qtde_pedida' => (string) $item->qtde_pedida,
                'qtde_recebida' => (string) $item->qtde_recebida,
                'unidade' => $item->unidade,
                'valor_unitario' => (string) $item->valor_unitario,
                'valor_total' => (string) $item->valor_total,
                'aliq_ipi' => $item->aliq_ipi !== null
                    ? PadraoDecimal::roundHalfUp((string) $item->aliq_ipi, PadraoDecimal::SCALE_PERCENT)
                    : null,
                'aliq_icms' => $item->aliq_icms !== null
                    ? PadraoDecimal::roundHalfUp((string) $item->aliq_icms, PadraoDecimal::SCALE_PERCENT)
                    : null,
                'valor_ipi' => PadraoDecimal::roundHalfUp((string) ($item->valor_ipi ?? '0'), PadraoDecimal::SCALE_MONEY),
                'valor_icms' => PadraoDecimal::roundHalfUp((string) ($item->valor_icms ?? '0'), PadraoDecimal::SCALE_MONEY),
                'ordem' => (int) $item->ordem,
                'composicao' => $item->relationLoaded('composicoes')
                    ? $item->composicoes->map(fn (OrdemCompraItemComposicao $c) => [
                        'id' => $c->id,
                        'ordem' => (int) $c->ordem,
                        'largura_mm' => PadraoDecimal::roundHalfUp((string) $c->largura_mm, PadraoDecimal::SCALE_DIM),
                        'quantidade' => PadraoDecimal::roundHalfUp((string) $c->quantidade, PadraoDecimal::SCALE_QTY),
                        'comprimento_m' => PadraoDecimal::roundHalfUp((string) $c->comprimento_m, PadraoDecimal::SCALE_DIM),
                        'area_m2' => PadraoDecimal::roundHalfUp((string) $c->area_m2, PadraoDecimal::SCALE_QTY),
                    ])->values()->all()
                    : [],
            ])->values()->all(),
            'created_at' => optional($oc->created_at)?->toIso8601String(),
            'updated_at' => optional($oc->updated_at)?->toIso8601String(),
            'criado_por' => OrdemCompra::userStampFrom($oc->criador),
            'atualizado_por' => OrdemCompra::userStampFrom($oc->atualizador),
            'nfe_entradas' => $oc->relationLoaded('movimentos')
                ? $oc->movimentos
                    ->map(fn ($m) => NfeEntradaService::toOut($m->nfeEntrada, true))
                    ->filter()
                    ->values()
                    ->all()
                : [],
        ];
    }

    private function assertEditavel(OrdemCompra $oc): void
    {
        if (! $oc->isEditavel()) {
            throw ValidationException::withMessages([
                'status' => [
                    'Ordem de compra não editável após o envio ao fornecedor. '
                    .'Cancele (se ainda sem recebimento) ou gere uma nova OC.',
                ],
            ]);
        }
    }

    /**
     * @param  array{
     *   produto_id: int,
     *   qtde_pedida: string,
     *   qtde_recebida: string,
     *   unidade: string,
     *   valor_unitario: string,
     *   valor_total: string,
     *   aliq_ipi: ?string,
     *   aliq_icms: ?string,
     *   valor_ipi: string,
     *   valor_icms: string,
     *   ordem: int,
     *   _composicao: list<array{ordem: int, largura_mm: string, quantidade: string, comprimento_m: string, area_m2: string}>
     * }  $item
     */
    private function persistItem(int $ordemCompraId, array $item): OrdemCompraItem
    {
        $composicao = $item['_composicao'] ?? [];
        unset($item['_composicao']);

        $created = OrdemCompraItem::query()->create([
            'ordem_compra_id' => $ordemCompraId,
            ...$item,
        ]);

        foreach ($composicao as $faixa) {
            OrdemCompraItemComposicao::query()->create([
                'ordem_compra_item_id' => $created->id,
                ...$faixa,
            ]);
        }

        return $created;
    }

    /**
     * @param  list<array<string, mixed>>  $itens
     * @return list<array<string, mixed>>
     */
    private function normalizeItens(Empresa $empresa, Parceiro $fornecedor, array $itens): array
    {
        if ($itens === []) {
            throw ValidationException::withMessages([
                'itens' => ['Informe ao menos um item.'],
            ]);
        }

        $produtoIds = [];
        foreach ($itens as $raw) {
            $pid = (int) ($raw['produto_id'] ?? 0);
            if ($pid > 0) {
                $produtoIds[] = $pid;
            }
        }
        $estimativa = $this->impostoEstimativa->estimar($empresa, $fornecedor, $produtoIds);
        $sugestaoPorProduto = [];
        foreach ($estimativa['itens'] as $sug) {
            $sugestaoPorProduto[(int) $sug['produto_id']] = $sug;
        }

        $out = [];
        $ordem = 1;
        foreach ($itens as $idx => $raw) {
            $produto = $this->assertProdutoEstocavel($empresa, (int) $raw['produto_id'], "itens.{$idx}.produto_id");
            $composicao = $this->normalizeComposicao($raw['composicao'] ?? null, $idx);

            if ($composicao !== []) {
                $areaM2 = '0';
                foreach ($composicao as $faixa) {
                    $areaM2 = bcadd($areaM2, $faixa['area_m2'], PadraoDecimal::SCALE_QTY + 2);
                }
                $areaM2 = PadraoDecimal::roundHalfUp($areaM2, PadraoDecimal::SCALE_QTY);
                $qtde = BobinaAreaComercial::fromAreaM2(
                    $produto,
                    $areaM2,
                    "itens.{$idx}.composicao"
                );
            } else {
                $qtde = PadraoDecimal::parseStrict($raw['qtde_pedida'] ?? null, PadraoDecimal::SCALE_QTY);
            }

            $valorUnit = PadraoDecimal::parseStrict($raw['valor_unitario'], PadraoDecimal::SCALE_UNIT_PRICE);

            if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    "itens.{$idx}.qtde_pedida" => $composicao !== []
                        ? ['Composição deve totalizar quantidade maior que zero.']
                        : ['Quantidade pedida deve ser maior que zero.'],
                ]);
            }

            if ($valorUnit === null || bccomp($valorUnit, '0', PadraoDecimal::SCALE_UNIT_PRICE) < 0) {
                throw ValidationException::withMessages([
                    "itens.{$idx}.valor_unitario" => ['Valor unitário inválido.'],
                ]);
            }

            $valorTotal = PadraoDecimal::roundHalfUp(
                bcmul($qtde, $valorUnit, PadraoDecimal::SCALE_UNIT_PRICE + 4),
                PadraoDecimal::SCALE_MONEY
            );

            $sug = $sugestaoPorProduto[$produto->id] ?? null;
            $aliqIpi = $this->parseAliquota($raw['aliq_ipi'] ?? null, "itens.{$idx}.aliq_ipi");
            $aliqIcms = $this->parseAliquota($raw['aliq_icms'] ?? null, "itens.{$idx}.aliq_icms");
            // Sem alíquota informada → preenche automático (histórico NF / tabela UF).
            if ($aliqIpi === null && is_array($sug)) {
                $aliqIpi = $this->parseAliquota($sug['aliq_ipi'] ?? null, "itens.{$idx}.aliq_ipi");
            }
            if ($aliqIcms === null && is_array($sug)) {
                $aliqIcms = $this->parseAliquota($sug['aliq_icms'] ?? null, "itens.{$idx}.aliq_icms");
            }
            $valorIpi = $this->impostoSobreBase($valorTotal, $aliqIpi);
            $valorIcms = $this->impostoSobreBase($valorTotal, $aliqIcms);

            $out[] = [
                'produto_id' => $produto->id,
                'qtde_pedida' => $qtde,
                'qtde_recebida' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY),
                'unidade' => $raw['unidade'] ?? $produto->unidade_comercial ?? 'UN',
                'valor_unitario' => $valorUnit,
                'valor_total' => $valorTotal,
                'aliq_ipi' => $aliqIpi,
                'aliq_icms' => $aliqIcms,
                'valor_ipi' => $valorIpi,
                'valor_icms' => $valorIcms,
                'ordem' => (int) ($raw['ordem'] ?? $ordem),
                '_composicao' => $composicao,
            ];
            $ordem++;
        }

        return $out;
    }

    /**
     * @param  mixed  $rawFaixas
     * @return list<array{ordem: int, largura_mm: string, quantidade: string, comprimento_m: string, area_m2: string}>
     */
    private function normalizeComposicao(mixed $rawFaixas, int $itemIdx): array
    {
        if ($rawFaixas === null || $rawFaixas === []) {
            return [];
        }
        if (! is_array($rawFaixas)) {
            throw ValidationException::withMessages([
                "itens.{$itemIdx}.composicao" => ['Composição inválida.'],
            ]);
        }

        $out = [];
        $ordemFaixa = 1;
        foreach ($rawFaixas as $fIdx => $raw) {
            if (! is_array($raw)) {
                throw ValidationException::withMessages([
                    "itens.{$itemIdx}.composicao.{$fIdx}" => ['Faixa inválida.'],
                ]);
            }

            $largura = PadraoDecimal::parseStrict($raw['largura_mm'] ?? null, PadraoDecimal::SCALE_DIM);
            $quantidade = PadraoDecimal::parseStrict($raw['quantidade'] ?? null, PadraoDecimal::SCALE_QTY);
            $comprimento = PadraoDecimal::parseStrict($raw['comprimento_m'] ?? null, PadraoDecimal::SCALE_DIM);

            if ($largura === null || bccomp($largura, '0', PadraoDecimal::SCALE_DIM) <= 0) {
                throw ValidationException::withMessages([
                    "itens.{$itemIdx}.composicao.{$fIdx}.largura_mm" => ['Largura deve ser maior que zero.'],
                ]);
            }
            if ($quantidade === null || bccomp($quantidade, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    "itens.{$itemIdx}.composicao.{$fIdx}.quantidade" => ['Quantidade de volumes deve ser maior que zero.'],
                ]);
            }
            if ($comprimento === null || bccomp($comprimento, '0', PadraoDecimal::SCALE_DIM) <= 0) {
                throw ValidationException::withMessages([
                    "itens.{$itemIdx}.composicao.{$fIdx}.comprimento_m" => ['Comprimento deve ser maior que zero.'],
                ]);
            }

            $largura = PadraoDecimal::roundHalfUp($largura, PadraoDecimal::SCALE_DIM);
            $quantidade = PadraoDecimal::roundHalfUp($quantidade, PadraoDecimal::SCALE_QTY);
            $comprimento = PadraoDecimal::roundHalfUp($comprimento, PadraoDecimal::SCALE_DIM);
            $areaUnit = NfeExactDimensoes::areaM2($largura, $comprimento);
            $area = PadraoDecimal::roundHalfUp(
                bcmul($quantidade, $areaUnit, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );

            $out[] = [
                'ordem' => (int) ($raw['ordem'] ?? $ordemFaixa),
                'largura_mm' => $largura,
                'quantidade' => $quantidade,
                'comprimento_m' => $comprimento,
                'area_m2' => $area,
            ];
            $ordemFaixa++;
        }

        return $out;
    }

    private function resolveModFrete(mixed $raw): string
    {
        if ($raw === null || $raw === '') {
            // Omitido (API legado / scripts): CIF — sem exigir transportador.
            return OrdemCompra::MOD_FRETE_CIF;
        }
        $mod = (string) $raw;
        if (! in_array($mod, OrdemCompra::MOD_FRETES, true)) {
            throw ValidationException::withMessages([
                'mod_frete' => ['Modalidade de frete inválida. Use CIF (0) ou FOB (1).'],
            ]);
        }

        return $mod;
    }

    private function resolveTransportador(Empresa $empresa, ?int $transportadorId, string $modFrete): ?Parceiro
    {
        if ($modFrete === OrdemCompra::MOD_FRETE_FOB && ($transportadorId === null || $transportadorId < 1)) {
            throw ValidationException::withMessages([
                'transportador_id' => ['Selecione o transportador cadastrado (FOB).'],
            ]);
        }

        if ($transportadorId === null || $transportadorId < 1) {
            return null;
        }

        $parceiro = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $transportadorId)
            ->first();

        if (! $parceiro) {
            throw ValidationException::withMessages([
                'transportador_id' => ['Transportador inválido para a empresa.'],
            ]);
        }

        if (! $parceiro->papel_transportadora) {
            throw ValidationException::withMessages([
                'transportador_id' => ['Parceiro deve ter classificação de transportadora.'],
            ]);
        }

        return $parceiro;
    }

    /**
     * @return array<string, mixed>
     */
    private function parceiroResumo(Parceiro $parceiro): array
    {
        return [
            'id' => $parceiro->id,
            'codigo' => $parceiro->codigo,
            'razao_social' => $parceiro->razao_social,
            'nome_fantasia' => $parceiro->nome_fantasia,
            'cnpj_cpf' => $parceiro->cnpj_cpf,
            'email' => $parceiro->email,
            'telefone' => $parceiro->telefone,
            'logradouro' => $parceiro->logradouro,
            'numero' => $parceiro->numero,
            'complemento' => $parceiro->complemento,
            'bairro' => $parceiro->bairro,
            'municipio' => $parceiro->municipio,
            'uf' => $parceiro->uf,
            'cep' => $parceiro->cep,
            'ie' => $parceiro->ie,
        ];
    }

    private function parseAliquota(mixed $raw, string $field): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        $v = PadraoDecimal::parseStrict($raw, PadraoDecimal::SCALE_PERCENT);
        if ($v === null || bccomp($v, '0', PadraoDecimal::SCALE_PERCENT) < 0) {
            throw ValidationException::withMessages([
                $field => ['Alíquota inválida.'],
            ]);
        }
        if (bccomp($v, '100', PadraoDecimal::SCALE_PERCENT) > 0) {
            throw ValidationException::withMessages([
                $field => ['Alíquota não pode ser maior que 100%.'],
            ]);
        }

        return PadraoDecimal::roundHalfUp($v, PadraoDecimal::SCALE_PERCENT);
    }

    private function impostoSobreBase(string $base, ?string $aliq): string
    {
        if ($aliq === null || bccomp($aliq, '0', PadraoDecimal::SCALE_PERCENT) <= 0) {
            return PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY);
        }

        return PadraoDecimal::roundHalfUp(
            bcmul($base, bcdiv($aliq, '100', PadraoDecimal::SCALE_PERCENT + 4), PadraoDecimal::SCALE_MONEY + 4),
            PadraoDecimal::SCALE_MONEY
        );
    }

    private function assertFornecedor(Empresa $empresa, int $fornecedorId): Parceiro
    {
        $parceiro = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $fornecedorId)
            ->first();

        if (! $parceiro) {
            throw ValidationException::withMessages([
                'fornecedor_id' => ['Fornecedor inválido para a empresa.'],
            ]);
        }

        if (! $parceiro->papel_fornecedor) {
            throw ValidationException::withMessages([
                'fornecedor_id' => ['Parceiro deve ter classificação de fornecedor.'],
            ]);
        }

        return $parceiro;
    }

    private function assertProdutoEstocavel(Empresa $empresa, int $produtoId, string $field): Produto
    {
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $produtoId)
            ->first();

        if (! $produto) {
            throw ValidationException::withMessages([
                $field => ['Produto inválido para a empresa.'],
            ]);
        }

        if ($produto->familia === 'SVC') {
            throw ValidationException::withMessages([
                $field => ['Serviço não pode ser comprado para estoque.'],
            ]);
        }

        return $produto;
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
}
