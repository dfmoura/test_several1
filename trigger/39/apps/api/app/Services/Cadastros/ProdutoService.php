<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use App\Support\ProdutoLotePolitica;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProdutoService
{
    public const LIST_LIMIT_DEFAULT = 250;

    public const LIST_LIMIT_MAX = 500;

    public function __construct(
        private readonly CodigoGenerator $codigoGenerator,
        private readonly AuditLogger $auditLogger,
        private readonly ProdutoGrupoService $produtoGrupoService,
    ) {}

    public function list(
        Empresa $empresa,
        ?string $familia = null,
        ?string $grupo = null,
        ?string $q = null,
        int $limit = self::LIST_LIMIT_DEFAULT
    ) {
        $limit = max(1, min($limit, self::LIST_LIMIT_MAX));

        $query = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->with(Produto::userStampWith())
            ->orderBy('codigo');

        if ($familia) {
            $query->where('familia', strtoupper($familia));
        }

        if ($grupo) {
            $codigoGrupo = strtoupper($grupo);
            $query->where(function ($builder) use ($codigoGrupo) {
                $builder->where('grupo', $codigoGrupo)
                    ->orWhereHas('grupoCatalogo', fn ($g) => $g->where('codigo', $codigoGrupo));
            });
        }

        if ($q) {
            $query->where(function ($builder) use ($q) {
                $builder->where('codigo', 'like', "%{$q}%")
                    ->orWhere('descricao_fiscal', 'like', "%{$q}%")
                    ->orWhere('descricao_comercial', 'like', "%{$q}%")
                    ->orWhere('ncm', 'like', "%{$q}%")
                    ->orWhere('grupo', 'like', "%{$q}%");
            });
        }

        return $query->limit($limit)->get();
    }

    public function create(Empresa $empresa, array $data): Produto
    {
        $familia = strtoupper((string) ($data['familia'] ?? ''));
        if (! in_array($familia, Produto::FAMILIAS, true)) {
            throw ValidationException::withMessages([
                'familia' => ['Família inválida. Use: '.implode(', ', Produto::FAMILIAS)],
            ]);
        }

        $grupo = $this->produtoGrupoService->resolveForFamilia(
            $familia,
            $data['grupo_id'] ?? null,
            $data['grupo'] ?? null,
        );

        return DB::transaction(function () use ($empresa, $data, $familia, $grupo) {
            $payload = $this->normalizeUnidades($this->mapAttributes($data, $grupo, applyDefaults: true));
            $payload = $this->applyLoteFlags($payload, $data, $grupo, applyDefaults: true);
            $this->assertUnidadesConversao($payload);
            $codigo = $data['codigo'] ?? $this->generateCode($empresa->id, $grupo);

            $produto = Produto::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'familia' => $familia,
                'grupo_id' => $grupo->id,
                'grupo' => $grupo->codigo,
                ...$payload,
            ]);

            $this->auditLogger->log('CRIAR', 'produto', $produto->id, null, $produto->toArray());

            return $produto->fresh(Produto::userStampWith());
        });
    }

    public function update(Produto $produto, array $data): Produto
    {
        $before = $produto->loadMissing(Produto::userStampWith())->toArray();
        $familia = strtoupper((string) ($data['familia'] ?? $produto->familia));

        $grupo = null;
        if (array_key_exists('grupo_id', $data) || array_key_exists('grupo', $data)) {
            $grupo = $this->produtoGrupoService->resolveForFamilia(
                $familia,
                $data['grupo_id'] ?? null,
                $data['grupo'] ?? null,
            );
        } elseif (isset($data['familia']) && $produto->grupo_id) {
            // Troca de família exige reescolher grupo compatível.
            $atual = $produto->grupoCatalogo;
            if ($atual && $atual->familia !== $familia) {
                throw ValidationException::withMessages([
                    'grupo_id' => ['Ao alterar a família, selecione um grupo compatível.'],
                ]);
            }
        }

        $payload = $this->mapAttributes($data, $grupo, applyDefaults: false);
        $payload = $this->applyLoteFlags(
            $payload,
            $data,
            $grupo ?? $produto->grupoCatalogo,
            applyDefaults: false,
            atual: $produto
        );

        if ($grupo) {
            $payload['grupo_id'] = $grupo->id;
            $payload['grupo'] = $grupo->codigo;
            $payload['familia'] = $familia;
        } elseif (isset($data['familia'])) {
            $payload['familia'] = $familia;
        }

        // Normaliza só quando o request toca unidades; senão só valida o estado efetivo.
        $touchedUnits = array_key_exists('unidade_comercial', $payload)
            || array_key_exists('unidade_interna', $payload)
            || array_key_exists('fator_conversao', $payload);

        $mergedForUnits = [
            'unidade_comercial' => $payload['unidade_comercial'] ?? $produto->unidade_comercial,
            'unidade_interna' => $payload['unidade_interna'] ?? $produto->unidade_interna,
            'fator_conversao' => array_key_exists('fator_conversao', $payload)
                ? $payload['fator_conversao']
                : $produto->fator_conversao,
        ];
        if ($touchedUnits) {
            $mergedForUnits = $this->normalizeUnidades($mergedForUnits);
            $payload['unidade_comercial'] = $mergedForUnits['unidade_comercial'];
            $payload['unidade_interna'] = $mergedForUnits['unidade_interna'];
            $payload['fator_conversao'] = $mergedForUnits['fator_conversao'];
        }
        $this->assertUnidadesConversao($mergedForUnits);

        $produto->update($payload);
        $this->auditLogger->log('ATUALIZAR', 'produto', $produto->id, $before, $produto->fresh(Produto::userStampWith())->toArray());

        return $produto->fresh(Produto::userStampWith());
    }

    private function generateCode(int $empresaId, ProdutoGrupo $grupo): string
    {
        return $this->codigoGenerator->nextCode(
            $empresaId,
            $grupo->codigoPrefixo(),
            $grupo->padDigitos()
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAttributes(array $data, ?ProdutoGrupo $grupo, bool $applyDefaults): array
    {
        $fields = [
            'descricao_fiscal', 'descricao_comercial', 'ncm', 'cest', 'origem',
            'tipo_item_sped', 'unidade_comercial', 'unidade_interna', 'fator_conversao',
            'cfop_saida_padrao', 'cfop_entrada_padrao', 'csosn', 'cst_icms', 'cst_pis',
            'cst_cofins', 'cst_cbs', 'cclass_trib', 'aliquota_cbs', 'preco_tabela',
            'custo_medio', 'estoque_minimo', 'lead_time_dias',
            'controla_lote', 'controla_validade', 'prazo_validade_dias',
            'gtin', 'situacao', 'atributos',
        ];

        $mapped = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $mapped[$field] = $data[$field];
            }
        }

        if ($applyDefaults && $grupo) {
            $defaults = [
                'tipo_item_sped' => $grupo->tipo_item_sped,
                'ncm' => $grupo->ncm_padrao,
                'unidade_comercial' => $grupo->unidade_comercial_padrao,
                'unidade_interna' => $grupo->unidade_interna_padrao,
                'cfop_entrada_padrao' => $grupo->cfop_entrada_padrao,
                'cfop_saida_padrao' => $grupo->cfop_saida_padrao,
            ];

            foreach ($defaults as $field => $value) {
                if ($value === null || $value === '') {
                    continue;
                }
                $current = $mapped[$field] ?? null;
                if ($current === null || $current === '') {
                    $mapped[$field] = $value;
                }
            }

            if (! array_key_exists('atributos', $mapped) || $mapped['atributos'] === null) {
                $mapped['atributos'] = [];
            }

            if (is_array($mapped['atributos']) && $grupo->grupo_estoque_padrao) {
                $mapped['atributos'] = array_merge([
                    'grupo_estoque' => $grupo->grupo_estoque_padrao,
                ], $mapped['atributos']);
            }
        }

        $mapped = PadraoDecimal::canonicalizeFields($mapped, PadraoDecimal::produtoFieldScales());

        if (array_key_exists('atributos', $mapped) && is_array($mapped['atributos'])) {
            $mapped['atributos'] = PadraoDecimal::canonicalizeProdutoAtributos($mapped['atributos']);
        }

        return $mapped;
    }

    /**
     * ADR-039-UNID-001: interna vazia → comercial; iguais → fator 1 se ausente.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalizeUnidades(array $data): array
    {
        $uCom = isset($data['unidade_comercial']) ? strtoupper(trim((string) $data['unidade_comercial'])) : '';
        $uInt = isset($data['unidade_interna']) ? strtoupper(trim((string) $data['unidade_interna'])) : '';

        if ($uCom !== '') {
            $data['unidade_comercial'] = $uCom;
        }
        if ($uInt !== '') {
            $data['unidade_interna'] = $uInt;
        }

        if ($uCom !== '' && $uInt === '') {
            $data['unidade_interna'] = $uCom;
            $uInt = $uCom;
        }

        if ($uCom !== '' && $uInt !== '' && $uCom === $uInt) {
            $fator = $data['fator_conversao'] ?? null;
            if ($fator === null || $fator === '') {
                $data['fator_conversao'] = '1';
            }
        }

        return $data;
    }

    /**
     * Domínio 32: unidade comercial ≠ interna exige fator_conversao > 0.
     *
     * @param  array<string, mixed>  $data
     */
    private function assertUnidadesConversao(array $data): void
    {
        $uCom = isset($data['unidade_comercial']) ? strtoupper(trim((string) $data['unidade_comercial'])) : '';
        $uInt = isset($data['unidade_interna']) ? strtoupper(trim((string) $data['unidade_interna'])) : '';

        if ($uCom === '' || $uInt === '' || $uCom === $uInt) {
            return;
        }

        $fator = $data['fator_conversao'] ?? null;
        if ($fator === null || $fator === '') {
            throw ValidationException::withMessages([
                'fator_conversao' => [
                    'fator_conversao é obrigatório e deve ser > 0 quando unidade_comercial ≠ unidade_interna.',
                ],
            ]);
        }

        if (! is_numeric($fator) || (float) $fator <= 0) {
            throw ValidationException::withMessages([
                'fator_conversao' => [
                    'fator_conversao é obrigatório e deve ser > 0 quando unidade_comercial ≠ unidade_interna.',
                ],
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function applyLoteFlags(
        array $payload,
        array $data,
        ?ProdutoGrupo $grupo,
        bool $applyDefaults,
        ?Produto $atual = null
    ): array {
        $touched = array_key_exists('controla_lote', $data)
            || array_key_exists('controla_validade', $data)
            || array_key_exists('prazo_validade_dias', $data);

        if ($applyDefaults && ! $touched && $grupo) {
            $pol = ProdutoLotePolitica::paraGrupo($grupo->codigo);
            $payload['controla_lote'] = $pol['controla_lote'];
            $payload['controla_validade'] = $pol['controla_validade'];
            $payload['prazo_validade_dias'] = $pol['prazo_validade_dias'];

            return $payload;
        }

        if (! $touched && ! $applyDefaults) {
            return $payload;
        }

        $base = [
            'controla_lote' => $payload['controla_lote'] ?? $atual?->controla_lote ?? false,
            'controla_validade' => $payload['controla_validade'] ?? $atual?->controla_validade ?? false,
            'prazo_validade_dias' => array_key_exists('prazo_validade_dias', $payload)
                ? $payload['prazo_validade_dias']
                : $atual?->prazo_validade_dias,
        ];
        $norm = ProdutoLotePolitica::normalizar($base);
        $payload['controla_lote'] = $norm['controla_lote'];
        $payload['controla_validade'] = $norm['controla_validade'];
        $payload['prazo_validade_dias'] = $norm['prazo_validade_dias'];

        return $payload;
    }
}
