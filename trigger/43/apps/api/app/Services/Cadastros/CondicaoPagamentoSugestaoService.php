<?php

namespace App\Services\Cadastros;

use App\Models\CondicaoPagamentoSugestao;
use App\Models\Empresa;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CondicaoPagamentoSugestaoService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?bool $somenteAtivos = null): array
    {
        $query = CondicaoPagamentoSugestao::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('ordenacao')
            ->orderBy('texto');

        if ($somenteAtivos === true) {
            $query->where('ativo', true);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where('texto', 'like', $like);
        }

        return $query->get()->map(fn (CondicaoPagamentoSugestao $s) => $this->toOut($s))->all();
    }

    /**
     * Picker: só ativos da EMP, ordenados.
     *
     * @return list<array{id: int, texto: string, ordenacao: int}>
     */
    public function consultaAtivos(Empresa $empresa, ?string $q = null): array
    {
        $query = CondicaoPagamentoSugestao::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativo', true)
            ->orderBy('ordenacao')
            ->orderBy('texto');

        if ($q) {
            $like = '%'.$q.'%';
            $query->where('texto', 'like', $like);
        }

        return $query->get(['id', 'texto', 'ordenacao'])
            ->map(fn (CondicaoPagamentoSugestao $s) => [
                'id' => $s->id,
                'texto' => $s->texto,
                'ordenacao' => (int) $s->ordenacao,
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $texto = $this->normalizeTexto($data['texto'] ?? null);

        $existente = CondicaoPagamentoSugestao::query()
            ->withTrashed()
            ->where('empresa_id', $empresa->id)
            ->whereRaw('LOWER(texto) = LOWER(?)', [$texto])
            ->first();

        if ($existente !== null) {
            if ($existente->trashed() || ! $existente->ativo) {
                $existente->restore();
                $existente->ativo = true;
                if (array_key_exists('ordenacao', $data)) {
                    $existente->ordenacao = (int) $data['ordenacao'];
                }
                $existente->save();

                return $this->toOut($existente->fresh());
            }

            throw ValidationException::withMessages([
                'texto' => ['Já existe sugestão com este texto nesta empresa.'],
            ]);
        }

        $ordenacao = array_key_exists('ordenacao', $data)
            ? (int) $data['ordenacao']
            : $this->nextOrdenacao($empresa->id);

        $sugestao = CondicaoPagamentoSugestao::query()->create([
            'empresa_id' => $empresa->id,
            'texto' => $texto,
            'ordenacao' => $ordenacao,
            'ativo' => array_key_exists('ativo', $data) ? (bool) $data['ativo'] : true,
        ]);

        return $this->toOut($sugestao);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(CondicaoPagamentoSugestao $sugestao, array $data): array
    {
        $payload = [];

        if (array_key_exists('texto', $data)) {
            $texto = $this->normalizeTexto($data['texto']);
            $this->assertTextoUnique($sugestao->empresa_id, $texto, $sugestao->id);
            $payload['texto'] = $texto;
        }

        if (array_key_exists('ordenacao', $data)) {
            $payload['ordenacao'] = (int) $data['ordenacao'];
        }

        if (array_key_exists('ativo', $data)) {
            $payload['ativo'] = (bool) $data['ativo'];
        }

        if ($payload === []) {
            return $this->toOut($sugestao);
        }

        $sugestao->fill($payload);
        $sugestao->save();

        return $this->toOut($sugestao->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function show(CondicaoPagamentoSugestao $sugestao): array
    {
        return $this->toOut($sugestao);
    }

    public function softDelete(CondicaoPagamentoSugestao $sugestao): void
    {
        $sugestao->ativo = false;
        $sugestao->save();
        $sugestao->delete();
    }

    /**
     * Garante a lista canônica na EMP (idempotente).
     */
    public function ensureCanonicos(Empresa $empresa): void
    {
        foreach (CondicaoPagamentoSugestao::CANONICOS as $index => $texto) {
            $exists = CondicaoPagamentoSugestao::query()
                ->where('empresa_id', $empresa->id)
                ->whereRaw('LOWER(texto) = LOWER(?)', [$texto])
                ->exists();

            if ($exists) {
                continue;
            }

            $this->create($empresa, [
                'texto' => $texto,
                'ordenacao' => ($index + 1) * 10,
                'ativo' => true,
            ]);
        }
    }

    /**
     * @return array{criados: int, existentes: int, total: int, canonicos: list<string>}
     */
    public function seedCanonicos(Empresa $empresa): array
    {
        $antes = CondicaoPagamentoSugestao::query()->where('empresa_id', $empresa->id)->count();
        $this->ensureCanonicos($empresa);
        $depois = CondicaoPagamentoSugestao::query()->where('empresa_id', $empresa->id)->count();
        $criados = max(0, $depois - $antes);

        return [
            'criados' => $criados,
            'existentes' => $depois - $criados,
            'total' => $depois,
            'canonicos' => CondicaoPagamentoSugestao::CANONICOS,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(CondicaoPagamentoSugestao $s): array
    {
        return [
            'id' => $s->id,
            'empresa_id' => $s->empresa_id,
            'texto' => $s->texto,
            'ordenacao' => (int) $s->ordenacao,
            'ativo' => (bool) $s->ativo,
            'created_at' => optional($s->created_at)?->toIso8601String(),
            'updated_at' => optional($s->updated_at)?->toIso8601String(),
        ];
    }

    private function normalizeTexto(mixed $texto): string
    {
        $trimmed = trim((string) $texto);
        if ($trimmed === '') {
            throw ValidationException::withMessages([
                'texto' => ['Informe o texto da condição de pagamento.'],
            ]);
        }

        return $trimmed;
    }

    private function assertTextoUnique(int $empresaId, string $texto, ?int $ignoreId = null): void
    {
        $query = CondicaoPagamentoSugestao::query()
            ->where('empresa_id', $empresaId)
            ->whereRaw('LOWER(texto) = LOWER(?)', [$texto]);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'texto' => ['Já existe sugestão com este texto nesta empresa.'],
            ]);
        }
    }

    private function nextOrdenacao(int $empresaId): int
    {
        $max = CondicaoPagamentoSugestao::query()
            ->where('empresa_id', $empresaId)
            ->max('ordenacao');

        return ((int) $max) + 10;
    }
}
