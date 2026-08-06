<?php

namespace App\Services\Comercial\Orcamento;

use App\Models\OrcCatalogoAcabamento;
use App\Models\OrcCatalogoHoraMaquina;
use App\Models\OrcCatalogoMaquina;
use App\Models\OrcCatalogoPapel;
use App\Models\OrcCatalogoTipoTroca;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * CRUD das 4 bases editáveis do catálogo ORC (estudo 32).
 * Seed idempotente a partir do catalog_oficial.json — nunca sobrescreve valores já editados.
 */
class OrcamentoCatalogoAdminService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** @return array{papeis: int, acabamentos: int, tipos_troca: int, maquinas: int, fonte: string} */
    public function resumo(): array
    {
        $hasDb = $this->tablesReady() && OrcCatalogoPapel::query()->exists();

        return [
            'papeis' => OrcCatalogoPapel::query()->count(),
            'acabamentos' => OrcCatalogoAcabamento::query()->count(),
            'tipos_troca' => OrcCatalogoTipoTroca::query()->count(),
            'maquinas' => OrcCatalogoMaquina::query()->count(),
            'fonte' => $hasDb ? 'database' : 'json_fallback',
            'nota' => 'ORCs já salvos mantêm snapshot. Alterações valem para novos cálculos.',
        ];
    }

    /**
     * Importa itens ausentes do JSON oficial. Não altera preço/tempo já cadastrado.
     *
     * @return array{criados: array<string, int>, existentes: array<string, int>}
     */
    public function seedFromJson(?string $path = null, bool $forceOverwrite = false): array
    {
        $path ??= resource_path('data/orcamento/catalog_oficial.json');
        $raw = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        $criados = ['papeis' => 0, 'acabamentos' => 0, 'tipos_troca' => 0, 'maquinas' => 0, 'tarifas' => 0];
        $existentes = ['papeis' => 0, 'acabamentos' => 0, 'tipos_troca' => 0, 'maquinas' => 0, 'tarifas' => 0];

        DB::transaction(function () use ($raw, $forceOverwrite, &$criados, &$existentes) {
            $ordem = 0;
            foreach ($raw['papel'] ?? [] as $nome => $preco) {
                $nome = OrcamentoCatalogo::norm((string) $nome);
                $row = OrcCatalogoPapel::query()->where('nome', $nome)->first();
                if ($row) {
                    $existentes['papeis']++;
                    if ($forceOverwrite) {
                        $row->update(['preco_m2' => (float) $preco, 'ativo' => true]);
                    }
                    continue;
                }
                OrcCatalogoPapel::query()->create([
                    'nome' => $nome,
                    'preco_m2' => (float) $preco,
                    'ativo' => true,
                    'ordem' => $ordem++,
                ]);
                $criados['papeis']++;
            }

            $perda = $raw['perda_acabamento'] ?? [];
            $ordem = 0;
            foreach ($raw['acabamentos'] ?? [] as $nome => $preco) {
                $nome = OrcamentoCatalogo::norm((string) $nome);
                $row = OrcCatalogoAcabamento::query()->where('nome', $nome)->first();
                $perdaM2 = (float) ($perda[$nome] ?? $perda[OrcamentoCatalogo::norm((string) $nome)] ?? 0);
                if ($row) {
                    $existentes['acabamentos']++;
                    if ($forceOverwrite) {
                        $row->update([
                            'preco_m2' => (float) $preco,
                            'perda_m2' => $perdaM2,
                            'ativo' => true,
                        ]);
                    }
                    continue;
                }
                OrcCatalogoAcabamento::query()->create([
                    'nome' => $nome,
                    'preco_m2' => (float) $preco,
                    'perda_m2' => $perdaM2,
                    'ativo' => true,
                    'ordem' => $ordem++,
                ]);
                $criados['acabamentos']++;
            }

            $ordem = 0;
            foreach ($raw['hora_parada_h'] ?? [] as $tipo => $tempo) {
                $tipo = OrcamentoCatalogo::norm((string) $tipo);
                $row = OrcCatalogoTipoTroca::query()->where('tipo', $tipo)->first();
                if ($row) {
                    $existentes['tipos_troca']++;
                    if ($forceOverwrite) {
                        $row->update(['tempo_h' => (float) $tempo, 'ativo' => true]);
                    }
                    continue;
                }
                OrcCatalogoTipoTroca::query()->create([
                    'tipo' => $tipo,
                    'tempo_h' => (float) $tempo,
                    'ativo' => true,
                    'ordem' => $ordem++,
                ]);
                $criados['tipos_troca']++;
            }

            $maquinasLista = $raw['maquinas'] ?? array_keys($raw['hora_maquina'] ?? []);
            $ordem = 0;
            foreach ($maquinasLista as $nome) {
                $nome = OrcamentoCatalogo::norm((string) $nome);
                $maq = OrcCatalogoMaquina::query()->where('nome', $nome)->first();
                if (! $maq) {
                    $maq = OrcCatalogoMaquina::query()->create([
                        'nome' => $nome,
                        'ativo' => true,
                        'ordem' => $ordem++,
                    ]);
                    $criados['maquinas']++;
                } else {
                    $existentes['maquinas']++;
                    if ($forceOverwrite) {
                        $maq->update(['ativo' => true]);
                    }
                }

                $rates = $raw['hora_maquina'][$nome] ?? $raw['hora_maquina'][strtoupper($nome)] ?? [];
                foreach ($rates as $cores => $tarifa) {
                    $coresKey = trim((string) $cores);
                    $tarifaRow = OrcCatalogoHoraMaquina::query()
                        ->where('maquina_id', $maq->id)
                        ->where('cores', $coresKey)
                        ->first();
                    if ($tarifaRow) {
                        $existentes['tarifas']++;
                        if ($forceOverwrite) {
                            $tarifaRow->update(['tarifa' => (float) $tarifa]);
                        }
                        continue;
                    }
                    OrcCatalogoHoraMaquina::query()->create([
                        'maquina_id' => $maq->id,
                        'cores' => $coresKey,
                        'tarifa' => (float) $tarifa,
                    ]);
                    $criados['tarifas']++;
                }
            }
        });

        return compact('criados', 'existentes');
    }

    /** @return list<array<string, mixed>> */
    public function listPapeis(bool $incluirInativos = true): array
    {
        $q = OrcCatalogoPapel::query()->orderBy('ordem')->orderBy('nome');
        if (! $incluirInativos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (OrcCatalogoPapel $p) => $this->papelOut($p))->all();
    }

    /** @param  array<string, mixed>  $data */
    public function createPapel(array $data): array
    {
        $nome = OrcamentoCatalogo::norm((string) $data['nome']);
        if (OrcCatalogoPapel::query()->where('nome', $nome)->exists()) {
            throw ValidationException::withMessages(['nome' => 'Já existe papel com este nome.']);
        }
        $papel = OrcCatalogoPapel::query()->create([
            'nome' => $nome,
            'preco_m2' => (float) $data['preco_m2'],
            'ativo' => (bool) ($data['ativo'] ?? true),
            'ordem' => (int) ($data['ordem'] ?? ((int) OrcCatalogoPapel::query()->max('ordem') + 1)),
        ]);
        $this->audit->log('orc_catalogo.papel.criar', 'orc_catalogo_papel', $papel->id, null, $this->papelOut($papel));

        return $this->papelOut($papel);
    }

    /** @param  array<string, mixed>  $data */
    public function updatePapel(OrcCatalogoPapel $papel, array $data): array
    {
        $de = $this->papelOut($papel);
        if (array_key_exists('nome', $data)) {
            $nome = OrcamentoCatalogo::norm((string) $data['nome']);
            if (
                OrcCatalogoPapel::query()
                    ->where('nome', $nome)
                    ->where('id', '!=', $papel->id)
                    ->exists()
            ) {
                throw ValidationException::withMessages(['nome' => 'Já existe papel com este nome.']);
            }
            $papel->nome = $nome;
        }
        if (array_key_exists('preco_m2', $data)) {
            $papel->preco_m2 = (float) $data['preco_m2'];
        }
        if (array_key_exists('ativo', $data)) {
            $papel->ativo = (bool) $data['ativo'];
        }
        if (array_key_exists('ordem', $data)) {
            $papel->ordem = (int) $data['ordem'];
        }
        $papel->save();
        $para = $this->papelOut($papel->fresh());
        $this->audit->log('orc_catalogo.papel.atualizar', 'orc_catalogo_papel', $papel->id, $de, $para);

        return $para;
    }

    /** @return list<array<string, mixed>> */
    public function listAcabamentos(bool $incluirInativos = true): array
    {
        $q = OrcCatalogoAcabamento::query()->orderBy('ordem')->orderBy('nome');
        if (! $incluirInativos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (OrcCatalogoAcabamento $a) => $this->acabamentoOut($a))->all();
    }

    /** @param  array<string, mixed>  $data */
    public function createAcabamento(array $data): array
    {
        $nome = OrcamentoCatalogo::norm((string) $data['nome']);
        if (OrcCatalogoAcabamento::query()->where('nome', $nome)->exists()) {
            throw ValidationException::withMessages(['nome' => 'Já existe acabamento com este nome.']);
        }
        $row = OrcCatalogoAcabamento::query()->create([
            'nome' => $nome,
            'preco_m2' => (float) $data['preco_m2'],
            'perda_m2' => (float) ($data['perda_m2'] ?? 0),
            'ativo' => (bool) ($data['ativo'] ?? true),
            'ordem' => (int) ($data['ordem'] ?? ((int) OrcCatalogoAcabamento::query()->max('ordem') + 1)),
        ]);
        $this->audit->log('orc_catalogo.acabamento.criar', 'orc_catalogo_acabamento', $row->id, null, $this->acabamentoOut($row));

        return $this->acabamentoOut($row);
    }

    /** @param  array<string, mixed>  $data */
    public function updateAcabamento(OrcCatalogoAcabamento $acabamento, array $data): array
    {
        $de = $this->acabamentoOut($acabamento);
        if (array_key_exists('nome', $data)) {
            $nome = OrcamentoCatalogo::norm((string) $data['nome']);
            if (
                OrcCatalogoAcabamento::query()
                    ->where('nome', $nome)
                    ->where('id', '!=', $acabamento->id)
                    ->exists()
            ) {
                throw ValidationException::withMessages(['nome' => 'Já existe acabamento com este nome.']);
            }
            $acabamento->nome = $nome;
        }
        if (array_key_exists('preco_m2', $data)) {
            $acabamento->preco_m2 = (float) $data['preco_m2'];
        }
        if (array_key_exists('perda_m2', $data)) {
            $acabamento->perda_m2 = (float) $data['perda_m2'];
        }
        if (array_key_exists('ativo', $data)) {
            $acabamento->ativo = (bool) $data['ativo'];
        }
        if (array_key_exists('ordem', $data)) {
            $acabamento->ordem = (int) $data['ordem'];
        }
        $acabamento->save();
        $para = $this->acabamentoOut($acabamento->fresh());
        $this->audit->log('orc_catalogo.acabamento.atualizar', 'orc_catalogo_acabamento', $acabamento->id, $de, $para);

        return $para;
    }

    /** @return list<array<string, mixed>> */
    public function listTiposTroca(bool $incluirInativos = true): array
    {
        $q = OrcCatalogoTipoTroca::query()->orderBy('ordem')->orderBy('tipo');
        if (! $incluirInativos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (OrcCatalogoTipoTroca $t) => $this->tipoTrocaOut($t))->all();
    }

    /** @param  array<string, mixed>  $data */
    public function createTipoTroca(array $data): array
    {
        $tipo = OrcamentoCatalogo::norm((string) $data['tipo']);
        if (OrcCatalogoTipoTroca::query()->where('tipo', $tipo)->exists()) {
            throw ValidationException::withMessages(['tipo' => 'Já existe tipo de troca com este nome.']);
        }
        $tempoH = array_key_exists('tempo_h', $data)
            ? (float) $data['tempo_h']
            : ((float) ($data['tempo_min'] ?? 0) / 60.0);
        $row = OrcCatalogoTipoTroca::query()->create([
            'tipo' => $tipo,
            'tempo_h' => $tempoH,
            'ativo' => (bool) ($data['ativo'] ?? true),
            'ordem' => (int) ($data['ordem'] ?? ((int) OrcCatalogoTipoTroca::query()->max('ordem') + 1)),
        ]);
        $this->audit->log('orc_catalogo.tipo_troca.criar', 'orc_catalogo_tipo_troca', $row->id, null, $this->tipoTrocaOut($row));

        return $this->tipoTrocaOut($row);
    }

    /** @param  array<string, mixed>  $data */
    public function updateTipoTroca(OrcCatalogoTipoTroca $tipoTroca, array $data): array
    {
        $de = $this->tipoTrocaOut($tipoTroca);
        if (array_key_exists('tipo', $data)) {
            $tipo = OrcamentoCatalogo::norm((string) $data['tipo']);
            if (
                OrcCatalogoTipoTroca::query()
                    ->where('tipo', $tipo)
                    ->where('id', '!=', $tipoTroca->id)
                    ->exists()
            ) {
                throw ValidationException::withMessages(['tipo' => 'Já existe tipo de troca com este nome.']);
            }
            $tipoTroca->tipo = $tipo;
        }
        if (array_key_exists('tempo_h', $data)) {
            $tipoTroca->tempo_h = (float) $data['tempo_h'];
        } elseif (array_key_exists('tempo_min', $data)) {
            $tipoTroca->tempo_h = ((float) $data['tempo_min']) / 60.0;
        }
        if (array_key_exists('ativo', $data)) {
            $tipoTroca->ativo = (bool) $data['ativo'];
        }
        if (array_key_exists('ordem', $data)) {
            $tipoTroca->ordem = (int) $data['ordem'];
        }
        $tipoTroca->save();
        $para = $this->tipoTrocaOut($tipoTroca->fresh());
        $this->audit->log('orc_catalogo.tipo_troca.atualizar', 'orc_catalogo_tipo_troca', $tipoTroca->id, $de, $para);

        return $para;
    }

    /** @return list<array<string, mixed>> */
    public function listMaquinas(bool $incluirInativos = true): array
    {
        $q = OrcCatalogoMaquina::query()->with('tarifas')->orderBy('ordem')->orderBy('nome');
        if (! $incluirInativos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (OrcCatalogoMaquina $m) => $this->maquinaOut($m))->all();
    }

    /** @param  array<string, mixed>  $data */
    public function createMaquina(array $data): array
    {
        $nome = OrcamentoCatalogo::norm((string) $data['nome']);
        if (OrcCatalogoMaquina::query()->where('nome', $nome)->exists()) {
            throw ValidationException::withMessages(['nome' => 'Já existe máquina com este nome.']);
        }

        return DB::transaction(function () use ($nome, $data) {
            $maq = OrcCatalogoMaquina::query()->create([
                'nome' => $nome,
                'ativo' => (bool) ($data['ativo'] ?? true),
                'ordem' => (int) ($data['ordem'] ?? ((int) OrcCatalogoMaquina::query()->max('ordem') + 1)),
            ]);
            $tarifas = is_array($data['tarifas'] ?? null) ? $data['tarifas'] : [];
            $this->syncTarifas($maq, $tarifas);
            $maq->load('tarifas');
            $out = $this->maquinaOut($maq);
            $this->audit->log('orc_catalogo.maquina.criar', 'orc_catalogo_maquina', $maq->id, null, $out);

            return $out;
        });
    }

    /** @param  array<string, mixed>  $data */
    public function updateMaquina(OrcCatalogoMaquina $maquina, array $data): array
    {
        $de = $this->maquinaOut($maquina->loadMissing('tarifas'));

        return DB::transaction(function () use ($maquina, $data, $de) {
            if (array_key_exists('nome', $data)) {
                $nome = OrcamentoCatalogo::norm((string) $data['nome']);
                if (
                    OrcCatalogoMaquina::query()
                        ->where('nome', $nome)
                        ->where('id', '!=', $maquina->id)
                        ->exists()
                ) {
                    throw ValidationException::withMessages(['nome' => 'Já existe máquina com este nome.']);
                }
                $maquina->nome = $nome;
            }
            if (array_key_exists('ativo', $data)) {
                $maquina->ativo = (bool) $data['ativo'];
            }
            if (array_key_exists('ordem', $data)) {
                $maquina->ordem = (int) $data['ordem'];
            }
            $maquina->save();
            if (array_key_exists('tarifas', $data) && is_array($data['tarifas'])) {
                $this->syncTarifas($maquina, $data['tarifas']);
            }
            $maquina->load('tarifas');
            $para = $this->maquinaOut($maquina);
            $this->audit->log('orc_catalogo.maquina.atualizar', 'orc_catalogo_maquina', $maquina->id, $de, $para);

            return $para;
        });
    }

    public function tablesReady(): bool
    {
        return Schema::hasTable('orc_catalogo_papeis')
            && Schema::hasTable('orc_catalogo_acabamentos')
            && Schema::hasTable('orc_catalogo_tipos_troca')
            && Schema::hasTable('orc_catalogo_maquinas')
            && Schema::hasTable('orc_catalogo_hora_maquina');
    }

    /**
     * @param  array<string|int, mixed>  $tarifas  cores => R$/h
     */
    private function syncTarifas(OrcCatalogoMaquina $maquina, array $tarifas): void
    {
        $keep = [];
        foreach ($tarifas as $cores => $tarifa) {
            if ($tarifa === null || $tarifa === '') {
                continue;
            }
            $coresKey = trim((string) $cores);
            if ($coresKey === '') {
                continue;
            }
            OrcCatalogoHoraMaquina::query()->updateOrCreate(
                ['maquina_id' => $maquina->id, 'cores' => $coresKey],
                ['tarifa' => (float) $tarifa],
            );
            $keep[] = $coresKey;
        }
        if ($keep !== []) {
            OrcCatalogoHoraMaquina::query()
                ->where('maquina_id', $maquina->id)
                ->whereNotIn('cores', $keep)
                ->delete();
        }
    }

    /** @return array<string, mixed> */
    private function papelOut(OrcCatalogoPapel $p): array
    {
        return [
            'id' => $p->id,
            'nome' => $p->nome,
            'preco_m2' => (float) $p->preco_m2,
            'ativo' => (bool) $p->ativo,
            'ordem' => (int) $p->ordem,
            'updated_at' => $p->updated_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function acabamentoOut(OrcCatalogoAcabamento $a): array
    {
        return [
            'id' => $a->id,
            'nome' => $a->nome,
            'preco_m2' => (float) $a->preco_m2,
            'perda_m2' => (float) $a->perda_m2,
            'ativo' => (bool) $a->ativo,
            'ordem' => (int) $a->ordem,
            'eh_rebobinacao' => $a->nome === 'REBOBINAÇÃO',
            'updated_at' => $a->updated_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function tipoTrocaOut(OrcCatalogoTipoTroca $t): array
    {
        $tempoH = (float) $t->tempo_h;

        return [
            'id' => $t->id,
            'tipo' => $t->tipo,
            'tempo_h' => $tempoH,
            'tempo_min' => round($tempoH * 60, 2),
            'ativo' => (bool) $t->ativo,
            'ordem' => (int) $t->ordem,
            'updated_at' => $t->updated_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function maquinaOut(OrcCatalogoMaquina $m): array
    {
        $tarifas = [];
        foreach ($m->tarifas as $t) {
            $tarifas[$t->cores] = (float) $t->tarifa;
        }
        ksort($tarifas, SORT_NATURAL);

        return [
            'id' => $m->id,
            'nome' => $m->nome,
            'ativo' => (bool) $m->ativo,
            'ordem' => (int) $m->ordem,
            'tarifas' => $tarifas,
            'updated_at' => $m->updated_at?->toISOString(),
        ];
    }
}
