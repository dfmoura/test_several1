<?php

namespace App\Services\Compras;

use App\Models\CompraNecessidade;
use App\Models\Empresa;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompraNecessidadeService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $status = null, ?int $produtoId = null): array
    {
        $query = CompraNecessidade::query()
            ->with([
                'produto:id,codigo,descricao_fiscal,familia,unidade_comercial,unidade_interna',
                ...CompraNecessidade::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }

        if ($produtoId) {
            $query->where('produto_id', $produtoId);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('motivo', 'like', $like)
                    ->orWhere('observacao', 'like', $like)
                    ->orWhereHas('produto', function ($pq) use ($like) {
                        $pq->where('codigo', 'like', $like)
                            ->orWhere('descricao_fiscal', 'like', $like);
                    });
            });
        }

        return $query->get()->map(fn (CompraNecessidade $n) => $this->toOut($n))->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $produto = $this->assertProduto($empresa, (int) $data['produto_id']);
        $qtde = PadraoDecimal::parseStrict($data['qtde'], PadraoDecimal::SCALE_QTY);
        if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde' => ['Quantidade deve ser maior que zero.'],
            ]);
        }

        $necessidade = DB::transaction(function () use ($empresa, $data, $produto, $qtde) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'NEC-'.$ano, 5);

            return CompraNecessidade::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'produto_id' => $produto->id,
                'qtde' => $qtde,
                'unidade' => $data['unidade'] ?? $produto->unidade_comercial ?? 'UN',
                'necessario_em' => $data['necessario_em'] ?? null,
                'motivo' => $this->nullIfEmpty($data['motivo'] ?? null),
                'prioridade' => $data['prioridade'] ?? CompraNecessidade::PRIORIDADE_NORMAL,
                'status' => CompraNecessidade::STATUS_ABERTA,
                'solicitante_user_id' => Auth::id(),
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
            ]);
        });

        $necessidade->load([
            'produto:id,codigo,descricao_fiscal,familia,unidade_comercial,unidade_interna',
            ...CompraNecessidade::userStampWith(),
        ]);

        return $this->toOut($necessidade);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(CompraNecessidade $necessidade, array $data): array
    {
        if ($necessidade->status !== CompraNecessidade::STATUS_ABERTA) {
            throw ValidationException::withMessages([
                'status' => ['Somente necessidade ABERTA pode ser alterada.'],
            ]);
        }

        $empresa = $necessidade->empresa ?? Empresa::query()->findOrFail($necessidade->empresa_id);

        if (array_key_exists('produto_id', $data)) {
            $produto = $this->assertProduto($empresa, (int) $data['produto_id']);
            $necessidade->produto_id = $produto->id;
            if (! array_key_exists('unidade', $data)) {
                $necessidade->unidade = $produto->unidade_comercial ?? $necessidade->unidade;
            }
        }

        if (array_key_exists('qtde', $data)) {
            $qtde = PadraoDecimal::parseStrict($data['qtde'], PadraoDecimal::SCALE_QTY);
            if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    'qtde' => ['Quantidade deve ser maior que zero.'],
                ]);
            }
            $necessidade->qtde = $qtde;
        }

        foreach (['unidade', 'necessario_em', 'prioridade'] as $field) {
            if (array_key_exists($field, $data)) {
                $necessidade->{$field} = $data[$field];
            }
        }

        foreach (['motivo', 'observacao'] as $field) {
            if (array_key_exists($field, $data)) {
                $necessidade->{$field} = $this->nullIfEmpty($data[$field]);
            }
        }

        $necessidade->save();
        $necessidade->load([
            'produto:id,codigo,descricao_fiscal,familia,unidade_comercial,unidade_interna',
            ...CompraNecessidade::userStampWith(),
        ]);

        return $this->toOut($necessidade);
    }

    /**
     * @return array<string, mixed>
     */
    public function cancel(CompraNecessidade $necessidade): array
    {
        if ($necessidade->status === CompraNecessidade::STATUS_CANCELADA) {
            throw ValidationException::withMessages([
                'status' => ['Necessidade já cancelada.'],
            ]);
        }

        if ($necessidade->status === CompraNecessidade::STATUS_ATENDIDA) {
            throw ValidationException::withMessages([
                'status' => ['Necessidade atendida não pode ser cancelada.'],
            ]);
        }

        $necessidade->status = CompraNecessidade::STATUS_CANCELADA;
        $necessidade->save();
        $necessidade->load([
            'produto:id,codigo,descricao_fiscal,familia,unidade_comercial,unidade_interna',
            ...CompraNecessidade::userStampWith(),
        ]);

        return $this->toOut($necessidade);
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(CompraNecessidade $n): array
    {
        $n->loadMissing([
            'produto:id,codigo,descricao_fiscal,familia,unidade_comercial,unidade_interna',
            ...CompraNecessidade::userStampWith(),
        ]);

        return [
            'id' => $n->id,
            'empresa_id' => $n->empresa_id,
            'codigo' => $n->codigo,
            'produto_id' => $n->produto_id,
            'produto' => $n->produto ? [
                'id' => $n->produto->id,
                'codigo' => $n->produto->codigo,
                'descricao_fiscal' => $n->produto->descricao_fiscal,
                'familia' => $n->produto->familia,
                'unidade_comercial' => $n->produto->unidade_comercial,
                'unidade_interna' => $n->produto->unidade_interna,
            ] : null,
            'qtde' => (string) $n->qtde,
            'unidade' => $n->unidade,
            'necessario_em' => optional($n->necessario_em)?->format('Y-m-d'),
            'motivo' => $n->motivo,
            'prioridade' => $n->prioridade,
            'status' => $n->status,
            'solicitante_user_id' => $n->solicitante_user_id,
            'observacao' => $n->observacao,
            'created_at' => optional($n->created_at)?->toIso8601String(),
            'updated_at' => optional($n->updated_at)?->toIso8601String(),
            'criado_por' => CompraNecessidade::userStampFrom($n->criador),
            'atualizado_por' => CompraNecessidade::userStampFrom($n->atualizador),
        ];
    }

    private function assertProduto(Empresa $empresa, int $produtoId): Produto
    {
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $produtoId)
            ->first();

        if (! $produto) {
            throw ValidationException::withMessages([
                'produto_id' => ['Produto inválido para a empresa.'],
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
