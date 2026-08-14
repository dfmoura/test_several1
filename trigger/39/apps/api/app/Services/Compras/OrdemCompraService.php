<?php

namespace App\Services\Compras;

use App\Models\CompraNecessidade;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Models\OrdemCompraItem;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Fiscal\NfeEntradaService;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrdemCompraService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $status = null, ?int $fornecedorId = null): array
    {
        $query = OrdemCompra::query()
            ->with([
                'fornecedor:id,codigo,razao_social,nome_fantasia',
                'itens.produto:id,codigo,descricao_fiscal,familia',
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
                            ->orWhere('razao_social', 'like', $like);
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

        $itensPayload = $this->normalizeItens($empresa, $data['itens'] ?? []);

        $oc = DB::transaction(function () use ($empresa, $data, $fornecedor, $necessidade, $itensPayload) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'OC-'.$ano, 5);

            $valorTotal = '0';
            foreach ($itensPayload as $item) {
                $valorTotal = bcadd($valorTotal, $item['valor_total'], PadraoDecimal::SCALE_MONEY);
            }
            $valorTotal = PadraoDecimal::roundHalfUp($valorTotal, PadraoDecimal::SCALE_MONEY);

            $oc = OrdemCompra::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'fornecedor_id' => $fornecedor->id,
                'cotacao_id' => $data['cotacao_id'] ?? null,
                'necessidade_id' => $necessidade?->id,
                'origem' => $data['origem'] ?? OrdemCompra::ORIGEM_DIRETA,
                'urgente' => (bool) ($data['urgente'] ?? false),
                'status' => OrdemCompra::STATUS_ABERTA,
                'condicao_pagamento' => $this->nullIfEmpty($data['condicao_pagamento'] ?? null),
                'previsao_entrega' => $data['previsao_entrega'] ?? null,
                'valor_total' => $valorTotal,
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
            ]);

            foreach ($itensPayload as $item) {
                OrdemCompraItem::query()->create([
                    'ordem_compra_id' => $oc->id,
                    ...$item,
                ]);
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
     * @return array<string, mixed>
     */
    public function show(OrdemCompra $oc): array
    {
        $oc->load([
            'fornecedor:id,codigo,razao_social,nome_fantasia',
            'itens.produto:id,codigo,descricao_fiscal,familia,unidade_comercial,unidade_interna,fator_conversao,controla_lote,controla_validade,prazo_validade_dias',
            'necessidade:id,codigo,status',
            'cotacao:id,codigo,status',
            'movimentos.nfeEntrada.itens',
            ...OrdemCompra::userStampWith(),
        ]);

        return $this->toOut($oc);
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
            'fornecedor:id,codigo,razao_social,nome_fantasia',
            'itens.produto:id,codigo,descricao_fiscal,familia,unidade_comercial,unidade_interna,fator_conversao,controla_lote,controla_validade,prazo_validade_dias',
            ...OrdemCompra::userStampWith(),
        ]);

        return [
            'id' => $oc->id,
            'empresa_id' => $oc->empresa_id,
            'codigo' => $oc->codigo,
            'fornecedor_id' => $oc->fornecedor_id,
            'fornecedor' => $oc->fornecedor ? [
                'id' => $oc->fornecedor->id,
                'codigo' => $oc->fornecedor->codigo,
                'razao_social' => $oc->fornecedor->razao_social,
                'nome_fantasia' => $oc->fornecedor->nome_fantasia,
            ] : null,
            'cotacao_id' => $oc->cotacao_id,
            'necessidade_id' => $oc->necessidade_id,
            'origem' => $oc->origem,
            'urgente' => (bool) $oc->urgente,
            'status' => $oc->status,
            'condicao_pagamento' => $oc->condicao_pagamento,
            'previsao_entrega' => optional($oc->previsao_entrega)?->format('Y-m-d'),
            'valor_total' => (string) $oc->valor_total,
            'observacao' => $oc->observacao,
            'itens' => $oc->itens->map(fn (OrdemCompraItem $item) => [
                'id' => $item->id,
                'produto_id' => $item->produto_id,
                'produto' => $item->produto ? [
                    'id' => $item->produto->id,
                    'codigo' => $item->produto->codigo,
                    'descricao_fiscal' => $item->produto->descricao_fiscal,
                    'familia' => $item->produto->familia,
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
                'ordem' => (int) $item->ordem,
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

    /**
     * @param  list<array<string, mixed>>  $itens
     * @return list<array<string, mixed>>
     */
    private function normalizeItens(Empresa $empresa, array $itens): array
    {
        if ($itens === []) {
            throw ValidationException::withMessages([
                'itens' => ['Informe ao menos um item.'],
            ]);
        }

        $out = [];
        $ordem = 1;
        foreach ($itens as $idx => $raw) {
            $produto = $this->assertProdutoEstocavel($empresa, (int) $raw['produto_id'], "itens.{$idx}.produto_id");
            $qtde = PadraoDecimal::parseStrict($raw['qtde_pedida'], PadraoDecimal::SCALE_QTY);
            $valorUnit = PadraoDecimal::parseStrict($raw['valor_unitario'], PadraoDecimal::SCALE_UNIT_PRICE);

            if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    "itens.{$idx}.qtde_pedida" => ['Quantidade pedida deve ser maior que zero.'],
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

            $out[] = [
                'produto_id' => $produto->id,
                'qtde_pedida' => $qtde,
                'qtde_recebida' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY),
                'unidade' => $raw['unidade'] ?? $produto->unidade_comercial ?? 'UN',
                'valor_unitario' => $valorUnit,
                'valor_total' => $valorTotal,
                'ordem' => (int) ($raw['ordem'] ?? $ordem),
            ];
            $ordem++;
        }

        return $out;
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
                'fornecedor_id' => ['Parceiro deve ter papel de fornecedor.'],
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

        // Preferido MP|EMB|REV; permite qualquer produto estocável (não SVC).
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
