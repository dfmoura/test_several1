<?php

namespace App\Services\Comercial\Orcamento;

use App\Models\OrcCatalogoAcabamento;
use App\Models\OrcCatalogoEstrutura;
use App\Models\OrcCatalogoHoraMaquina;
use App\Models\OrcCatalogoMaquina;
use App\Models\OrcCatalogoPapel;
use App\Models\OrcCatalogoParametro;
use App\Models\OrcCatalogoTipoTroca;
use App\Services\Audit\AuditLogger;
use App\Support\CatalogoOrcEmpresa;
use App\Support\PadraoDecimal;
use Illuminate\Database\Eloquent\Builder;
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
     *   matriz_cm2: float,
     *   matriz_cm2_fonte: string,
     *   fonte: string,
     *   nota: string
     * }
     */
    public function resumo(): array
    {
        $hasDb = $this->tablesReady() && $this->scoped(OrcCatalogoPapel::query())->exists();
        $cat = OrcamentoCatalogo::load();
        $matrizFromDb = Schema::hasTable('orc_catalogo_parametros')
            && $this->scoped(OrcCatalogoParametro::query())
                ->where('chave', OrcCatalogoParametro::CHAVE_MATRIZ_CM2)
                ->where('ativo', true)
                ->exists();

        return [
            'papeis' => $this->scoped(OrcCatalogoPapel::query())->count(),
            'acabamentos' => $this->scoped(OrcCatalogoAcabamento::query())->count(),
            'tipos_troca' => $this->scoped(OrcCatalogoTipoTroca::query())->count(),
            'maquinas' => $this->scoped(OrcCatalogoMaquina::query())->count(),
            'parametros' => Schema::hasTable('orc_catalogo_parametros')
                ? $this->scoped(OrcCatalogoParametro::query())->count()
                : 0,
            'estruturas' => Schema::hasTable('orc_catalogo_estruturas')
                ? $this->scoped(OrcCatalogoEstrutura::query())->count()
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
    public function seedFromJson(?string $path = null, bool $forceOverwrite = false, ?int $empresaId = null): array
    {
        $path ??= resource_path('data/orcamento/catalog_oficial.json');
        $raw = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        $empresaId ??= CatalogoOrcEmpresa::id();

        $criados = [
            'papeis' => 0,
            'acabamentos' => 0,
            'tipos_troca' => 0,
            'maquinas' => 0,
            'tarifas' => 0,
            'parametros' => 0,
            'estruturas' => 0,
        ];
        $existentes = [
            'papeis' => 0,
            'acabamentos' => 0,
            'tipos_troca' => 0,
            'maquinas' => 0,
            'tarifas' => 0,
            'parametros' => 0,
            'estruturas' => 0,
        ];

        DB::transaction(function () use ($raw, $forceOverwrite, $empresaId, &$criados, &$existentes) {
            if (Schema::hasTable('orc_catalogo_parametros')) {
                $meta = OrcCatalogoParametro::metaConhecidas();
                $tinta = is_array($raw['tinta'] ?? null) ? $raw['tinta'] : [];
                $tubete = is_array($raw['tubete'] ?? null) ? $raw['tubete'] : [];
                $perda03 = is_array($raw['perda_papel_0_3'] ?? null) ? $raw['perda_papel_0_3'] : [];

                $valoresJson = [
                    OrcCatalogoParametro::CHAVE_MATRIZ_CM2 => (float) ($raw['matriz_cm2'] ?? $meta[OrcCatalogoParametro::CHAVE_MATRIZ_CM2]['default']),
                    OrcCatalogoParametro::CHAVE_SETUP_HORAS => (float) ($raw['setup_horas'] ?? $meta[OrcCatalogoParametro::CHAVE_SETUP_HORAS]['default']),
                    OrcCatalogoParametro::CHAVE_LIMITE_METRAGEM_BOBINA => (float) ($raw['limite_metragem_bobina'] ?? $meta[OrcCatalogoParametro::CHAVE_LIMITE_METRAGEM_BOBINA]['default']),
                    OrcCatalogoParametro::CHAVE_MINUTOS_TROCA_BOBINA => (float) ($raw['minutos_troca_bobina'] ?? $meta[OrcCatalogoParametro::CHAVE_MINUTOS_TROCA_BOBINA]['default']),
                    OrcCatalogoParametro::CHAVE_CEILING_ETIQUETA => (float) ($raw['ceiling_etiqueta'] ?? $meta[OrcCatalogoParametro::CHAVE_CEILING_ETIQUETA]['default']),
                    OrcCatalogoParametro::CHAVE_PRECO_CAIXA => (float) ($raw['preco_caixa'] ?? $meta[OrcCatalogoParametro::CHAVE_PRECO_CAIXA]['default']),
                    OrcCatalogoParametro::CHAVE_TINTA_FAIXA_M2 => (float) ($tinta['faixa_m2'] ?? $meta[OrcCatalogoParametro::CHAVE_TINTA_FAIXA_M2]['default']),
                    OrcCatalogoParametro::CHAVE_TINTA_ATE_30_POR_COR => (float) ($tinta['valor_ate_30_por_cor'] ?? $meta[OrcCatalogoParametro::CHAVE_TINTA_ATE_30_POR_COR]['default']),
                    OrcCatalogoParametro::CHAVE_TINTA_ACIMA_M2 => (float) ($tinta['valor_acima_m2'] ?? $meta[OrcCatalogoParametro::CHAVE_TINTA_ACIMA_M2]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_F6 => (float) ($raw['perda_papel_f6'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_PAPEL_F6]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_4V => (float) ($raw['perda_acerto_m_4v'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_4V]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_5 => (float) ($raw['perda_acerto_m_5'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_5]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_6 => (float) ($raw['perda_acerto_m_6'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_6]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_7 => (float) ($raw['perda_acerto_m_7'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_7]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_8 => (float) ($raw['perda_acerto_m_8'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_8]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_0 => (float) ($perda03['0'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_PAPEL_0]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_1 => (float) ($perda03['1'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_PAPEL_1]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_2 => (float) ($perda03['2'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_PAPEL_2]['default']),
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_3 => (float) ($perda03['3'] ?? $meta[OrcCatalogoParametro::CHAVE_PERDA_PAPEL_3]['default']),
                    OrcCatalogoParametro::CHAVE_TUBETE_1 => (float) ($tubete['1"'] ?? $meta[OrcCatalogoParametro::CHAVE_TUBETE_1]['default']),
                    OrcCatalogoParametro::CHAVE_TUBETE_1_5 => (float) ($tubete['1" 1/2'] ?? $meta[OrcCatalogoParametro::CHAVE_TUBETE_1_5]['default']),
                    OrcCatalogoParametro::CHAVE_TUBETE_3 => (float) ($tubete['3"'] ?? $meta[OrcCatalogoParametro::CHAVE_TUBETE_3]['default']),
                ];

                foreach ($meta as $chave => $def) {
                    $valor = $valoresJson[$chave] ?? $def['default'];
                    $row = $this->scoped(OrcCatalogoParametro::query(), $empresaId)->where('chave', $chave)->first();
                    if ($row) {
                        $existentes['parametros']++;
                        if ($forceOverwrite) {
                            $row->update([
                                'valor' => $valor,
                                'rotulo' => $def['rotulo'],
                                'unidade' => $def['unidade'],
                                'ativo' => $def['ativo'],
                                'ordem' => $def['ordem'],
                            ]);
                        }
                        continue;
                    }
                    OrcCatalogoParametro::query()->create([
                        'empresa_id' => $empresaId,
                        'chave' => $chave,
                        'valor' => $valor,
                        'rotulo' => $def['rotulo'],
                        'unidade' => $def['unidade'],
                        'ativo' => $def['ativo'],
                        'ordem' => $def['ordem'],
                    ]);
                    $criados['parametros']++;
                }
            }

            if (Schema::hasTable('orc_catalogo_estruturas')) {
                foreach ($this->estruturasPayloadFromRaw($raw) as $chave => $payload) {
                    if ($payload === null || $payload === []) {
                        continue;
                    }
                    $row = $this->scoped(OrcCatalogoEstrutura::query(), $empresaId)->where('chave', $chave)->first();
                    if ($row) {
                        $existentes['estruturas']++;
                        if ($forceOverwrite) {
                            $row->update(['payload' => $payload]);
                        }
                        continue;
                    }
                    OrcCatalogoEstrutura::query()->create([
                        'empresa_id' => $empresaId,
                        'chave' => $chave,
                        'payload' => $payload,
                    ]);
                    $criados['estruturas']++;
                }
            }
            $ordem = 0;
            foreach ($raw['papel'] ?? [] as $nome => $preco) {
                $nome = OrcamentoCatalogo::norm((string) $nome);
                $row = $this->scoped(OrcCatalogoPapel::query(), $empresaId)->where('nome', $nome)->first();
                if ($row) {
                    $existentes['papeis']++;
                    if ($forceOverwrite) {
                        $row->update(['preco_m2' => (float) $preco, 'ativo' => true]);
                    }
                    continue;
                }
                OrcCatalogoPapel::query()->create([
                    'empresa_id' => $empresaId,
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
                $row = $this->scoped(OrcCatalogoAcabamento::query(), $empresaId)->where('nome', $nome)->first();
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
                    'empresa_id' => $empresaId,
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
                $row = $this->scoped(OrcCatalogoTipoTroca::query(), $empresaId)->where('tipo', $tipo)->first();
                if ($row) {
                    $existentes['tipos_troca']++;
                    if ($forceOverwrite) {
                        $row->update(['tempo_h' => (float) $tempo, 'ativo' => true]);
                    }
                    continue;
                }
                OrcCatalogoTipoTroca::query()->create([
                    'empresa_id' => $empresaId,
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
                $maq = $this->scoped(OrcCatalogoMaquina::query(), $empresaId)->where('nome', $nome)->first();
                if (! $maq) {
                    $maq = OrcCatalogoMaquina::query()->create([
                        'empresa_id' => $empresaId,
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
        $q = $this->scoped(OrcCatalogoPapel::query())->orderBy('ordem')->orderBy('nome');
        if (! $incluirInativos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (OrcCatalogoPapel $p) => $this->papelOut($p))->all();
    }

    /** @param  array<string, mixed>  $data */
    public function createPapel(array $data): array
    {
        $nome = OrcamentoCatalogo::norm((string) $data['nome']);
        if ($this->scoped(OrcCatalogoPapel::query())->where('nome', $nome)->exists()) {
            throw ValidationException::withMessages(['nome' => 'Já existe papel com este nome.']);
        }
        $papel = OrcCatalogoPapel::query()->create([
            'empresa_id' => $this->empresaId(),
            'nome' => $nome,
            'preco_m2' => (float) $data['preco_m2'],
            'ativo' => (bool) ($data['ativo'] ?? true),
            'ordem' => (int) ($data['ordem'] ?? ((int) $this->scoped(OrcCatalogoPapel::query())->max('ordem') + 1)),
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
                $this->scoped(OrcCatalogoPapel::query())
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
        $q = $this->scoped(OrcCatalogoAcabamento::query())->orderBy('ordem')->orderBy('nome');
        if (! $incluirInativos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (OrcCatalogoAcabamento $a) => $this->acabamentoOut($a))->all();
    }

    /** @param  array<string, mixed>  $data */
    public function createAcabamento(array $data): array
    {
        $nome = OrcamentoCatalogo::norm((string) $data['nome']);
        if ($this->scoped(OrcCatalogoAcabamento::query())->where('nome', $nome)->exists()) {
            throw ValidationException::withMessages(['nome' => 'Já existe acabamento com este nome.']);
        }
        $row = OrcCatalogoAcabamento::query()->create([
            'empresa_id' => $this->empresaId(),
            'nome' => $nome,
            'preco_m2' => (float) $data['preco_m2'],
            'perda_m2' => (float) ($data['perda_m2'] ?? 0),
            'ativo' => (bool) ($data['ativo'] ?? true),
            'ordem' => (int) ($data['ordem'] ?? ((int) $this->scoped(OrcCatalogoAcabamento::query())->max('ordem') + 1)),
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
                $this->scoped(OrcCatalogoAcabamento::query())
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
        $q = $this->scoped(OrcCatalogoTipoTroca::query())->orderBy('ordem')->orderBy('tipo');
        if (! $incluirInativos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (OrcCatalogoTipoTroca $t) => $this->tipoTrocaOut($t))->all();
    }

    /** @param  array<string, mixed>  $data */
    public function createTipoTroca(array $data): array
    {
        $tipo = OrcamentoCatalogo::norm((string) $data['tipo']);
        if ($this->scoped(OrcCatalogoTipoTroca::query())->where('tipo', $tipo)->exists()) {
            throw ValidationException::withMessages(['tipo' => 'Já existe tipo de troca com este nome.']);
        }
        $tempoH = array_key_exists('tempo_h', $data)
            ? (float) $data['tempo_h']
            : ((float) ($data['tempo_min'] ?? 0) / 60.0);
        $row = OrcCatalogoTipoTroca::query()->create([
            'empresa_id' => $this->empresaId(),
            'tipo' => $tipo,
            'tempo_h' => $tempoH,
            'ativo' => (bool) ($data['ativo'] ?? true),
            'ordem' => (int) ($data['ordem'] ?? ((int) $this->scoped(OrcCatalogoTipoTroca::query())->max('ordem') + 1)),
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
                $this->scoped(OrcCatalogoTipoTroca::query())
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
        $q = $this->scoped(OrcCatalogoMaquina::query())
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

    /**
     * Find-or-create do grupo G10 no escopo da EMP. Uso: patrimônio (origem da máquina física).
     * Não altera tarifas de grupo já existente.
     */
    public function ensureGrupoHoraMaquina(string $nome): OrcCatalogoMaquina
    {
        $nome = mb_strtoupper(OrcamentoCatalogo::norm($nome), 'UTF-8');
        if ($nome === '') {
            throw ValidationException::withMessages([
                'grupo_hora_maquina_nome' => ['Informe o nome do grupo hora-máquina.'],
            ]);
        }

        $existente = $this->scoped(OrcCatalogoMaquina::query())->where('nome', $nome)->first();
        if ($existente) {
            return $existente;
        }

        $this->createMaquina(['nome' => $nome, 'tarifas' => []]);

        return $this->scoped(OrcCatalogoMaquina::query())->where('nome', $nome)->firstOrFail();
    }

    /** @param  array<string, mixed>  $data */
    public function createMaquina(array $data): array
    {
        $nome = mb_strtoupper(OrcamentoCatalogo::norm((string) $data['nome']), 'UTF-8');
        if ($this->scoped(OrcCatalogoMaquina::query())->where('nome', $nome)->exists()) {
            throw ValidationException::withMessages(['nome' => 'Já existe grupo hora-máquina com este nome.']);
        }

        return DB::transaction(function () use ($nome, $data) {
            $maq = OrcCatalogoMaquina::query()->create([
                'empresa_id' => $this->empresaId(),
                'nome' => $nome,
                'ativo' => (bool) ($data['ativo'] ?? true),
                'ordem' => (int) ($data['ordem'] ?? ((int) $this->scoped(OrcCatalogoMaquina::query())->max('ordem') + 1)),
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
            && Schema::hasTable('orc_catalogo_estruturas');
    }

    /** @return list<array<string, mixed>> */
    public function listEstruturas(): array
    {
        if (! Schema::hasTable('orc_catalogo_estruturas')) {
            return [];
        }

        $jsonFallback = $this->estruturasPayloadFromRaw(
            json_decode((string) file_get_contents(resource_path('data/orcamento/catalog_oficial.json')), true, 512, JSON_THROW_ON_ERROR),
        );

        $out = [];
        foreach (OrcCatalogoEstrutura::CHAVES_CONHECIDAS as $chave) {
            $row = $this->scoped(OrcCatalogoEstrutura::query())->where('chave', $chave)->first();
            if ($row) {
                $out[] = $this->estruturaOut($row, 'database');
            } else {
                $out[] = [
                    'chave' => $chave,
                    'payload' => $jsonFallback[$chave] ?? null,
                    'fonte' => 'json_fallback',
                    'updated_at' => null,
                ];
            }
        }

        return $out;
    }

    /** @param  array<string, mixed>  $data */
    public function updateEstrutura(string $chave, array $data): array
    {
        if (! in_array($chave, OrcCatalogoEstrutura::CHAVES_CONHECIDAS, true)) {
            throw ValidationException::withMessages(['chave' => ['Estrutura desconhecida.']]);
        }
        if (! isset($data['payload']) || ! is_array($data['payload'])) {
            throw ValidationException::withMessages(['payload' => ['Payload inválido.']]);
        }

        $payload = $this->validateEstruturaPayload($chave, $data['payload']);
        $row = $this->scoped(OrcCatalogoEstrutura::query())->where('chave', $chave)->first();
        $de = $row ? $this->estruturaOut($row, 'database') : null;

        if ($row) {
            $row->update(['payload' => $payload]);
        } else {
            $row = OrcCatalogoEstrutura::query()->create([
                'empresa_id' => $this->empresaId(),
                'chave' => $chave,
                'payload' => $payload,
            ]);
        }

        $para = $this->estruturaOut($row->fresh(), 'database');
        $this->audit->log('orc_catalogo.estrutura.atualizar', 'orc_catalogo_estruturas', $row->id, $de, $para);

        return $para;
    }

    /** @return list<array<string, mixed>> */
    public function listParametros(bool $incluirInativos = true): array
    {
        if (! Schema::hasTable('orc_catalogo_parametros')) {
            return [];
        }

        $q = $this->scoped(OrcCatalogoParametro::query())->orderBy('ordem')->orderBy('chave');
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

        $param = $this->scoped(OrcCatalogoParametro::query())->where('chave', $chave)->first();
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
            'grupo' => OrcCatalogoParametro::grupoDaChave($p->chave),
            'updated_at' => $p->updated_at?->toISOString(),
        ];
    }

    /**
     * Registro de regras do motor + parâmetros vigentes da EMP.
     *
     * @return array<string, mixed>
     */
    public function regrasComParametros(): array
    {
        $base = OrcamentoMotorRegras::catalogo();
        $params = $this->listParametros(true);
        $byChave = [];
        foreach ($params as $p) {
            $byChave[$p['chave']] = $p;
        }

        $regras = [];
        foreach ($base['regras'] as $regra) {
            $vinculos = [];
            foreach ($regra['parametros'] as $chave) {
                $vinculos[] = $byChave[$chave] ?? [
                    'chave' => $chave,
                    'valor' => OrcCatalogoParametro::metaConhecidas()[$chave]['default'] ?? null,
                    'rotulo' => OrcCatalogoParametro::metaConhecidas()[$chave]['rotulo'] ?? $chave,
                    'unidade' => OrcCatalogoParametro::metaConhecidas()[$chave]['unidade'] ?? null,
                    'ativo' => false,
                    'grupo' => OrcCatalogoParametro::grupoDaChave($chave),
                    'fonte' => 'json_fallback',
                ];
            }
            $regras[] = array_merge($regra, ['parametros_vigentes' => $vinculos]);
        }

        $cat = OrcamentoCatalogo::load();

        return [
            'motor_version' => $base['motor_version'],
            'regras' => $regras,
            'constantes_estruturais' => $base['constantes_estruturais'],
            'parametros' => $params,
            'vigente' => [
                'matriz_cm2' => $cat->matrizCm2,
                'setup_horas' => $cat->setupHoras,
                'limite_metragem_bobina' => $cat->limiteMetragemBobina,
                'minutos_troca_bobina' => $cat->minutosTrocaBobina,
                'ceiling_etiqueta' => $cat->ceilingEtiqueta,
                'preco_caixa' => $cat->precoCaixa,
                'tinta_faixa_m2' => $cat->tintaFaixaM2,
                'tinta_valor_ate_30_por_cor' => $cat->tintaAte30PorCor,
                'tinta_valor_acima_m2' => $cat->tintaAcimaM2,
            ],
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

    private function empresaId(): ?int
    {
        return CatalogoOrcEmpresa::id();
    }

    private function scoped(Builder $query, ?int $empresaId = null): Builder
    {
        return CatalogoOrcEmpresa::apply($query, $empresaId ?? $this->empresaId(), false);
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, array<string, mixed>|list<mixed>|null>
     */
    private function estruturasPayloadFromRaw(array $raw): array
    {
        $tinta = is_array($raw['tinta_matriz'] ?? null)
            ? OrcamentoCatalogo::normalizeTintaMatrizPayload($raw['tinta_matriz'])
            : null;

        $perda = is_array($raw['perda_troca_m2_fator'] ?? null)
            ? OrcamentoCatalogo::normalizePerdaTrocaPayload($raw['perda_troca_m2_fator'])
            : [];

        $caixa = is_array($raw['caixa_empacotamento'] ?? null)
            ? OrcamentoCatalogo::normalizeCaixaEmpacotamentoPayload($raw['caixa_empacotamento'])
            : [];

        return [
            OrcCatalogoEstrutura::CHAVE_TINTA_MATRIZ => $tinta,
            OrcCatalogoEstrutura::CHAVE_PERDA_TROCA_M2_FATOR => $perda !== [] ? $perda : null,
            OrcCatalogoEstrutura::CHAVE_CAIXA_EMPACOTAMENTO => $caixa !== [] ? $caixa : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function validateEstruturaPayload(string $chave, array $payload): array
    {
        return match ($chave) {
            OrcCatalogoEstrutura::CHAVE_TINTA_MATRIZ => $this->validateTintaMatrizPayload($payload),
            OrcCatalogoEstrutura::CHAVE_PERDA_TROCA_M2_FATOR => $this->validatePerdaTrocaPayload($payload),
            OrcCatalogoEstrutura::CHAVE_CAIXA_EMPACOTAMENTO => $this->validateCaixaEmpacotamentoPayload($payload),
            default => throw ValidationException::withMessages(['chave' => ['Estrutura desconhecida.']]),
        };
    }

    /** @param  array<string, mixed>  $payload
     * @return array{thresholds: list<float>, rates: array<string, list<float>>}
     */
    private function validateTintaMatrizPayload(array $payload): array
    {
        $normalized = OrcamentoCatalogo::normalizeTintaMatrizPayload($payload);
        if ($normalized === null) {
            throw ValidationException::withMessages([
                'payload' => ['Matriz de tinta inválida: thresholds e rates (1–4) devem ter o mesmo tamanho.'],
            ]);
        }
        foreach ($normalized['thresholds'] as $i => $t) {
            if ($t < 0) {
                throw ValidationException::withMessages(['payload' => ["Threshold #{$i} inválido."]]);
            }
        }
        foreach ($normalized['rates'] as $col => $vals) {
            $colKey = (string) $col;
            if (! in_array($colKey, ['1', '2', '3', '4'], true)) {
                throw ValidationException::withMessages(['payload' => ["Coluna de cores inválida: {$colKey}."]]);
            }
            foreach ($vals as $rate) {
                if ($rate < 0) {
                    throw ValidationException::withMessages(['payload' => ['Tarifa R$/m² não pode ser negativa.']]);
                }
            }
        }

        return $normalized;
    }

    /** @param  array<string, mixed>  $payload
     * @return array<string, float>
     */
    private function validatePerdaTrocaPayload(array $payload): array
    {
        $normalized = OrcamentoCatalogo::normalizePerdaTrocaPayload($payload);
        if ($normalized === []) {
            throw ValidationException::withMessages(['payload' => ['Informe ao menos um fator de troca produto.']]);
        }
        foreach ($normalized as $cores => $fator) {
            if ($fator < 0) {
                throw ValidationException::withMessages(['payload' => ["Fator inválido para {$cores} cores."]]);
            }
        }

        return $normalized;
    }

    /** @param  array<string, mixed>  $payload
     * @return array<string, array<string, mixed>>
     */
    private function validateCaixaEmpacotamentoPayload(array $payload): array
    {
        $normalized = OrcamentoCatalogo::normalizeCaixaEmpacotamentoPayload($payload);
        if ($normalized === []) {
            throw ValidationException::withMessages(['payload' => ['Informe rolos por caixa para ao menos um tubete.']]);
        }

        return $normalized;
    }

    /** @return array<string, mixed> */
    private function estruturaOut(OrcCatalogoEstrutura $row, string $fonte): array
    {
        return [
            'id' => $row->id,
            'chave' => $row->chave,
            'payload' => $row->payload,
            'fonte' => $fonte,
            'updated_at' => $row->updated_at?->toISOString(),
        ];
    }
}
