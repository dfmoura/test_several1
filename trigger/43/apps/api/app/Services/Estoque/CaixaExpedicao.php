<?php

namespace App\Services\Estoque;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use Illuminate\Validation\ValidationException;

/**
 * Caixa EMB-CX que sai com a linha, antes do faturamento.
 * Etiqueta: a escolha continua em pa_embalagens (ordem concluída).
 * Revenda: a escolha fica no snapshot da separação — sem OP e sem MOV.
 * A baixa das duas é o mesmo SAIDA_VENDA da NF-e oficial.
 */
final class CaixaExpedicao
{
    public function opcional(Empresa $empresa, mixed $id): ?Produto
    {
        if ($id === null || $id === '' || (int) $id < 1) {
            return null;
        }

        return $this->exigir($empresa, (int) $id);
    }

    public function exigir(Empresa $empresa, mixed $id): Produto
    {
        $produto = $this->localizar($empresa, (int) $id);
        if (! $produto instanceof Produto) {
            throw ValidationException::withMessages([
                'caixa_produto_id' => ['Escolha uma caixa ativa desta empresa.'],
            ]);
        }

        return $produto;
    }

    public function localizar(Empresa $empresa, int $id): ?Produto
    {
        if ($id < 1) {
            return null;
        }

        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($id)
            ->where('situacao', 'ATIVO')
            ->with('grupoCatalogo:id,codigo')
            ->first();
        if (! $produto instanceof Produto || ! $this->eh($produto)) {
            return null;
        }

        return $produto;
    }

    public function eh(Produto $produto): bool
    {
        if ($produto->familia !== 'EMB') {
            return false;
        }
        $grupo = (string) ($produto->grupoCatalogo?->codigo ?? '');
        if ($grupo === 'EMB-CX') {
            return true;
        }
        $hay = mb_strtoupper(
            $produto->codigo.' '.$produto->descricao_fiscal.' '.$produto->descricao_comercial,
            'UTF-8',
        );

        return str_starts_with((string) $produto->codigo, 'EMB-CX') || str_contains($hay, 'CAIXA');
    }

    /**
     * @return array<string, mixed>|null
     */
    public function registro(Pedido $pedido, PedidoItem $item): ?array
    {
        $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
        $porItem = is_array($snap['separacoes_revenda'] ?? null) ? $snap['separacoes_revenda'] : [];
        $registro = $porItem[(string) $item->id] ?? null;
        if (! is_array($registro) && is_array($snap['separacao_revenda'] ?? null)) {
            $ultima = $snap['separacao_revenda'];
            if ((int) ($ultima['pedido_item_id'] ?? 0) === (int) $item->id) {
                $registro = $ultima;
            }
        }

        return is_array($registro) ? $registro : null;
    }

    /**
     * Caixas de revenda prontas para volume e para o SAIDA_VENDA.
     * SKU inativo ou que deixou de ser caixa não entra — o faturamento já bloqueia.
     *
     * @return list<array{pedido_item_id: int, produto_id: int, qtde: int}>
     */
    public function linhas(Empresa $empresa, Pedido $pedido): array
    {
        $pedido->loadMissing('itens');
        $out = [];
        foreach ($pedido->itens as $item) {
            if (! $item instanceof PedidoItem || ! $this->linhaExigeCaixa($item)) {
                continue;
            }
            $registro = $this->registro($pedido, $item);
            $qtde = (int) ($registro['qtde_caixas'] ?? 0);
            $produtoId = (int) ($registro['caixa_produto_id'] ?? 0);
            if ($registro === null || $qtde < 1 || $produtoId < 1) {
                continue;
            }
            if (! $this->localizar($empresa, $produtoId) instanceof Produto) {
                continue;
            }
            $out[] = [
                'pedido_item_id' => (int) $item->id,
                'produto_id' => $produtoId,
                'qtde' => $qtde,
            ];
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    public function bloqueios(Empresa $empresa, Pedido $pedido): array
    {
        $pedido->loadMissing('itens');
        $msgs = [];
        foreach ($pedido->itens as $item) {
            if (! $item instanceof PedidoItem || ! $this->linhaExigeCaixa($item)) {
                continue;
            }
            $nome = trim((string) $item->descricao) !== '' ? $item->descricao : 'revenda';
            $registro = $this->registro($pedido, $item);
            $qtde = (int) ($registro['qtde_caixas'] ?? 0);
            $produtoId = (int) ($registro['caixa_produto_id'] ?? 0);
            if ($registro === null || $qtde < 1 || $produtoId < 1) {
                $msgs[] = 'Produto de revenda '.$nome.': escolha a caixa e a quantidade em A separar antes de faturar.';

                continue;
            }
            if (! $this->localizar($empresa, $produtoId) instanceof Produto) {
                $msgs[] = 'Produto de revenda '.$nome.': a caixa escolhida não está ativa nesta empresa.';
            }
        }

        return $msgs;
    }

    /**
     * @return list<string>
     */
    public function avisos(Empresa $empresa, Pedido $pedido): array
    {
        $pedido->loadMissing('itens');
        $msgs = [];
        foreach ($this->linhas($empresa, $pedido) as $linha) {
            $item = $pedido->itens->first(
                fn ($row) => $row instanceof PedidoItem && (int) $row->id === $linha['pedido_item_id']
            );
            $produto = $this->localizar($empresa, $linha['produto_id']);
            if (! $item instanceof PedidoItem || ! $produto instanceof Produto) {
                continue;
            }
            $n = $linha['qtde'];
            $msgs[] = 'Revenda '.$item->descricao.': '.$produto->codigo
                .' · '.$n.' caixa'.($n === 1 ? '' : 's')
                .'. A caixa sai na NF-e oficial, pelo custo médio.';
        }

        return $msgs;
    }

    public function notaOficial(Empresa $empresa, int $pedidoId): bool
    {
        $fat = Faturamento::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedidoId)
            ->where('status', Faturamento::STATUS_CONFIRMADO)
            ->first();
        if (! $fat) {
            return false;
        }

        return DocumentoFiscalSaida::query()
            ->where('faturamento_id', $fat->id)
            ->where('status', DocumentoFiscalSaida::STATUS_AUTORIZADO)
            ->exists();
    }

    private function linhaExigeCaixa(PedidoItem $item): bool
    {
        return $item->necessidade === PedidoItem::NEC_REVENDA
            && $item->status !== PedidoItem::STATUS_CANCELADO;
    }
}
