<?php

namespace App\Services\Cadastros;

use App\Models\BemPatrimonial;
use App\Models\Departamento;
use App\Models\Empresa;
use App\Models\OrcCatalogoMaquina;
use App\Models\ParametroEmpresa;
use App\Models\Parceiro;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use App\Support\CatalogoOrcEmpresa;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BemPatrimonialService
{
    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly DepartamentoService $departamentoService,
        private readonly OrcamentoCatalogoAdminService $catalogoOrc,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $categoria = null, ?string $status = null): array
    {
        $query = BemPatrimonial::query()
            ->with([
                'fornecedor:id,codigo,razao_social,nome_fantasia',
                'departamento:id,codigo,nome,ativo',
                'grupoHoraMaquina:id,nome,ativo',
                ...BemPatrimonial::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if ($categoria) {
            $query->where('categoria', $categoria);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('descricao', 'like', $like)
                    ->orWhere('marca', 'like', $like)
                    ->orWhere('modelo', 'like', $like)
                    ->orWhere('numero_serie', 'like', $like)
                    ->orWhere('placa', 'like', $like)
                    ->orWhere('local', 'like', $like)
                    ->orWhereHas('departamento', function ($d) use ($like) {
                        $d->where('nome', 'like', $like)->orWhere('codigo', 'like', $like);
                    });
            });
        }

        return $query->get()->map(fn (BemPatrimonial $bem) => $this->toOut($bem))->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $data = $this->resolverGrupoHoraMaquina($data);
        $this->assertRelations($empresa, $data);
        $this->assertMaquinaGraficaTemGrupo($data, required: true);
        $payload = $this->normalize($data);
        $payload = $this->applyDepartamento($empresa, $data, $payload);

        $bem = DB::transaction(function () use ($empresa, $payload) {
            $codigo = $this->codigos->nextCode(null, 'BEM');

            return BemPatrimonial::query()->create([
                ...$payload,
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'status' => $payload['status'] ?? BemPatrimonial::STATUS_ATIVO,
            ]);
        });

        $bem->load([
            'fornecedor:id,codigo,razao_social,nome_fantasia',
            'departamento:id,codigo,nome,ativo',
            'grupoHoraMaquina:id,nome,ativo',
            ...BemPatrimonial::userStampWith(),
        ]);

        return $this->toOut($bem, $this->metaCapitalizacao($empresa, $bem));
    }

    /**
     * Um BEM por grupo hora-máquina ativo da EMP. Idempotente — a empresa ajusta depois.
     *
     * @return array{criados: int, existentes: int, total: int}
     */
    public function seedModeloInicial(Empresa $empresa): array
    {
        $this->departamentoService->ensureCanonicos($empresa);

        $producaoId = Departamento::query()
            ->where('empresa_id', $empresa->id)
            ->whereRaw('LOWER(nome) = ?', [mb_strtolower('Produção')])
            ->value('id');

        $grupos = CatalogoOrcEmpresa::apply(
            OrcCatalogoMaquina::query()->where('ativo', true)->orderBy('ordem')->orderBy('nome'),
            $empresa->id,
            true,
        )->get();

        $criados = 0;
        $existentes = 0;

        foreach ($grupos as $grupo) {
            $jaTem = BemPatrimonial::query()
                ->where('empresa_id', $empresa->id)
                ->where('orc_catalogo_maquina_id', $grupo->id)
                ->exists();
            if ($jaTem) {
                $existentes++;
                continue;
            }

            $this->create($empresa, [
                'descricao' => 'Impressora '.$grupo->nome.' (modelo inicial)',
                'categoria' => BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA,
                'local' => 'Produção',
                'departamento_id' => $producaoId,
                'status' => BemPatrimonial::STATUS_ATIVO,
                'orc_catalogo_maquina_id' => $grupo->id,
                'capitalizado' => true,
                'observacao' => 'Modelo inicial: bem físico ligado ao grupo hora-máquina do catálogo ORC. Ajuste marca, série, NF e valores. Tarifas R$/h editam-se no Catálogo ORC.',
            ]);
            $criados++;
        }

        return [
            'criados' => $criados,
            'existentes' => $existentes,
            'total' => $criados + $existentes,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(BemPatrimonial $bem, array $data): array
    {
        $empresa = $bem->empresa ?? Empresa::query()->findOrFail($bem->empresa_id);
        $data = $this->resolverGrupoHoraMaquina($data);
        $this->assertRelations($empresa, $data);
        $this->assertMaquinaGraficaNoUpdate($bem, $data);
        $payload = $this->normalize($data, partial: true);
        $payload = $this->applyDepartamento($empresa, $data, $payload);

        $bem->fill($payload);
        $bem->save();
        $bem->load([
            'fornecedor:id,codigo,razao_social,nome_fantasia',
            'departamento:id,codigo,nome,ativo',
            'grupoHoraMaquina:id,nome,ativo',
            ...BemPatrimonial::userStampWith(),
        ]);

        return $this->toOut($bem, $this->metaCapitalizacao($empresa, $bem));
    }

    /**
     * @return array<string, mixed>
     */
    public function show(BemPatrimonial $bem): array
    {
        $bem->load([
            'fornecedor:id,codigo,razao_social,nome_fantasia',
            'departamento:id,codigo,nome,ativo',
            'grupoHoraMaquina:id,nome,ativo',
            ...BemPatrimonial::userStampWith(),
        ]);
        $empresa = $bem->empresa ?? Empresa::query()->findOrFail($bem->empresa_id);

        return $this->toOut($bem, $this->metaCapitalizacao($empresa, $bem));
    }

    public function softDelete(BemPatrimonial $bem): void
    {
        if (! in_array($bem->status, BemPatrimonial::STATUSES_FINAIS, true)) {
            $bem->status = BemPatrimonial::STATUS_BAIXADO;
            $bem->baixado_em = $bem->baixado_em ?? now()->toDateString();
            if (! $bem->motivo_baixa) {
                $bem->motivo_baixa = 'Removido do cadastro operacional';
            }
            $bem->save();
        }

        $bem->delete();
    }

    /**
     * @return array{valor_minimo: float, abaixo_do_minimo: bool, mensagem: string|null}
     */
    public function metaCapitalizacao(Empresa $empresa, ?BemPatrimonial $bem = null, ?float $valor = null): array
    {
        $minimo = $this->valorMinimoCapitalizar($empresa);
        $valorRef = $valor;
        if ($valorRef === null && $bem !== null && $bem->valor_aquisicao !== null) {
            $valorRef = (float) $bem->valor_aquisicao;
        }

        $abaixo = $valorRef !== null && $valorRef < $minimo;

        return [
            'valor_minimo' => $minimo,
            'abaixo_do_minimo' => $abaixo,
            'mensagem' => $abaixo
                ? sprintf(
                    'Valor abaixo do mínimo de capitalização (R$ %s). Política gerencial: tratar como despesa / não capitalizar — depreciação oficial permanece com o contador.',
                    number_format($minimo, 2, ',', '.')
                )
                : null,
        ];
    }

    /**
     * Lookup leve para o formulário — não reabre o admin do catálogo ORC.
     *
     * @return list<array{id: int, nome: string, ativo: bool}>
     */
    public function gruposHoraMaquinaDisponiveis(?Empresa $empresa = null): array
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('orc_catalogo_maquinas')) {
            return [];
        }

        $empresaId = $empresa?->id ?? CatalogoOrcEmpresa::id();

        return CatalogoOrcEmpresa::apply(
            OrcCatalogoMaquina::query()->where('ativo', true)->orderBy('ordem')->orderBy('nome'),
            $empresaId,
            true,
        )
            ->get(['id', 'nome', 'ativo'])
            ->map(fn (OrcCatalogoMaquina $m) => [
                'id' => $m->id,
                'nome' => $m->nome,
                'ativo' => (bool) $m->ativo,
            ])
            ->all();
    }

    public function valorMinimoCapitalizar(Empresa $empresa): float
    {
        $param = ParametroEmpresa::query()
            ->where('empresa_id', $empresa->id)
            ->where('chave', 'valor_minimo_capitalizar_bem')
            ->value('valor');

        if ($param === null || $param === '') {
            return 1000.0;
        }

        $normalized = str_replace(['R$', ' ', '.'], '', (string) $param);
        $normalized = str_replace(',', '.', $normalized);

        return is_numeric($normalized) ? (float) $normalized : 1000.0;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertRelations(Empresa $empresa, array $data): void
    {
        if (array_key_exists('fornecedor_id', $data) && $data['fornecedor_id'] !== null) {
            $ok = Parceiro::query()
                ->where('empresa_id', $empresa->id)
                ->where('id', $data['fornecedor_id'])
                ->exists();
            if (! $ok) {
                throw ValidationException::withMessages([
                    'fornecedor_id' => ['Fornecedor inválido para a empresa.'],
                ]);
            }
        }

        if (array_key_exists('orc_catalogo_maquina_id', $data) && $data['orc_catalogo_maquina_id'] !== null) {
            $ok = CatalogoOrcEmpresa::apply(
                OrcCatalogoMaquina::query(),
                $empresa->id,
                true,
            )->where('id', $data['orc_catalogo_maquina_id'])->exists();
            if (! $ok) {
                throw ValidationException::withMessages([
                    'orc_catalogo_maquina_id' => ['Grupo hora-máquina do ORC inválido para esta empresa.'],
                ]);
            }
        }

        $categoria = $data['categoria'] ?? null;
        $grupoId = $data['orc_catalogo_maquina_id'] ?? null;
        if ($grupoId !== null && $categoria !== null && $categoria !== BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA) {
            throw ValidationException::withMessages([
                'orc_catalogo_maquina_id' => ['Grupo hora-máquina só se aplica a máquina gráfica.'],
            ]);
        }
    }

    /**
     * Origem operacional: grupo G10 nasce no patrimônio (nome novo) ou reusa classe tarifária.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function resolverGrupoHoraMaquina(array $data): array
    {
        $nomeRaw = $data['grupo_hora_maquina_nome'] ?? null;
        $nome = is_string($nomeRaw) ? trim($nomeRaw) : '';
        $hasId = array_key_exists('orc_catalogo_maquina_id', $data)
            && $data['orc_catalogo_maquina_id'] !== null
            && $data['orc_catalogo_maquina_id'] !== '';

        if ($nome !== '' && $hasId) {
            throw ValidationException::withMessages([
                'grupo_hora_maquina_nome' => ['Informe o grupo existente ou um nome novo — não os dois.'],
            ]);
        }

        if ($nome !== '') {
            $data['orc_catalogo_maquina_id'] = $this->catalogoOrc->ensureGrupoHoraMaquina($nome)->id;
        }

        unset($data['grupo_hora_maquina_nome']);

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertMaquinaGraficaTemGrupo(array $data, bool $required): void
    {
        if (! $required) {
            return;
        }
        if (($data['categoria'] ?? null) !== BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA) {
            return;
        }
        $id = $data['orc_catalogo_maquina_id'] ?? null;
        if ($id === null || $id === '') {
            throw ValidationException::withMessages([
                'orc_catalogo_maquina_id' => [
                    'Máquina gráfica exige grupo hora-máquina. Reuse o grupo da mesma classe (duas 160 = um G10) ou informe um nome novo. O catálogo ORC só edita tarifas.',
                ],
            ]);
        }
    }

    /**
     * Bens já gravados sem ponte seguem válidos. Não permitir apagar o vínculo nem virar máquina gráfica órfã.
     *
     * @param  array<string, mixed>  $data
     */
    private function assertMaquinaGraficaNoUpdate(BemPatrimonial $bem, array $data): void
    {
        $categoria = $data['categoria'] ?? $bem->categoria;
        $grupoId = array_key_exists('orc_catalogo_maquina_id', $data)
            ? $data['orc_catalogo_maquina_id']
            : $bem->orc_catalogo_maquina_id;
        $enviouGrupo = array_key_exists('orc_catalogo_maquina_id', $data);
        $virandoMaquina = $categoria === BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA
            && $bem->categoria !== BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA;
        $limpando = $enviouGrupo && ($data['orc_catalogo_maquina_id'] ?? null) === null
            && $bem->orc_catalogo_maquina_id !== null;

        $this->assertMaquinaGraficaTemGrupo(
            ['categoria' => $categoria, 'orc_catalogo_maquina_id' => $grupoId],
            required: $virandoMaquina || $limpando,
        );
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalize(array $data, bool $partial = false): array
    {
        $keys = [
            'descricao', 'categoria', 'marca', 'modelo', 'numero_serie',
            'adquirido_em', 'valor_aquisicao', 'nf_numero', 'fornecedor_id',
            'responsavel', 'responsavel_user_id', 'status',
            'garantia_ate', 'placa', 'renavam', 'vida_util_meses',
            'orc_catalogo_maquina_id', 'capitalizado', 'observacao',
            'baixado_em', 'motivo_baixa',
        ];

        $out = [];
        foreach ($keys as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            $out[$key] = $data[$key] === '' ? null : $data[$key];
        }

        if (isset($out['descricao']) && is_string($out['descricao'])) {
            $out['descricao'] = trim($out['descricao']);
        }

        if (isset($out['placa']) && is_string($out['placa'])) {
            $out['placa'] = strtoupper(preg_replace('/\s+/', '', $out['placa']) ?? '');
            if ($out['placa'] === '') {
                $out['placa'] = null;
            }
        }

        $status = $out['status'] ?? null;
        if ($status !== null && in_array($status, BemPatrimonial::STATUSES_FINAIS, true)) {
            $out['baixado_em'] = $out['baixado_em'] ?? now()->toDateString();
        }

        if (isset($out['categoria']) && $out['categoria'] !== BemPatrimonial::CATEGORIA_VEICULO) {
            if (! $partial || array_key_exists('placa', $data) || array_key_exists('renavam', $data)) {
                // Mantém placa/renavam se já existirem e categoria mudar só se enviados explicitamente.
            }
        }

        if (isset($out['categoria']) && $out['categoria'] !== BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA) {
            if (array_key_exists('orc_catalogo_maquina_id', $data)) {
                $out['orc_catalogo_maquina_id'] = null;
            }
        }

        return $out;
    }

    /**
     * Fonte da verdade: departamento_id. `local` = espelho do nome (ADR-039-DEP-001).
     * Texto `local` legado (sem id) resolve/cria DEP na EMP.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function applyDepartamento(Empresa $empresa, array $data, array $payload): array
    {
        $hasId = array_key_exists('departamento_id', $data);
        $hasLocal = array_key_exists('local', $data);

        if (! $hasId && ! $hasLocal) {
            return $payload;
        }

        if ($hasId) {
            $id = $data['departamento_id'];
            if ($id === null || $id === '') {
                $payload['departamento_id'] = null;
                $payload['local'] = null;

                return $payload;
            }

            $resolved = $this->departamentoService->resolveId($empresa, $id, null, false);
            $payload['departamento_id'] = $resolved;
            $payload['local'] = $this->departamentoService->mirrorNome($resolved);

            return $payload;
        }

        $texto = is_string($data['local'] ?? null) ? trim((string) $data['local']) : '';
        if ($texto === '') {
            $payload['departamento_id'] = null;
            $payload['local'] = null;

            return $payload;
        }

        $resolved = $this->departamentoService->resolveId($empresa, null, $texto, true);
        $payload['departamento_id'] = $resolved;
        $payload['local'] = $this->departamentoService->mirrorNome($resolved);

        return $payload;
    }

    /**
     * @param  array<string, mixed>|null  $meta
     * @return array<string, mixed>
     */
    public function toOut(BemPatrimonial $bem, ?array $meta = null): array
    {
        $bem->loadMissing([
            'departamento:id,codigo,nome,ativo',
            ...BemPatrimonial::userStampWith(),
        ]);

        return [
            'id' => $bem->id,
            'empresa_id' => $bem->empresa_id,
            'codigo' => $bem->codigo,
            'descricao' => $bem->descricao,
            'categoria' => $bem->categoria,
            'marca' => $bem->marca,
            'modelo' => $bem->modelo,
            'numero_serie' => $bem->numero_serie,
            'adquirido_em' => optional($bem->adquirido_em)?->format('Y-m-d'),
            'valor_aquisicao' => $bem->valor_aquisicao !== null ? number_format((float) $bem->valor_aquisicao, 2, '.', '') : null,
            'nf_numero' => $bem->nf_numero,
            'fornecedor_id' => $bem->fornecedor_id,
            'fornecedor' => $bem->fornecedor ? [
                'id' => $bem->fornecedor->id,
                'codigo' => $bem->fornecedor->codigo,
                'razao_social' => $bem->fornecedor->razao_social,
                'nome_fantasia' => $bem->fornecedor->nome_fantasia,
            ] : null,
            'local' => $bem->local,
            'departamento_id' => $bem->departamento_id,
            'departamento' => $bem->departamento ? [
                'id' => $bem->departamento->id,
                'codigo' => $bem->departamento->codigo,
                'nome' => $bem->departamento->nome,
                'ativo' => (bool) $bem->departamento->ativo,
            ] : null,
            'responsavel' => $bem->responsavel,
            'responsavel_user_id' => $bem->responsavel_user_id,
            'status' => $bem->status,
            'garantia_ate' => optional($bem->garantia_ate)?->format('Y-m-d'),
            'placa' => $bem->placa,
            'renavam' => $bem->renavam,
            'vida_util_meses' => $bem->vida_util_meses,
            'orc_catalogo_maquina_id' => $bem->orc_catalogo_maquina_id,
            'grupo_hora_maquina' => $bem->grupoHoraMaquina ? [
                'id' => $bem->grupoHoraMaquina->id,
                'nome' => $bem->grupoHoraMaquina->nome,
                'ativo' => (bool) $bem->grupoHoraMaquina->ativo,
            ] : null,
            'capitalizado' => (bool) $bem->capitalizado,
            'observacao' => $bem->observacao,
            'baixado_em' => optional($bem->baixado_em)?->format('Y-m-d'),
            'motivo_baixa' => $bem->motivo_baixa,
            'created_at' => optional($bem->created_at)?->toIso8601String(),
            'updated_at' => optional($bem->updated_at)?->toIso8601String(),
            'criado_por' => BemPatrimonial::userStampFrom($bem->criador),
            'atualizado_por' => BemPatrimonial::userStampFrom($bem->atualizador),
            'capitalizacao' => $meta,
        ];
    }
}