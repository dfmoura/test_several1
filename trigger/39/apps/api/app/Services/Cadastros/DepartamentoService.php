<?php

namespace App\Services\Cadastros;

use App\Models\BemPatrimonial;
use App\Models\Departamento;
use App\Models\Empresa;
use App\Models\Parceiro;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DepartamentoService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?bool $somenteAtivos = null): array
    {
        $query = Departamento::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('nome');

        if ($somenteAtivos === true) {
            $query->where('ativo', true);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('nome', 'like', $like);
            });
        }

        return $query->get()->map(fn (Departamento $d) => $this->toOut($d))->all();
    }

    /**
     * Picker: só ativos da EMP.
     *
     * @return list<array{id: int, codigo: string, nome: string, ativo: bool}>
     */
    public function consultaAtivos(Empresa $empresa, ?string $q = null): array
    {
        $query = Departamento::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativo', true)
            ->orderBy('nome');

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('nome', 'like', $like);
            });
        }

        return $query->get(['id', 'codigo', 'nome', 'ativo'])
            ->map(fn (Departamento $d) => [
                'id' => $d->id,
                'codigo' => $d->codigo,
                'nome' => $d->nome,
                'ativo' => true,
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $nome = $this->normalizeNome($data['nome'] ?? null);
        $this->assertNomeUnique($empresa->id, $nome);

        $dep = DB::transaction(function () use ($empresa, $nome, $data) {
            $codigo = $this->codigos->nextCode($empresa->id, 'DEP');

            return Departamento::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'nome' => $nome,
                'ativo' => array_key_exists('ativo', $data) ? (bool) $data['ativo'] : true,
            ]);
        });

        return $this->toOut($dep);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(Departamento $departamento, array $data): array
    {
        $payload = [];

        if (array_key_exists('nome', $data)) {
            $nome = $this->normalizeNome($data['nome']);
            $this->assertNomeUnique($departamento->empresa_id, $nome, $departamento->id);
            $payload['nome'] = $nome;
        }

        if (array_key_exists('ativo', $data)) {
            $payload['ativo'] = (bool) $data['ativo'];
        }

        if ($payload === []) {
            return $this->toOut($departamento);
        }

        DB::transaction(function () use ($departamento, $payload) {
            $departamento->fill($payload);
            $departamento->save();

            if (isset($payload['nome'])) {
                Parceiro::query()
                    ->where('departamento_id', $departamento->id)
                    ->update(['departamento' => $payload['nome']]);

                BemPatrimonial::query()
                    ->where('departamento_id', $departamento->id)
                    ->update(['local' => $payload['nome']]);
            }
        });

        return $this->toOut($departamento->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Departamento $departamento): array
    {
        return $this->toOut($departamento);
    }

    public function softDelete(Departamento $departamento): void
    {
        $emUsoParceiro = Parceiro::query()
            ->where('departamento_id', $departamento->id)
            ->exists();

        $emUsoBem = BemPatrimonial::query()
            ->where('departamento_id', $departamento->id)
            ->exists();

        if ($emUsoParceiro || $emUsoBem) {
            throw ValidationException::withMessages([
                'departamento' => ['Departamento em uso (colaborador ou patrimônio). Inative em vez de excluir.'],
            ]);
        }

        $departamento->ativo = false;
        $departamento->save();
        $departamento->delete();
    }

    /**
     * Garante a lista canônica do estudo 32 na EMP (idempotente).
     */
    public function ensureCanonicos(Empresa $empresa): void
    {
        foreach (Departamento::CANONICOS as $nome) {
            $exists = Departamento::query()
                ->where('empresa_id', $empresa->id)
                ->whereRaw('LOWER(nome) = ?', [mb_strtolower($nome)])
                ->exists();

            if ($exists) {
                continue;
            }

            $this->create($empresa, ['nome' => $nome, 'ativo' => true]);
        }
    }

    /**
     * Resolve id/código/nome para departamento_id na EMP.
     * Cria sob demanda quando $criarSeAusente e o valor for um nome (não código).
     */
    public function resolveId(Empresa $empresa, mixed $departamentoId, mixed $departamentoTexto, bool $criarSeAusente = false): ?int
    {
        if ($departamentoId !== null && $departamentoId !== '') {
            $id = (int) $departamentoId;
            $ok = Departamento::query()
                ->where('empresa_id', $empresa->id)
                ->where('id', $id)
                ->where('ativo', true)
                ->exists();

            if (! $ok) {
                throw ValidationException::withMessages([
                    'departamento_id' => ['Departamento inválido ou inativo para a empresa.'],
                ]);
            }

            return $id;
        }

        $texto = is_string($departamentoTexto) ? trim($departamentoTexto) : '';
        if ($texto === '') {
            return null;
        }

        $byCodigo = Departamento::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', strtoupper($texto))
            ->first();

        if ($byCodigo) {
            if (! $byCodigo->ativo) {
                throw ValidationException::withMessages([
                    'departamento' => ['Departamento inativo: '.$byCodigo->codigo],
                ]);
            }

            return $byCodigo->id;
        }

        $byNome = Departamento::query()
            ->where('empresa_id', $empresa->id)
            ->whereRaw('LOWER(nome) = ?', [mb_strtolower($texto)])
            ->first();

        if ($byNome) {
            if (! $byNome->ativo) {
                throw ValidationException::withMessages([
                    'departamento' => ['Departamento inativo: '.$byNome->nome],
                ]);
            }

            return $byNome->id;
        }

        if (! $criarSeAusente) {
            throw ValidationException::withMessages([
                'departamento' => ['Departamento não encontrado: '.$texto],
            ]);
        }

        $created = $this->create($empresa, ['nome' => $texto, 'ativo' => true]);

        return (int) $created['id'];
    }

    public function mirrorNome(?int $departamentoId): ?string
    {
        if ($departamentoId === null) {
            return null;
        }

        return Departamento::query()->where('id', $departamentoId)->value('nome');
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(Departamento $d): array
    {
        return [
            'id' => $d->id,
            'empresa_id' => $d->empresa_id,
            'codigo' => $d->codigo,
            'nome' => $d->nome,
            'ativo' => (bool) $d->ativo,
            'created_at' => optional($d->created_at)?->toIso8601String(),
            'updated_at' => optional($d->updated_at)?->toIso8601String(),
        ];
    }

    private function normalizeNome(mixed $nome): string
    {
        $trimmed = trim((string) $nome);
        if ($trimmed === '') {
            throw ValidationException::withMessages([
                'nome' => ['Informe o nome do departamento.'],
            ]);
        }

        return $trimmed;
    }

    private function assertNomeUnique(int $empresaId, string $nome, ?int $ignoreId = null): void
    {
        $query = Departamento::query()
            ->where('empresa_id', $empresaId)
            ->whereRaw('LOWER(nome) = ?', [mb_strtolower($nome)]);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'nome' => ['Já existe departamento com este nome nesta empresa.'],
            ]);
        }
    }
}
