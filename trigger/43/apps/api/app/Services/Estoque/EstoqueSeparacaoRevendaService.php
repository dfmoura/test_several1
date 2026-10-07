<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueLote;
use App\Models\EstoqueSaldo;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Services\Comercial\PedidoService;
use App\Services\Producao\ProducaoColetaService;
use App\Support\PadraoDecimal;
use Illuminate\Validation\ValidationException;

/**
 * Porta do almoxarifado para item REVENDA.
 * Mostra o que pegar (FEFO) e grava a lista marcada no pedido.
 * Não abre OP e não escreve saldo — a saída continua na NF-e (SAIDA_VENDA).
 */
class EstoqueSeparacaoRevendaService
{
    public function __construct(
        private readonly ProducaoColetaService $coleta,
        private readonly PedidoService $pedidos,
    ) {}

    /**
     * @return array{a_separar: list<array<string, mixed>>, resumo: array{a_separar: int}}
     */
    public function fila(Empresa $empresa): array
    {
        $itens = $this->queryPendentes($empresa)
            ->with([
                'pedido:id,codigo,status,parceiro_id,empresa_id',
                'pedido.parceiro:id,codigo,razao_social',
                'produtoPa:id,codigo,descricao_fiscal,unidade_interna,controla_lote,familia',
            ])
            ->orderBy('pedido_id')
            ->orderBy('ordem')
            ->get();

        $cards = [];
        foreach ($itens as $item) {
            $cards[] = $this->card($empresa, $item);
        }

        return [
            'a_separar' => $cards,
            'resumo' => ['a_separar' => count($cards)],
        ];
    }

    public function contar(Empresa $empresa): int
    {
        return $this->queryPendentes($empresa)->count();
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Empresa $empresa, PedidoItem $item): array
    {
        $item = $this->itemDaEmpresa($empresa, $item);
        $item->load([
            'pedido.parceiro:id,codigo,razao_social',
            'produtoPa:id,codigo,descricao_fiscal,unidade_interna,controla_lote,familia',
        ]);

        return $this->detalhe($empresa, $item);
    }

    /**
     * @param  list<array<string, mixed>>  $volumes
     * @return array<string, mixed>
     */
    public function confirmar(Empresa $empresa, PedidoItem $item, array $volumes): array
    {
        $item = $this->itemDaEmpresa($empresa, $item);
        $pedido = $item->pedido;
        if (! $pedido instanceof Pedido || $pedido->empresa_id !== $empresa->id) {
            abort(404);
        }

        $marcados = $this->normalizarVolumes($empresa, $item, $volumes);
        $this->exigirVolumeQuandoHaSaldo($empresa, $item, $marcados);
        $this->pedidos->separarRevenda($empresa, $pedido, $item, $marcados);

        return $this->show($empresa, $item->fresh());
    }

    private function queryPendentes(Empresa $empresa)
    {
        return PedidoItem::query()
            ->where('empresa_id', $empresa->id)
            ->where('necessidade', PedidoItem::NEC_REVENDA)
            ->where('status', PedidoItem::STATUS_PENDENTE)
            ->whereHas('pedido', function ($q) use ($empresa) {
                $q->where('empresa_id', $empresa->id)
                    ->whereIn('status', Pedido::STATUSES_ABRE_ORDEM);
            });
    }

    private function itemDaEmpresa(Empresa $empresa, PedidoItem $item): PedidoItem
    {
        if ($item->empresa_id !== $empresa->id) {
            abort(404);
        }
        $item->loadMissing('pedido');
        if (! $item->pedido || $item->pedido->empresa_id !== $empresa->id) {
            abort(404);
        }
        if ($item->necessidade !== PedidoItem::NEC_REVENDA) {
            throw ValidationException::withMessages([
                'pedido_item_id' => ['Esta porta é só para produto de revenda.'],
            ]);
        }

        return $item;
    }

    /**
     * @return array<string, mixed>
     */
    private function card(Empresa $empresa, PedidoItem $item): array
    {
        $produto = $item->produtoPa;
        $primeiro = null;
        if ($produto && $produto->controla_lote) {
            $prev = $this->coleta->preview(
                $empresa,
                $produto,
                PadraoDecimal::roundHalfUp((string) $item->qtde_pedida, PadraoDecimal::SCALE_QTY),
            );
            foreach ($prev['volumes'] as $vol) {
                $cod = $vol['endereco']['codigo'] ?? null;
                if (is_string($cod) && $cod !== '') {
                    $primeiro = $cod;
                    break;
                }
            }
        }

        return [
            'pedido_item_id' => $item->id,
            'pedido_id' => $item->pedido_id,
            'pedido_codigo' => $item->pedido?->codigo,
            'parceiro' => $item->pedido?->parceiro ? [
                'id' => $item->pedido->parceiro->id,
                'razao_social' => $item->pedido->parceiro->razao_social,
            ] : null,
            'produto' => $produto ? [
                'id' => $produto->id,
                'codigo' => $produto->codigo,
                'descricao' => $produto->descricao_fiscal,
            ] : null,
            'descricao' => $item->descricao,
            'qtde' => (string) $item->qtde_pedida,
            'unidade' => $item->unidade,
            'primeiro_local' => $primeiro,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detalhe(Empresa $empresa, PedidoItem $item): array
    {
        $produto = $item->produtoPa;
        $qtde = PadraoDecimal::roundHalfUp((string) $item->qtde_pedida, PadraoDecimal::SCALE_QTY);
        $retirada = $produto
            ? $this->coleta->preview($empresa, $produto, $qtde)
            : [
                'controla_lote' => false,
                'politica' => 'QTD',
                'qtde' => $qtde,
                'unidade' => $item->unidade,
                'suficiente' => false,
                'qtde_faltante' => $qtde,
                'volumes' => [],
                'candidatos' => [],
            ];

        $saldo = '0';
        if ($produto) {
            $row = EstoqueSaldo::query()
                ->where('empresa_id', $empresa->id)
                ->where('produto_id', $produto->id)
                ->first();
            if ($row) {
                $saldo = PadraoDecimal::roundHalfUp((string) $row->qtde, PadraoDecimal::SCALE_QTY);
            }
        }

        $pedido = $item->pedido;
        $pode = $item->status === PedidoItem::STATUS_PENDENTE
            && $pedido
            && in_array($pedido->status, Pedido::STATUSES_ABRE_ORDEM, true);

        return [
            'pedido_item_id' => $item->id,
            'pedido_id' => $item->pedido_id,
            'pedido_codigo' => $pedido?->codigo,
            'pedido_status' => $pedido?->status,
            'parceiro' => $pedido?->parceiro ? [
                'id' => $pedido->parceiro->id,
                'razao_social' => $pedido->parceiro->razao_social,
            ] : null,
            'descricao' => $item->descricao,
            'qtde_pedida' => $qtde,
            'unidade' => $item->unidade,
            'status' => $item->status,
            'pode_confirmar' => $pode,
            'produto' => $produto ? [
                'id' => $produto->id,
                'codigo' => $produto->codigo,
                'descricao' => $produto->descricao_fiscal,
                'unidade' => $produto->unidade_interna,
                'controla_lote' => (bool) $produto->controla_lote,
            ] : null,
            'saldo' => $saldo,
            'retirada' => $retirada,
            'separacao' => $this->separacaoGravada($pedido, $item),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function separacaoGravada(?Pedido $pedido, PedidoItem $item): ?array
    {
        $snap = is_array($pedido?->snapshot) ? $pedido->snapshot : [];
        $porItem = is_array($snap['separacoes_revenda'] ?? null) ? $snap['separacoes_revenda'] : [];
        $registro = $porItem[(string) $item->id] ?? null;
        if (! is_array($registro) && is_array($snap['separacao_revenda'] ?? null)) {
            $ultima = $snap['separacao_revenda'];
            if ((int) ($ultima['pedido_item_id'] ?? 0) === (int) $item->id) {
                $registro = $ultima;
            }
        }
        if (! is_array($registro)) {
            return null;
        }

        return [
            'qtde' => (string) ($registro['qtde'] ?? $item->qtde_pedida),
            'em' => $registro['em'] ?? null,
            'volumes' => is_array($registro['volumes'] ?? null) ? array_values($registro['volumes']) : [],
        ];
    }

    /**
     * Com volume na prateleira, a lista marcada é obrigatória.
     * Sem volume, a confirmação segue — o saldo continua saindo só na NF-e.
     *
     * @param  list<array<string, mixed>>  $marcados
     */
    private function exigirVolumeQuandoHaSaldo(Empresa $empresa, PedidoItem $item, array $marcados): void
    {
        if ($marcados !== []) {
            return;
        }
        $produto = $item->produtoPa;
        if (! $produto || ! $produto->controla_lote) {
            return;
        }
        $tem = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->where('qtde', '>', 0)
            ->exists();
        if ($tem) {
            throw ValidationException::withMessages([
                'volumes' => ['Marque o volume que vai sair da prateleira.'],
            ]);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $volumes
     * @return list<array<string, mixed>>
     */
    private function normalizarVolumes(Empresa $empresa, PedidoItem $item, array $volumes): array
    {
        if ($volumes === []) {
            return [];
        }

        $produto = $item->produtoPa()->first();
        if (! $produto || ! $produto->controla_lote) {
            throw ValidationException::withMessages([
                'volumes' => ['Este produto não controla volume — não informe lotes.'],
            ]);
        }

        $vistos = [];
        $out = [];
        foreach ($volumes as $idx => $row) {
            if (! is_array($row)) {
                throw ValidationException::withMessages([
                    "volumes.{$idx}" => ['Volume inválido.'],
                ]);
            }
            $loteId = (int) ($row['lote_id'] ?? 0);
            if ($loteId <= 0 || isset($vistos[$loteId])) {
                throw ValidationException::withMessages([
                    "volumes.{$idx}.lote_id" => ['Informe cada volume uma vez.'],
                ]);
            }
            $vistos[$loteId] = true;

            $qtde = PadraoDecimal::parseStrict((string) ($row['qtde'] ?? ''), PadraoDecimal::SCALE_QTY);
            if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    "volumes.{$idx}.qtde" => ['Informe a quantidade que sai deste volume.'],
                ]);
            }

            $lote = EstoqueLote::query()
                ->with('endereco:id,codigo')
                ->where('empresa_id', $empresa->id)
                ->where('produto_id', $produto->id)
                ->where('id', $loteId)
                ->first();
            if (! $lote) {
                throw ValidationException::withMessages([
                    "volumes.{$idx}.lote_id" => ['Volume não está neste produto, nesta empresa.'],
                ]);
            }
            if (bccomp($qtde, (string) $lote->qtde, PadraoDecimal::SCALE_QTY) > 0) {
                throw ValidationException::withMessages([
                    "volumes.{$idx}.qtde" => ['A quantidade passa o que há neste volume.'],
                ]);
            }

            $out[] = [
                'lote_id' => $lote->id,
                'codigo' => $lote->codigo,
                'qtde' => PadraoDecimal::roundHalfUp($qtde, PadraoDecimal::SCALE_QTY),
                'unidade' => $lote->unidade,
                'endereco' => $lote->endereco?->codigo,
            ];
        }

        return $out;
    }
}
