<?php

namespace App\Services\Cadastros;

use App\Models\BacklogItem;
use App\Models\Empresa;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BacklogService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $situacao = null): array
    {
        $query = BacklogItem::query()
            ->where('empresa_id', $empresa->id)
            ->orderByRaw('concluido_em IS NULL DESC')
            ->orderByDesc('created_at');

        if ($situacao === 'abertos') {
            $query->whereNull('concluido_em');
        } elseif ($situacao === 'concluidos') {
            $query->whereNotNull('concluido_em');
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('tarefa', 'like', $like)
                    ->orWhere('observacao_conclusao', 'like', $like);
            });
        }

        return $query->get()->map(fn (BacklogItem $item) => $this->toOut($item))->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $tarefa = $this->normalizeTarefa($data['tarefa'] ?? null);

        $item = DB::transaction(function () use ($empresa, $tarefa) {
            $codigo = $this->codigos->nextCode($empresa->id, 'BLG');

            return BacklogItem::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'tarefa' => $tarefa,
                'concluido_em' => null,
            ]);
        });

        return $this->toOut($item);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(BacklogItem $item, array $data): array
    {
        if (! array_key_exists('tarefa', $data)) {
            return $this->toOut($item);
        }

        $tarefa = $this->normalizeTarefa($data['tarefa']);
        $item->tarefa = $tarefa;
        $item->save();

        return $this->toOut($item->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function show(BacklogItem $item): array
    {
        return $this->toOut($item);
    }

    /**
     * @param  array{observacao_conclusao?: string|null}  $data
     * @return array<string, mixed>
     */
    public function concluir(BacklogItem $item, array $data = []): array
    {
        $observacao = $this->normalizeObservacao($data['observacao_conclusao'] ?? null);

        if ($item->isConcluido()) {
            if ($observacao !== null && $item->observacao_conclusao !== $observacao) {
                $item->observacao_conclusao = $observacao;
                $item->save();
            }

            return $this->toOut($item->fresh());
        }

        $item->concluido_em = now();
        $item->observacao_conclusao = $observacao;
        $item->save();

        return $this->toOut($item->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function reabrir(BacklogItem $item): array
    {
        if (! $item->isConcluido()) {
            return $this->toOut($item);
        }

        $item->concluido_em = null;
        $item->observacao_conclusao = null;
        $item->save();

        return $this->toOut($item->fresh());
    }

    public function softDelete(BacklogItem $item): void
    {
        $item->delete();
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(BacklogItem $item): array
    {
        return [
            'id' => $item->id,
            'empresa_id' => $item->empresa_id,
            'codigo' => $item->codigo,
            'tarefa' => $item->tarefa,
            'situacao' => $item->isConcluido() ? 'CONCLUIDO' : 'ABERTO',
            'lancado_em' => optional($item->created_at)?->toIso8601String(),
            'concluido_em' => optional($item->concluido_em)?->toIso8601String(),
            'observacao_conclusao' => $item->observacao_conclusao,
            'created_at' => optional($item->created_at)?->toIso8601String(),
            'updated_at' => optional($item->updated_at)?->toIso8601String(),
        ];
    }

    private function normalizeTarefa(mixed $tarefa): string
    {
        $trimmed = trim((string) $tarefa);
        if ($trimmed === '') {
            throw ValidationException::withMessages([
                'tarefa' => ['Informe a tarefa.'],
            ]);
        }

        return $trimmed;
    }

    private function normalizeObservacao(mixed $observacao): ?string
    {
        if ($observacao === null) {
            return null;
        }

        $trimmed = trim((string) $observacao);

        return $trimmed === '' ? null : $trimmed;
    }
}
