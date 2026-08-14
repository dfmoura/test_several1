<?php

namespace App\Services\Comercial\Orcamento;

use App\Models\OrcCatalogoAcabamento;
use App\Models\OrcCatalogoFaixaFrete;
use App\Models\OrcCatalogoHoraMaquina;
use App\Models\OrcCatalogoMaquina;
use App\Models\OrcCatalogoPapel;
use App\Models\OrcCatalogoParametro;
use App\Models\OrcCatalogoTipoTroca;
use App\Services\Audit\AuditLogger;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * CRUD das bases editáveis do catálogo ORC (estudo 32) + escalares (matriz_cm2).
 * Seed idempotente a partir do catalog_oficial.json — nunca sobrescreve valores já editados.
 */
class OrcamentoCatalogoAdminService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @return array{
     *   papeis: int,
     *   acabamentos: int,
     *   tipos_troca: int,
     *   maquinas: int,
     *   parametros: int,
     *   faixas_frete: int,
     *   matriz_cm2: float,
     *   matriz_cm2_fonte: string,
     *   fonte: string,
     *   nota: string
     * }
     */
    public function resumo(): array
    {
        $hasDb = $this->tablesReady() && OrcCatalogoPapel::query()->exists();
        $cat = OrcamentoCatalogo::load();
        $matrizFromDb = Schema::hasTable('orc_catalogo_parametros')
            && OrcCatalogoParametro::query()
                ->where('chave', OrcCatalogoParametro::CHAVE_MATRIZ_CM2)
                ->where('ativo', true)
                ->exists();

        return [
            'papeis' => OrcCatalogoPapel::query()->count(),
            'acabamentos' => OrcCatalogoAcabamento::query()->count(),
            'tipos_troca' => OrcCatalogoTipoTroca::query()->count(),
            'maquinas' => OrcCatalogoMaquina::query()->count(),
            'parametros' => Schema::hasTable('orc_catalogo_parametros')
                ? OrcCatalogoParametro::query()->count()
                : 0,
            'faixas_frete' => Schema::hasTable('orc_catalogo_faixas_frete')
                ? OrcCatalogoFaixaFrete::query()->count()
                : 0,
            'matriz_cm2' => $cat->matrizCm2,
            'matriz_cm2_fonte' => $matrizFromDb ? 'database' : 'json_fallback',
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

        $criados = [
            'papeis' => 0,
            'acabamentos' => 0,
            'tipos_troca' => 0,
            'maquinas' => 0,
            'tarifas' => 0,
            'parametros' => 0,
            'faixas_frete' => 0,
        ];
        $existentes = [
            'papeis' => 0,
            'acabamentos' => 0,
            'tipos_troca' => 0,
            'maquinas' => 0,
            'tarifas' => 0,
            'parametros' => 0,
            'faixas_frete' => 0,
        ];

        DB::transaction(function () use ($raw, $forceOverwrite, &$criados, &$existentes) {
            if (Schema::hasTable('orc_catalogo_parametros')) {
                $defs = [
                    OrcCatalogoParametro::CHAVE_MATRIZ_CM2 => [
                        'valor' => (float) ($raw['matriz_cm2'] ?? 0.28),
                        'rotulo' => 'Matriz / clichê',
                        'unidade' => 'R$/cm²',
                        'ordem' => 10,
                        'ativo' => true,
                    ],
                    OrcCatalogoParametro::CHAVE_PESO_CAIXA_KG => [
                        'valor' => 0,
                        'rotulo' => 'Peso estimado por caixa',
                        'unidade' => 'kg',
                        'ordem' => 20,
                        'ativo' => false,
                    ],
                ];
                foreach ($defs as $chave => $def) {
                    $row = OrcCatalogoParametro::query()->where('chave', $chave)->first();
                    if ($row) {
                        $existentes['parametros']++;
                        if ($forceOverwrite) {
                            $row->update([
                                'valor' => $def['valor'],
                                'rotulo' => $def['rotulo'],
                                'unidade' => $def['unidade'],
                                'ativo' => $def['ativo'],
                                'ordem' => $def['ordem'],
                            ]);
                        }
                        continue;
                    }
                    OrcCatalogoParametro::query()->create([
                        'chave' => $chave,
                        'valor' => $def['valor'],
                        'rotulo' => $def['rotulo'],
                        'unidade' => $def['unidade'],
                        'ativo' => $def['ativo'],
                        'ordem' => $def['ordem'],
                    ]);
                    $criados['parametros']++;
                }
            }

            if (Schema::hasTable('orc_catalogo_faixas_frete')) {
                foreach (OrcCatalogoFaixaFrete::SEED_KG_ATE as $i => $kgAte) {
                    $q = OrcCatalogoFaixaFrete::query();
                    if ($kgAte === null) {
                        $q->whereNull('kg_ate');
                    } else {
                        $q->where('kg_ate', $kgAte);
                    }
                    $row = $q->first();
                    if ($row) {
                        $existentes['faixas_frete']++;
                        if ($forceOverwrite) {
                            $row->update([
                                'preco_por_km' => null,
                                'minimo_rs' => null,
                                'ativo' => false,
                                'ordem' => ($i + 1) * 10,
                            ]);
                        }
                        continue;
                    }
                    OrcCatalogoFaixaFrete::query()->create([
                        'kg_ate' => $kgAte,
                        'preco_por_km' => null,
                        'minimo_rs' => null,
                        'ativo' => false,
                        'ordem' => ($i + 1) * 10,
                    ]);
                    $criados['faixas_frete']++;
                }
            }

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
    public function listMaquinas(bool $incluirInativos = true, ?int $empresaId = null): array
    {
        $q = OrcCatalogoMaquina::query()
            ->with([
                'tarifas',
                'bensPatrimoniais' => function ($rel) use ($empresaId) {
                    if ($empresaId === null) {
                        $rel->whereRaw('0 = 1');

                        return;
                    }
                    $rel->where('empresa_id', $empresaId)
                        ->orderBy('codigo')
                        ->select(['id', 'empresa_id', 'codigo', 'descricao', 'status', 'orc_catalogo_maquina_id']);
                },
            ])
            ->orderBy('ordem')
            ->orderBy('nome');
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
            && Schema::hasTable('orc_catalogo_hora_maquina')
            && Schema::hasTable('orc_catalogo_parametros')
            && Schema::hasTable('orc_catalogo_faixas_frete');
    }

    /** @return list<array<string, mixed>> */
    public function listParametros(bool $incluirInativos = true): array
    {
        if (! Schema::hasTable('orc_catalogo_parametros')) {
            return [];
        }

        $q = OrcCatalogoParametro::query()->orderBy('ordem')->orderBy('chave');
        if (! $incluirInativos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (OrcCatalogoParametro $p) => $this->parametroOut($p))->all();
    }

    /** @param  array<string, mixed>  $data */
    public function updateParametro(string $chave, array $data): array
    {
        if (! in_array($chave, OrcCatalogoParametro::CHAVES_CONHECIDAS, true)) {
            throw ValidationException::withMessages([
                'chave' => ['Parâmetro desconhecido ou ainda não promovido ao catálogo.'],
            ]);
        }

        $param = OrcCatalogoParametro::query()->where('chave', $chave)->first();
        if (! $param) {
            throw ValidationException::withMessages([
                'chave' => ['Parâmetro ainda não semeado. Execute o seed do catálogo ORC.'],
            ]);
        }

        $de = $this->parametroOut($param);
        if (array_key_exists('valor', $data) && $data['valor'] !== null) {
            $param->valor = (float) $data['valor'];
        }
        if (array_key_exists('ativo', $data)) {
            $param->ativo = (bool) $data['ativo'];
        }
        if (array_key_exists('rotulo', $data) && $data['rotulo'] !== null) {
            $param->rotulo = (string) $data['rotulo'];
        }
        if (array_key_exists('unidade', $data) && $data['unidade'] !== null) {
            $param->unidade = (string) $data['unidade'];
        }
        if (array_key_exists('ordem', $data) && $data['ordem'] !== null) {
            $param->ordem = (int) $data['ordem'];
        }
        $param->save();
        $para = $this->parametroOut($param);
        $this->audit->log('orc_catalogo.parametro.atualizar', 'orc_catalogo_parametro', $param->id, $de, $para);

        return $para;
    }

    /** @return list<array<string, mixed>> */
    public function listFaixasFrete(bool $incluirInativos = true): array
    {
        if (! Schema::hasTable('orc_catalogo_faixas_frete')) {
            return [];
        }

        $q = OrcCatalogoFaixaFrete::query()
            ->orderByRaw('kg_ate is null')
            ->orderBy('kg_ate')
            ->orderBy('ordem');
        if (! $incluirInativos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (OrcCatalogoFaixaFrete $f) => $this->faixaFreteOut($f))->all();
    }

    /** @param  array<string, mixed>  $data */
    public function createFaixaFrete(array $data): array
    {
        $payload = $this->normalizeFaixaFretePayload($data, null);
        $this->assertFaixasContinuas(null, $payload);
        $row = OrcCatalogoFaixaFrete::query()->create($payload);
        $this->audit->log('orc_catalogo.faixa_frete.criar', 'orc_catalogo_faixa_frete', $row->id, null, $this->faixaFreteOut($row));

        return $this->faixaFreteOut($row);
    }

    /** @param  array<string, mixed>  $data */
    public function updateFaixaFrete(OrcCatalogoFaixaFrete $faixa, array $data): array
    {
        $de = $this->faixaFreteOut($faixa);
        $payload = $this->normalizeFaixaFretePayload($data, $faixa);
        $merged = array_merge([
            'kg_ate' => $faixa->kg_ate,
            'preco_por_km' => $faixa->preco_por_km,
            'minimo_rs' => $faixa->minimo_rs,
            'ativo' => (bool) $faixa->ativo,
            'ordem' => (int) $faixa->ordem,
        ], $payload);
        $this->assertFaixasContinuas($faixa->id, $merged);
        $faixa->fill($payload);
        $faixa->save();
        $para = $this->faixaFreteOut($faixa->fresh());
        $this->audit->log('orc_catalogo.faixa_frete.atualizar', 'orc_catalogo_faixa_frete', $faixa->id, $de, $para);

        return $para;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeFaixaFretePayload(array $data, ?OrcCatalogoFaixaFrete $atual): array
    {
        $out = [];
        if (array_key_exists('kg_ate', $data) || $atual === null) {
            $raw = $data['kg_ate'] ?? null;
            $out['kg_ate'] = ($raw === null || $raw === '')
                ? null
                : PadraoDecimal::parseStrict($raw, PadraoDecimal::SCALE_WEIGHT);
        }
        if (array_key_exists('preco_por_km', $data) || $atual === null) {
            $raw = $data['preco_por_km'] ?? null;
            $out['preco_por_km'] = ($raw === null || $raw === '')
                ? null
                : PadraoDecimal::parseStrict($raw, PadraoDecimal::SCALE_UNIT_PRICE);
        }
        if (array_key_exists('minimo_rs', $data) || $atual === null) {
            $raw = $data['minimo_rs'] ?? null;
            $out['minimo_rs'] = ($raw === null || $raw === '')
                ? null
                : PadraoDecimal::parseStrict($raw, PadraoDecimal::SCALE_MONEY);
        }
        if (array_key_exists('ativo', $data)) {
            $out['ativo'] = (bool) $data['ativo'];
        } elseif ($atual === null) {
            $out['ativo'] = false;
        }
        if (array_key_exists('ordem', $data)) {
            $out['ordem'] = (int) $data['ordem'];
        } elseif ($atual === null) {
            $out['ordem'] = (int) OrcCatalogoFaixaFrete::query()->max('ordem') + 10;
        }

        return $out;
    }

    /**
     * Faixas contínuas: kg_ate único e estritamente crescente; no máximo um “acima” (nulo).
     *
     * @param  array<string, mixed>  $pending
     */
    private function assertFaixasContinuas(?int $ignoreId, array $pending): void
    {
        $rows = OrcCatalogoFaixaFrete::query()
            ->when($ignoreId !== null, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->get(['id', 'kg_ate'])
            ->map(fn (OrcCatalogoFaixaFrete $f) => $this->decOrNull($f->kg_ate))
            ->all();
        $rows[] = array_key_exists('kg_ate', $pending)
            ? $this->decOrNull($pending['kg_ate'] ?? null)
            : null;

        $nulls = 0;
        $finitos = [];
        foreach ($rows as $kg) {
            if ($kg === null) {
                $nulls++;
                continue;
            }
            $finitos[] = $kg;
        }
        if ($nulls > 1) {
            throw ValidationException::withMessages([
                'kg_ate' => ['Só pode haver uma faixa “acima” (kg até vazio).'],
            ]);
        }

        usort($finitos, static fn (string $a, string $b) => bccomp($a, $b, PadraoDecimal::SCALE_WEIGHT));
        for ($i = 1, $n = count($finitos); $i < $n; $i++) {
            if (bccomp($finitos[$i], $finitos[$i - 1], PadraoDecimal::SCALE_WEIGHT) <= 0) {
                throw ValidationException::withMessages([
                    'kg_ate' => ['Faixas devem ser contínuas e sem kg repetido (ex.: 20 / 50 / 100).'],
                ]);
            }
        }
    }

    private function decOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return PadraoDecimal::parse((string) $value);
    }

    /** @return array<string, mixed> */
    private function faixaFreteOut(OrcCatalogoFaixaFrete $f): array
    {
        return [
            'id' => $f->id,
            'kg_ate' => $f->kg_ate !== null && $f->kg_ate !== '' ? (string) $f->kg_ate : null,
            'preco_por_km' => $f->preco_por_km !== null && $f->preco_por_km !== '' ? (string) $f->preco_por_km : null,
            'minimo_rs' => $f->minimo_rs !== null && $f->minimo_rs !== '' ? (string) $f->minimo_rs : null,
            'ativo' => (bool) $f->ativo,
            'ordem' => (int) $f->ordem,
            'acima' => $f->isAcima(),
            'updated_at' => $f->updated_at?->toISOString(),
        ];
    }

    /** @return array<string, mixed> */
    private function parametroOut(OrcCatalogoParametro $p): array
    {
        return [
            'id' => $p->id,
            'chave' => $p->chave,
            'valor' => (float) $p->valor,
            'rotulo' => $p->rotulo,
            'unidade' => $p->unidade,
            'ativo' => (bool) $p->ativo,
            'ordem' => (int) $p->ordem,
            'updated_at' => $p->updated_at?->toISOString(),
        ];
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

        $bens = [];
        if ($m->relationLoaded('bensPatrimoniais')) {
            foreach ($m->bensPatrimoniais as $bem) {
                $bens[] = [
                    'id' => $bem->id,
                    'codigo' => $bem->codigo,
                    'descricao' => $bem->descricao,
                    'status' => $bem->status,
                ];
            }
        }

        return [
            'id' => $m->id,
            'nome' => $m->nome,
            'ativo' => (bool) $m->ativo,
            'ordem' => (int) $m->ordem,
            'tarifas' => $tarifas,
            'bens_vinculados' => $bens,
            'updated_at' => $m->updated_at?->toISOString(),
        ];
    }
}
