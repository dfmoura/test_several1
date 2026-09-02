<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Feriado;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FeriadoService
{
    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?bool $somenteAtivos = null, ?int $ano = null): array
    {
        $query = Feriado::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('data');

        if ($somenteAtivos === true) {
            $query->where('ativo', true);
        }

        if ($ano !== null) {
            $query->where(function ($inner) use ($ano) {
                $inner->whereYear('data', $ano)
                    ->orWhere('recorrente_anual', true);
            });
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('nome', 'like', $like)
                    ->orWhere('tipo', 'like', $like);
            });
        }

        return $query->get()->map(fn (Feriado $f) => $this->toOut($f))->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $payload = $this->normalizePayload($data);
        $this->assertDataUnique($empresa->id, $payload['data']);

        $feriado = DB::transaction(function () use ($empresa, $payload) {
            return Feriado::query()->create([
                'empresa_id' => $empresa->id,
                ...$payload,
            ]);
        });

        return $this->toOut($feriado);
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Feriado $feriado): array
    {
        return $this->toOut($feriado);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(Feriado $feriado, array $data): array
    {
        $payload = [];

        if (array_key_exists('data', $data)) {
            $payload['data'] = $this->normalizeData($data['data']);
            $this->assertDataUnique($feriado->empresa_id, $payload['data'], $feriado->id);
        }

        if (array_key_exists('nome', $data)) {
            $payload['nome'] = $this->normalizeNome($data['nome']);
        }

        if (array_key_exists('tipo', $data)) {
            $payload['tipo'] = $this->normalizeTipo($data['tipo']);
        }

        if (array_key_exists('recorrente_anual', $data)) {
            $payload['recorrente_anual'] = (bool) $data['recorrente_anual'];
        }

        if (array_key_exists('ativo', $data)) {
            $payload['ativo'] = (bool) $data['ativo'];
        }

        if ($payload === []) {
            return $this->toOut($feriado);
        }

        DB::transaction(function () use ($feriado, $payload) {
            $feriado->fill($payload);
            $feriado->save();
        });

        return $this->toOut($feriado->fresh());
    }

    public function softDelete(Feriado $feriado): void
    {
        DB::transaction(function () use ($feriado) {
            $feriado->delete();
        });
    }

    /**
     * @return array{criados: int, ignorados: int}
     */
    public function seedNacionais(Empresa $empresa, ?int $ano = null): array
    {
        $ano = $ano ?? (int) now()->year;
        $criados = 0;
        $ignorados = 0;

        DB::transaction(function () use ($empresa, $ano, &$criados, &$ignorados) {
            foreach (Feriado::NACIONAIS_FIXOS as $item) {
                $data = Carbon::create($ano, $item['mes'], $item['dia'])->toDateString();

                $exists = Feriado::query()
                    ->where('empresa_id', $empresa->id)
                    ->whereDate('data', $data)
                    ->exists();

                if ($exists) {
                    $ignorados++;

                    continue;
                }

                Feriado::query()->create([
                    'empresa_id' => $empresa->id,
                    'data' => $data,
                    'nome' => $item['nome'],
                    'tipo' => Feriado::TIPO_NACIONAL,
                    'recorrente_anual' => true,
                    'ativo' => true,
                ]);
                $criados++;
            }
        });

        return ['criados' => $criados, 'ignorados' => $ignorados];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{data: string, nome: string, tipo: string, recorrente_anual: bool, ativo: bool}
     */
    private function normalizePayload(array $data): array
    {
        return [
            'data' => $this->normalizeData($data['data'] ?? null),
            'nome' => $this->normalizeNome($data['nome'] ?? null),
            'tipo' => $this->normalizeTipo($data['tipo'] ?? Feriado::TIPO_EMPRESA),
            'recorrente_anual' => array_key_exists('recorrente_anual', $data)
                ? (bool) $data['recorrente_anual']
                : false,
            'ativo' => array_key_exists('ativo', $data) ? (bool) $data['ativo'] : true,
        ];
    }

    private function normalizeData(mixed $value): string
    {
        if ($value === null || $value === '') {
            throw ValidationException::withMessages(['data' => 'Informe a data do feriado.']);
        }

        return Carbon::parse((string) $value)->toDateString();
    }

    private function normalizeNome(mixed $value): string
    {
        $nome = trim((string) ($value ?? ''));
        if ($nome === '') {
            throw ValidationException::withMessages(['nome' => 'Informe o nome do feriado.']);
        }

        return $nome;
    }

    private function normalizeTipo(mixed $value): string
    {
        $tipo = strtoupper(trim((string) ($value ?? Feriado::TIPO_EMPRESA)));

        if (! in_array($tipo, Feriado::TIPOS, true)) {
            throw ValidationException::withMessages(['tipo' => 'Tipo de feriado inválido.']);
        }

        return $tipo;
    }

    private function assertDataUnique(int $empresaId, string $data, ?int $ignoreId = null): void
    {
        $query = Feriado::query()
            ->where('empresa_id', $empresaId)
            ->whereDate('data', $data);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'data' => 'Já existe feriado nesta data para a empresa.',
            ]);
        }
    }

    /** @return array<string, mixed> */
    private function toOut(Feriado $feriado): array
    {
        return [
            'id' => $feriado->id,
            'empresa_id' => $feriado->empresa_id,
            'data' => $feriado->data?->toDateString(),
            'nome' => $feriado->nome,
            'tipo' => $feriado->tipo,
            'recorrente_anual' => (bool) $feriado->recorrente_anual,
            'ativo' => (bool) $feriado->ativo,
            'created_at' => $feriado->created_at?->toIso8601String(),
            'updated_at' => $feriado->updated_at?->toIso8601String(),
        ];
    }
}
