<?php

namespace App\Services\Cadastros;

use App\Models\BemPatrimonial;
use App\Models\Empresa;
use App\Models\OrcCatalogoMaquina;
use App\Models\ParametroEmpresa;
use App\Models\Parceiro;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BemPatrimonialService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $categoria = null, ?string $status = null): array
    {
        $query = BemPatrimonial::query()
            ->with(['fornecedor:id,codigo,razao_social,nome_fantasia', 'grupoHoraMaquina:id,nome,ativo'])
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
                    ->orWhere('local', 'like', $like);
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
        $this->assertRelations($empresa, $data);
        $payload = $this->normalize($data);

        $bem = DB::transaction(function () use ($empresa, $payload) {
            $codigo = $this->codigos->nextCode(null, 'BEM');

            return BemPatrimonial::query()->create([
                ...$payload,
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'status' => $payload['status'] ?? BemPatrimonial::STATUS_ATIVO,
            ]);
        });

        $bem->load(['fornecedor:id,codigo,razao_social,nome_fantasia', 'grupoHoraMaquina:id,nome,ativo']);

        return $this->toOut($bem, $this->metaCapitalizacao($empresa, $bem));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(BemPatrimonial $bem, array $data): array
    {
        $empresa = $bem->empresa ?? Empresa::query()->findOrFail($bem->empresa_id);
        $this->assertRelations($empresa, $data);
        $payload = $this->normalize($data, partial: true);

        $bem->fill($payload);
        $bem->save();
        $bem->load(['fornecedor:id,codigo,razao_social,nome_fantasia', 'grupoHoraMaquina:id,nome,ativo']);

        return $this->toOut($bem, $this->metaCapitalizacao($empresa, $bem));
    }

    /**
     * @return array<string, mixed>
     */
    public function show(BemPatrimonial $bem): array
    {
        $bem->load(['fornecedor:id,codigo,razao_social,nome_fantasia', 'grupoHoraMaquina:id,nome,ativo']);
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
    public function gruposHoraMaquinaDisponiveis(): array
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('orc_catalogo_maquinas')) {
            return [];
        }

        return OrcCatalogoMaquina::query()
            ->where('ativo', true)
            ->orderBy('ordem')
            ->orderBy('nome')
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
            $ok = OrcCatalogoMaquina::query()->where('id', $data['orc_catalogo_maquina_id'])->exists();
            if (! $ok) {
                throw ValidationException::withMessages([
                    'orc_catalogo_maquina_id' => ['Grupo hora-máquina do ORC inválido.'],
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
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalize(array $data, bool $partial = false): array
    {
        $keys = [
            'descricao', 'categoria', 'marca', 'modelo', 'numero_serie',
            'adquirido_em', 'valor_aquisicao', 'nf_numero', 'fornecedor_id',
            'local', 'responsavel', 'responsavel_user_id', 'status',
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
     * @param  array<string, mixed>|null  $meta
     * @return array<string, mixed>
     */
    public function toOut(BemPatrimonial $bem, ?array $meta = null): array
    {
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
            'capitalizacao' => $meta,
        ];
    }
}
