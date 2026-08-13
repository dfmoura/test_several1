<?php

namespace App\Services\Cadastros;

use App\Models\NaturezaGerencial;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class NaturezaGerencialService
{
    /**
     * Seed idempotente. Preserva nome/descricao/ativo se o registro já existir;
     * sincroniza estrutura (grupo, nível, pai, folha, ordenação, código exibição).
     */
    public function seedCatalog(): int
    {
        $byCodigo = NaturezaGerencial::withTrashed()->get()->keyBy('codigo');
        $count = 0;

        foreach (NaturezaGerencialCatalogData::itens() as $row) {
            $grupo = (int) $row['grupo'];
            if (! in_array($grupo, NaturezaGerencial::GRUPOS, true)) {
                throw new \RuntimeException("Natureza seed inválida: grupo {$grupo} fora de 1–5.");
            }

            $parentId = null;
            if ($row['parent_codigo']) {
                $parent = $byCodigo->get($row['parent_codigo']);
                if (! $parent) {
                    throw new \RuntimeException(
                        "Pai {$row['parent_codigo']} ausente ao seedar {$row['codigo']}."
                    );
                }
                $parentId = $parent->id;
            }

            $nivel = $row['parent_codigo'] === null
                ? 1
                : substr_count($row['codigo'], '.') + 1;

            $estrutural = [
                'codigo_exibicao' => NaturezaGerencial::codigoExibicaoFrom($row['codigo']),
                'grupo' => $grupo,
                'nivel' => $nivel,
                'parent_id' => $parentId,
                'aceita_lancamento' => $row['aceita_lancamento'],
                'ordenacao' => $row['ordenacao'],
                'deleted_at' => null,
            ];

            $existing = $byCodigo->get($row['codigo']);

            if ($existing) {
                $existing->fill($estrutural);
                if (trim((string) $existing->nome) === '') {
                    $existing->nome = $row['nome'];
                }
                $existing->save();
                $byCodigo->put($row['codigo'], $existing->fresh());
            } else {
                $created = NaturezaGerencial::query()->create(array_merge($estrutural, [
                    'codigo' => $row['codigo'],
                    'nome' => $row['nome'],
                    'descricao' => $row['descricao'],
                    'ativo' => true,
                ]));
                $byCodigo->put($row['codigo'], $created);
            }

            $count++;
        }

        return $count;
    }

    /**
     * @return Collection<int, NaturezaGerencial>
     */
    public function list(
        ?int $grupo = null,
        ?bool $somenteFolhas = null,
        bool $somenteAtivos = false,
        ?string $q = null,
    ): Collection {
        $query = NaturezaGerencial::query()
            ->orderBy('grupo')
            ->orderBy('ordenacao')
            ->orderBy('codigo');

        if ($somenteAtivos) {
            $query->where('ativo', true);
        }

        if ($grupo !== null) {
            if (! in_array($grupo, NaturezaGerencial::GRUPOS, true)) {
                throw ValidationException::withMessages([
                    'grupo' => ['Grupo deve ser entre 1 e 5.'],
                ]);
            }
            $query->where('grupo', $grupo);
        }

        if ($somenteFolhas === true) {
            $query->where('aceita_lancamento', true);
        } elseif ($somenteFolhas === false) {
            $query->where('aceita_lancamento', false);
        }

        if ($q) {
            $term = '%'.mb_strtolower(trim($q)).'%';
            $query->where(function ($builder) use ($term) {
                $builder->whereRaw('LOWER(codigo) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(codigo_exibicao) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(nome) LIKE ?', [$term]);
            });
        }

        return $query->get();
    }

    /**
     * Árvore aninhada (filhos em `children`) para UI de catálogo.
     * Com busca (`q`), devolve lista plana filtrada (sem hierarquia incompleta).
     *
     * @return list<array<string, mixed>>
     */
    public function tree(?int $grupo = null, bool $somenteAtivos = false, ?string $q = null): array
    {
        if ($q !== null && trim($q) !== '') {
            return $this->list($grupo, null, $somenteAtivos, $q)
                ->map(fn (NaturezaGerencial $n) => $this->toArray($n) + ['children' => []])
                ->values()
                ->all();
        }

        $flat = $this->list($grupo, null, $somenteAtivos, null);
        /** @var array<int, array<string, mixed>> $byId */
        $byId = [];
        foreach ($flat as $item) {
            $byId[$item->id] = $this->toArray($item) + ['children' => []];
        }

        $roots = [];
        foreach ($flat as $item) {
            if ($item->parent_id && isset($byId[$item->parent_id])) {
                $byId[$item->parent_id]['children'][] = &$byId[$item->id];
            } else {
                $roots[] = &$byId[$item->id];
            }
        }

        // Desfaz referências PHP para serialização limpa.
        $detach = function (array $nodes) use (&$detach): array {
            $out = [];
            foreach ($nodes as $node) {
                $children = $node['children'] ?? [];
                unset($node['children']);
                $node['children'] = $detach($children);
                $out[] = $node;
            }

            return $out;
        };

        return $detach($roots);
    }

    public function show(NaturezaGerencial $natureza): array
    {
        return $this->toArray($natureza);
    }

    /**
     * Atualização leve: nome, descricao, ativo. Bloqueia código/grupo/pai/folha.
     *
     * @param  array{nome?: string, descricao?: ?string, ativo?: bool}  $data
     */
    public function update(NaturezaGerencial $natureza, array $data): array
    {
        $imutaveis = ['codigo', 'grupo', 'parent_id', 'aceita_lancamento', 'codigo_exibicao', 'nivel'];
        foreach ($imutaveis as $campo) {
            if (array_key_exists($campo, $data)) {
                throw ValidationException::withMessages([
                    $campo => ['Campo imutável no catálogo canônico de naturezas gerenciais.'],
                ]);
            }
        }

        $payload = [];
        if (array_key_exists('nome', $data)) {
            $nome = trim((string) $data['nome']);
            if ($nome === '') {
                throw ValidationException::withMessages([
                    'nome' => ['Nome é obrigatório.'],
                ]);
            }
            $payload['nome'] = $nome;
        }
        if (array_key_exists('descricao', $data)) {
            $desc = $data['descricao'];
            $payload['descricao'] = $desc === null || $desc === '' ? null : trim((string) $desc);
        }
        if (array_key_exists('ativo', $data)) {
            $payload['ativo'] = (bool) $data['ativo'];
        }

        if ($payload === []) {
            throw ValidationException::withMessages([
                'natureza' => ['Nenhum campo editável informado (nome, descricao, ativo).'],
            ]);
        }

        $natureza->fill($payload)->save();

        return $this->toArray($natureza->fresh());
    }

    /**
     * Folhas ativas para picker futuro (TIT/BX).
     *
     * @return Collection<int, NaturezaGerencial>
     */
    public function folhasAtivas(?int $grupo = null, ?string $q = null): Collection
    {
        return $this->list($grupo, true, true, $q);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(NaturezaGerencial $n): array
    {
        return [
            'id' => $n->id,
            'codigo' => $n->codigo,
            'codigo_exibicao' => $n->codigo_exibicao,
            'grupo' => $n->grupo,
            'grupo_nome' => $n->grupoNome(),
            'nivel' => $n->nivel,
            'parent_id' => $n->parent_id,
            'nome' => $n->nome,
            'descricao' => $n->descricao,
            'aceita_lancamento' => $n->aceita_lancamento,
            'ativo' => $n->ativo,
            'ordenacao' => $n->ordenacao,
        ];
    }
}
