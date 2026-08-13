<?php

namespace App\Services\Producao;

use App\Models\Empresa;
use App\Models\OrdemServico;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * OS leve (estudo 32 ORDEM_SERVICO / UC-PRD-002/004).
 */
class OrdemServicoService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $status = null): array
    {
        $query = OrdemServico::query()
            ->where('empresa_id', $empresa->id)
            ->with(['pedido:id,codigo,status', 'pedidoItem:id,descricao,necessidade'])
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }
        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like)
                    ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', $like));
            });
        }

        return $query->limit(200)->get()->map(fn (OrdemServico $o) => $this->toOut($o))->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function show(OrdemServico $os): array
    {
        $os->load([
            'pedido.parceiro:id,codigo,razao_social',
            'pedidoItem',
        ]);

        return $this->toOut($os, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function abrir(Empresa $empresa, Pedido $pedido, PedidoItem $item): array
    {
        if ($pedido->empresa_id !== $empresa->id || $item->pedido_id !== $pedido->id) {
            abort(404);
        }

        if (! in_array($pedido->status, Pedido::STATUSES_ABRE_ORDEM, true)) {
            throw ValidationException::withMessages([
                'pedido' => ['Pedido deve estar LIBERADO ou EM_PRODUCAO.'],
            ]);
        }

        if ($item->necessidade !== PedidoItem::NEC_SERVICO) {
            throw ValidationException::withMessages([
                'pedido_item_id' => ['Item não é de SERVICO — use OP.'],
            ]);
        }

        $ativa = OrdemServico::query()
            ->where('pedido_item_id', $item->id)
            ->whereIn('status', OrdemServico::STATUSES_ABERTOS)
            ->exists();
        if ($ativa) {
            throw ValidationException::withMessages([
                'pedido_item_id' => ['Já existe OS aberta para este item.'],
            ]);
        }

        $os = DB::transaction(function () use ($empresa, $pedido, $item) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'OS-'.$ano, 5);

            $os = OrdemServico::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'pedido_id' => $pedido->id,
                'pedido_item_id' => $item->id,
                'status' => OrdemServico::STATUS_ABERTA,
                'qtde_planejada' => $item->qtde_pedida,
            ]);

            $item->status = PedidoItem::STATUS_EM_PRODUCAO;
            $item->save();

            if ($pedido->status === Pedido::STATUS_LIBERADO) {
                $pedido->status = Pedido::STATUS_EM_PRODUCAO;
                $pedido->save();
            }

            return $os;
        });

        return $this->show($os->fresh());
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function concluir(Empresa $empresa, OrdemServico $os, array $data): array
    {
        if ($os->empresa_id !== $empresa->id) {
            abort(404);
        }
        if (! in_array($os->status, OrdemServico::STATUSES_ABERTOS, true)) {
            throw ValidationException::withMessages([
                'status' => ['OS já encerrada.'],
            ]);
        }

        $qtde = PadraoDecimal::parseStrict(
            (string) ($data['qtde_executada'] ?? $os->qtde_planejada),
            PadraoDecimal::SCALE_QTY
        );
        if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_executada' => ['Informe a quantidade executada.'],
            ]);
        }

        $aceitarFora = (bool) ($data['aceitar_fora_tolerancia'] ?? false);
        $motivoFora = isset($data['motivo_fora_tolerancia'])
            ? trim((string) $data['motivo_fora_tolerancia'])
            : '';

        $os = DB::transaction(function () use ($os, $qtde, $aceitarFora, $motivoFora, $data) {
            $os = OrdemServico::query()
                ->with(['pedidoItem', 'pedido'])
                ->lockForUpdate()
                ->findOrFail($os->id);

            $pedido = $os->pedido;
            $item = $os->pedidoItem;
            $tolPct = (string) ($pedido->tolerancia_qtd_pct ?? '20');
            $pedida = (string) $item->qtde_pedida;
            $tolFrac = bcdiv($tolPct, '100', 8);
            $delta = bcmul($pedida, $tolFrac, PadraoDecimal::SCALE_QTY + 4);
            $min = PadraoDecimal::roundHalfUp(bcsub($pedida, $delta, PadraoDecimal::SCALE_QTY + 4), PadraoDecimal::SCALE_QTY);
            $max = PadraoDecimal::roundHalfUp(bcadd($pedida, $delta, PadraoDecimal::SCALE_QTY + 4), PadraoDecimal::SCALE_QTY);
            if (bccomp($min, '0', PadraoDecimal::SCALE_QTY) < 0) {
                $min = '0';
            }

            $fora = bccomp($qtde, $min, PadraoDecimal::SCALE_QTY) < 0
                || bccomp($qtde, $max, PadraoDecimal::SCALE_QTY) > 0;

            if ($fora && ! $aceitarFora) {
                throw ValidationException::withMessages([
                    'qtde_executada' => [
                        "Quantidade fora da tolerância ±{$tolPct}% (faixa {$min}–{$max}).",
                    ],
                ]);
            }
            if ($fora && $motivoFora === '') {
                throw ValidationException::withMessages([
                    'motivo_fora_tolerancia' => ['Informe o motivo do desvio fora da tolerância.'],
                ]);
            }

            $os->qtde_executada = $qtde;
            $os->fora_tolerancia = $fora;
            $os->motivo_fora_tolerancia = $fora ? $motivoFora : null;
            $os->status = OrdemServico::STATUS_CONCLUIDA;
            $os->concluida_em = now();
            $os->concluida_por = Auth::id();
            $os->iniciada_em = $os->iniciada_em ?? now();
            if (! empty($data['observacao'])) {
                $os->observacao = trim((string) $data['observacao']);
            }
            $os->save();

            $item->qtde_produzida = $qtde;
            $item->qtde_faturavel = $qtde;
            $item->status = PedidoItem::STATUS_PRODUZIDO;
            $item->save();

            $pendentes = $pedido->itens()
                ->whereNotIn('status', [PedidoItem::STATUS_PRODUZIDO, PedidoItem::STATUS_CANCELADO])
                ->exists();
            if (! $pendentes) {
                $pedido->status = Pedido::STATUS_PRODUZIDO;
                $pedido->save();
            }

            $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
            $snap['readequacao'] = [
                'os_codigo' => $os->codigo,
                'qtde_pedida' => $pedida,
                'qtde_executada' => $qtde,
                'tolerancia_qtd_pct' => $tolPct,
                'fora_tolerancia' => $fora,
                'motivo' => $fora ? $motivoFora : null,
                'em' => now()->toIso8601String(),
            ];
            $pedido->snapshot = $snap;
            $pedido->save();

            return $os;
        });

        return $this->show($os->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(OrdemServico $o, bool $detalhe = false): array
    {
        $out = [
            'id' => $o->id,
            'codigo' => $o->codigo,
            'status' => $o->status,
            'qtde_planejada' => (string) $o->qtde_planejada,
            'qtde_executada' => $o->qtde_executada !== null ? (string) $o->qtde_executada : null,
            'fora_tolerancia' => (bool) $o->fora_tolerancia,
            'motivo_fora_tolerancia' => $o->motivo_fora_tolerancia,
            'pedido' => $o->pedido ? [
                'id' => $o->pedido->id,
                'codigo' => $o->pedido->codigo,
                'status' => $o->pedido->status,
            ] : null,
            'pedido_item' => $o->pedidoItem ? [
                'id' => $o->pedidoItem->id,
                'descricao' => $o->pedidoItem->descricao,
                'necessidade' => $o->pedidoItem->necessidade,
            ] : null,
            'iniciada_em' => optional($o->iniciada_em)?->toIso8601String(),
            'concluida_em' => optional($o->concluida_em)?->toIso8601String(),
            'created_at' => optional($o->created_at)?->toIso8601String(),
        ];

        if ($detalhe) {
            $out['observacao'] = $o->observacao;
            $out['parceiro'] = $o->pedido?->parceiro ? [
                'id' => $o->pedido->parceiro->id,
                'codigo' => $o->pedido->parceiro->codigo,
                'razao_social' => $o->pedido->parceiro->razao_social,
            ] : null;
        }

        return $out;
    }
}
