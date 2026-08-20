<?php

namespace App\Services\Compras;

use App\Models\CompraNecessidade;
use App\Models\Cotacao;
use App\Models\CotacaoItem;
use App\Models\CotacaoProposta;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CotacaoService
{
    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly OrdemCompraService $ordens,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $status = null): array
    {
        $query = Cotacao::query()
            ->with([
                'itens.produto:id,codigo,descricao_fiscal,familia',
                'propostas.fornecedor:id,codigo,razao_social,nome_fantasia',
                ...Cotacao::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('observacao', 'like', $like);
            });
        }

        return $query->get()->map(fn (Cotacao $c) => $this->toOut($c))->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
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

        $itens = $data['itens'] ?? [];
        if ($itens === []) {
            throw ValidationException::withMessages([
                'itens' => ['Informe ao menos um item.'],
            ]);
        }

        $cotacao = DB::transaction(function () use ($empresa, $data, $necessidade, $itens) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'COT-'.$ano, 5);

            $cotacao = Cotacao::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'status' => Cotacao::STATUS_ABERTA,
                'necessidade_id' => $necessidade?->id,
                'prazo_resposta' => $data['prazo_resposta'] ?? null,
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
            ]);

            $ordem = 1;
            foreach ($itens as $idx => $raw) {
                $produto = $this->assertProduto($empresa, (int) $raw['produto_id'], "itens.{$idx}.produto_id");
                $qtde = PadraoDecimal::parseStrict($raw['qtde'], PadraoDecimal::SCALE_QTY);
                if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                    throw ValidationException::withMessages([
                        "itens.{$idx}.qtde" => ['Quantidade deve ser maior que zero.'],
                    ]);
                }

                CotacaoItem::query()->create([
                    'cotacao_id' => $cotacao->id,
                    'produto_id' => $produto->id,
                    'qtde' => $qtde,
                    'unidade' => $raw['unidade'] ?? $produto->unidade_comercial ?? 'UN',
                    'ordem' => (int) ($raw['ordem'] ?? $ordem),
                ]);
                $ordem++;
            }

            return $cotacao;
        });

        return $this->show($cotacao);
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Cotacao $cotacao): array
    {
        $cotacao->load([
            'itens.produto:id,codigo,descricao_fiscal,familia,unidade_comercial',
            'propostas.fornecedor:id,codigo,razao_social,nome_fantasia',
            'necessidade:id,codigo,status',
            ...Cotacao::userStampWith(),
        ]);

        return $this->toOut($cotacao);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function addProposta(Empresa $empresa, Cotacao $cotacao, array $data): array
    {
        if (! in_array($cotacao->status, [Cotacao::STATUS_RASCUNHO, Cotacao::STATUS_ABERTA], true)) {
            throw ValidationException::withMessages([
                'status' => ['Cotação não aceita novas propostas.'],
            ]);
        }

        $item = CotacaoItem::query()
            ->where('cotacao_id', $cotacao->id)
            ->where('id', (int) $data['cotacao_item_id'])
            ->first();

        if (! $item) {
            throw ValidationException::withMessages([
                'cotacao_item_id' => ['Item não pertence a esta cotação.'],
            ]);
        }

        $fornecedor = $this->assertFornecedor($empresa, (int) $data['fornecedor_id']);
        $valorUnit = PadraoDecimal::parseStrict($data['valor_unitario'], PadraoDecimal::SCALE_UNIT_PRICE);
        if ($valorUnit === null || bccomp($valorUnit, '0', PadraoDecimal::SCALE_UNIT_PRICE) < 0) {
            throw ValidationException::withMessages([
                'valor_unitario' => ['Valor unitário inválido.'],
            ]);
        }

        $frete = null;
        if (array_key_exists('frete', $data) && $data['frete'] !== null && $data['frete'] !== '') {
            $frete = PadraoDecimal::parseStrict($data['frete'], PadraoDecimal::SCALE_MONEY);
        }

        CotacaoProposta::query()->create([
            'cotacao_id' => $cotacao->id,
            'cotacao_item_id' => $item->id,
            'fornecedor_id' => $fornecedor->id,
            'valor_unitario' => $valorUnit,
            'frete' => $frete,
            'prazo_dias' => $data['prazo_dias'] ?? null,
            'validade' => $data['validade'] ?? null,
            'condicao_pagamento' => $this->nullIfEmpty($data['condicao_pagamento'] ?? null),
            'vencedora' => false,
            'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
        ]);

        if ($cotacao->status === Cotacao::STATUS_RASCUNHO) {
            $cotacao->status = Cotacao::STATUS_ABERTA;
            $cotacao->save();
        }

        return $this->show($cotacao->fresh());
    }

    /**
     * Escolhe propostas vencedoras e gera OC.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function escolherVencedora(Empresa $empresa, Cotacao $cotacao, array $data): array
    {
        if ($cotacao->status === Cotacao::STATUS_DECIDIDA) {
            throw ValidationException::withMessages([
                'status' => ['Cotação já decidida.'],
            ]);
        }

        if ($cotacao->status === Cotacao::STATUS_CANCELADA) {
            throw ValidationException::withMessages([
                'status' => ['Cotação cancelada.'],
            ]);
        }

        $propostaIds = array_map('intval', $data['proposta_ids'] ?? []);
        $propostas = CotacaoProposta::query()
            ->with('item')
            ->where('cotacao_id', $cotacao->id)
            ->whereIn('id', $propostaIds)
            ->get();

        if ($propostas->count() !== count(array_unique($propostaIds))) {
            throw ValidationException::withMessages([
                'proposta_ids' => ['Uma ou mais propostas não pertencem a esta cotação.'],
            ]);
        }

        $itemIds = $propostas->pluck('cotacao_item_id')->all();
        if (count($itemIds) !== count(array_unique($itemIds))) {
            throw ValidationException::withMessages([
                'proposta_ids' => ['Selecione no máximo uma proposta vencedora por item.'],
            ]);
        }

        $fornecedorIds = $propostas->pluck('fornecedor_id')->unique()->values();
        if ($fornecedorIds->count() !== 1) {
            throw ValidationException::withMessages([
                'proposta_ids' => ['Todas as propostas vencedoras devem ser do mesmo fornecedor.'],
            ]);
        }

        $itensCotacao = CotacaoItem::query()->where('cotacao_id', $cotacao->id)->get();
        if ($itensCotacao->count() !== $propostas->count()) {
            throw ValidationException::withMessages([
                'proposta_ids' => ['Informe uma proposta vencedora para cada item da cotação.'],
            ]);
        }

        $primeira = $propostas->first();
        $itensOc = [];
        foreach ($propostas as $proposta) {
            $item = $proposta->item;
            $itensOc[] = [
                'produto_id' => $item->produto_id,
                'qtde_pedida' => (string) $item->qtde,
                'valor_unitario' => (string) $proposta->valor_unitario,
                'unidade' => $item->unidade,
                'ordem' => $item->ordem,
            ];
        }

        $result = DB::transaction(function () use ($empresa, $cotacao, $propostas, $primeira, $itensOc) {
            CotacaoProposta::query()
                ->where('cotacao_id', $cotacao->id)
                ->update(['vencedora' => false]);

            CotacaoProposta::query()
                ->whereIn('id', $propostas->pluck('id')->all())
                ->update(['vencedora' => true]);

            $cotacao->status = Cotacao::STATUS_DECIDIDA;
            $cotacao->save();

            $ocOut = $this->ordens->create($empresa, [
                'fornecedor_id' => $primeira->fornecedor_id,
                'cotacao_id' => $cotacao->id,
                'necessidade_id' => $cotacao->necessidade_id,
                'origem' => OrdemCompra::ORIGEM_COTACAO,
                'condicao_pagamento' => $primeira->condicao_pagamento,
                'itens' => $itensOc,
            ]);

            return [
                'cotacao' => $this->show($cotacao->fresh()),
                'ordem_compra' => $ocOut,
            ];
        });

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(Cotacao $c): array
    {
        $c->loadMissing([
            'itens.produto:id,codigo,descricao_fiscal,familia,unidade_comercial',
            'propostas.fornecedor:id,codigo,razao_social,nome_fantasia',
            ...Cotacao::userStampWith(),
        ]);

        return [
            'id' => $c->id,
            'empresa_id' => $c->empresa_id,
            'codigo' => $c->codigo,
            'status' => $c->status,
            'necessidade_id' => $c->necessidade_id,
            'prazo_resposta' => optional($c->prazo_resposta)?->format('Y-m-d'),
            'observacao' => $c->observacao,
            'itens' => $c->itens->map(fn (CotacaoItem $item) => [
                'id' => $item->id,
                'produto_id' => $item->produto_id,
                'produto' => $item->produto ? [
                    'id' => $item->produto->id,
                    'codigo' => $item->produto->codigo,
                    'descricao_fiscal' => $item->produto->descricao_fiscal,
                    'familia' => $item->produto->familia,
                    'unidade_comercial' => $item->produto->unidade_comercial,
                ] : null,
                'qtde' => (string) $item->qtde,
                'unidade' => $item->unidade,
                'ordem' => (int) $item->ordem,
            ])->values()->all(),
            'propostas' => $c->propostas->map(fn (CotacaoProposta $p) => [
                'id' => $p->id,
                'cotacao_item_id' => $p->cotacao_item_id,
                'fornecedor_id' => $p->fornecedor_id,
                'fornecedor' => $p->fornecedor ? [
                    'id' => $p->fornecedor->id,
                    'codigo' => $p->fornecedor->codigo,
                    'razao_social' => $p->fornecedor->razao_social,
                    'nome_fantasia' => $p->fornecedor->nome_fantasia,
                ] : null,
                'valor_unitario' => (string) $p->valor_unitario,
                'frete' => $p->frete !== null ? (string) $p->frete : null,
                'prazo_dias' => $p->prazo_dias,
                'validade' => optional($p->validade)?->format('Y-m-d'),
                'condicao_pagamento' => $p->condicao_pagamento,
                'vencedora' => (bool) $p->vencedora,
                'observacao' => $p->observacao,
            ])->values()->all(),
            'created_at' => optional($c->created_at)?->toIso8601String(),
            'updated_at' => optional($c->updated_at)?->toIso8601String(),
            'criado_por' => Cotacao::userStampFrom($c->criador),
            'atualizado_por' => Cotacao::userStampFrom($c->atualizador),
        ];
    }

    private function assertProduto(Empresa $empresa, int $produtoId, string $field): Produto
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

        return $produto;
    }

    private function assertFornecedor(Empresa $empresa, int $fornecedorId): Parceiro
    {
        $parceiro = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $fornecedorId)
            ->first();

        if (! $parceiro || ! $parceiro->papel_fornecedor) {
            throw ValidationException::withMessages([
                'fornecedor_id' => ['Fornecedor inválido para a empresa.'],
            ]);
        }

        return $parceiro;
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
