<?php

namespace App\Services\Comercial;

use App\Models\Empresa;
use App\Models\MatrizCobrada;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Services\Audit\AuditLogger;
use App\Services\Calendario\DiasUteisService;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Comercial\Orcamento\OrcamentoCatalogo;
use App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService;
use App\Services\Comercial\Orcamento\OrcamentoMotor;
use App\Services\Comercial\Orcamento\OrcamentoServicoPrecificador;
use App\Services\Financeiro\AdiantamentoService;
use App\Support\CatalogoServicoSaida;
use App\Support\ContornoSvgSanitizer;
use App\Support\FacaPosicao;
use App\Support\ModelosComposicao;
use App\Support\TipoOperacaoSaida;
use App\Support\UrlArtePublica;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrcamentoService
{
    public function __construct(
        private readonly OrcamentoMotor $motor,
        private readonly OrcamentoServicoPrecificador $servicoPrecificador,
        private readonly CodigoGenerator $codigoGenerator,
        private readonly AuditLogger $audit,
        private readonly OrcamentoFreteEstimadoService $freteEstimado,
        private readonly VendedorResolver $vendedores,
        private readonly ContornoSvgSanitizer $contornoSvgSanitizer,
        private readonly DiasUteisService $diasUteis,
    ) {}

    /** @return array<string, mixed> */
    public function catalogMeta(): array
    {
        $meta = OrcamentoCatalogo::load()->metaForUi();
        $meta['tipos_operacao'] = TipoOperacaoSaida::metaForUi();
        $meta['tipos_servico'] = CatalogoServicoSaida::metaForUi();

        return $meta;
    }

    /**
     * Preview — sem persistência.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function calcularPreview(Empresa $empresa, array $data): array
    {
        $parceiro = $this->resolveParceiro($empresa, (int) $data['parceiro_id']);
        [$input, $result] = $this->precificar($empresa, $parceiro, $data);

        return $this->enrichResult($result, $data, $parceiro, $empresa);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, array $filters = []): array
    {
        $q = Orcamento::query()
            ->with([
                'parceiro:id,codigo,razao_social,nome_fantasia,is_prospect',
                'vendedor:id,codigo,razao_social,nome_fantasia,comissao_percentual,papel_vendedor',
                ...Orcamento::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if (! empty($filters['status'])) {
            $q->where('status', $filters['status']);
        }
        if (! empty($filters['parceiro_id'])) {
            $q->where('parceiro_id', (int) $filters['parceiro_id']);
        }
        if (! empty($filters['vendedor_parceiro_id'])) {
            $q->where('vendedor_parceiro_id', (int) $filters['vendedor_parceiro_id']);
        }
        if (! empty($filters['q'])) {
            $term = '%'.$filters['q'].'%';
            $q->where(function ($inner) use ($term) {
                $inner->where('codigo', 'like', $term)
                    ->orWhere('cliente_nome', 'like', $term);
            });
        }

        return $q->get()->map(fn (Orcamento $o) => $this->toOut($o))->all();
    }

    /** @return array<string, mixed> */
    public function show(Orcamento $orcamento): array
    {
        $orcamento->loadMissing([
            'parceiro:id,codigo,razao_social,nome_fantasia,is_prospect',
            'vendedor:id,codigo,razao_social,nome_fantasia,comissao_percentual,papel_vendedor',
            'linkAprovacao',
            'pedido:id,codigo,status,orcamento_id',
            ...Orcamento::userStampWith(),
        ]);

        return $this->toOut($orcamento);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $parceiro = $this->resolveParceiro($empresa, (int) $data['parceiro_id']);
        $vendedor = $this->vendedores->resolve($empresa, $data['vendedor_parceiro_id'] ?? null);
        [$input, $bruto] = $this->precificar($empresa, $parceiro, $data);
        $result = $this->enrichResult($bruto, $data, $parceiro, $empresa);

        $orcamento = DB::transaction(function () use ($empresa, $parceiro, $vendedor, $data, $input, $result) {
            $ano = (int) now()->year;
            $prefix = 'ORC-'.$ano;
            $codigo = $this->codigoGenerator->nextCode($empresa->id, $prefix, 5);
            // nextCode → ORC-2026-00001; extrai número
            $parts = explode('-', $codigo);
            $numero = (int) end($parts);

            $snapshotInput = $this->persistableInput($input, $data, $vendedor);

            $orc = Orcamento::query()->create([
                'empresa_id' => $empresa->id,
                'ano' => $ano,
                'numero' => $numero,
                'codigo' => $codigo,
                'versao' => 1,
                'parceiro_id' => $parceiro->id,
                'vendedor_parceiro_id' => $vendedor?->id,
                'cliente_nome' => $parceiro->razao_social,
                'status' => Orcamento::STATUS_CALCULADO,
                'input_snapshot' => $snapshotInput,
                'result_snapshot' => $result,
                'chave_matriz' => $result['chave_matriz'],
                'cobra_matriz' => $result['cobra_matriz'],
                'valor_matriz' => $result['valor_matriz'],
                'valor_primeira_faixa' => $this->extractValorPrimeiraFaixa($result),
                'prazo_entrega_dias' => (int) ($data['prazo_entrega_dias'] ?? 12),
                'validade_dias' => (int) ($data['validade_dias'] ?? 7),
                'tolerancia_qtd_pct' => (string) ($data['tolerancia_qtd_pct'] ?? 20),
                'observacao' => $data['observacao'] ?? null,
            ]);

            $this->audit->log('CRIAR', 'Orcamento', $orc->id, null, [
                'codigo' => $orc->codigo,
                'status' => $orc->status,
                'parceiro_id' => $orc->parceiro_id,
            ]);

            return $orc;
        });

        return $this->show($orcamento);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function update(Orcamento $orcamento, array $data): array
    {
        $this->assertEditavel($orcamento);

        $empresa = Empresa::query()->findOrFail($orcamento->empresa_id);
        $parceiro = $this->resolveParceiro($empresa, (int) $data['parceiro_id']);
        $vendedor = $this->vendedores->resolve($empresa, $data['vendedor_parceiro_id'] ?? null);
        [$input, $bruto] = $this->precificar($empresa, $parceiro, $data);
        $result = $this->enrichResult($bruto, $data, $parceiro, $empresa);

        $before = [
            'versao' => $orcamento->versao,
            'status' => $orcamento->status,
            'parceiro_id' => $orcamento->parceiro_id,
        ];

        DB::transaction(function () use ($orcamento, $parceiro, $vendedor, $data, $input, $result, $before) {
            // Recálculo após recusa: volta a preparação e invalida link antigo.
            if ($orcamento->status === Orcamento::STATUS_REPROVADO) {
                $link = $orcamento->linkAprovacao()->lockForUpdate()->first();
                if ($link) {
                    $link->fill(['ativo' => false]);
                    $link->save();
                }
            }

            $orcamento->fill([
                'versao' => $orcamento->versao + 1,
                'parceiro_id' => $parceiro->id,
                'vendedor_parceiro_id' => $vendedor?->id,
                'cliente_nome' => $parceiro->razao_social,
                'status' => Orcamento::STATUS_CALCULADO,
                'input_snapshot' => $this->persistableInput($input, $data, $vendedor),
                'result_snapshot' => $result,
                'chave_matriz' => $result['chave_matriz'],
                'cobra_matriz' => $result['cobra_matriz'],
                'valor_matriz' => $result['valor_matriz'],
                'valor_primeira_faixa' => $this->extractValorPrimeiraFaixa($result),
                'prazo_entrega_dias' => (int) ($data['prazo_entrega_dias'] ?? $orcamento->prazo_entrega_dias),
                'validade_dias' => (int) ($data['validade_dias'] ?? $orcamento->validade_dias),
                'tolerancia_qtd_pct' => (string) ($data['tolerancia_qtd_pct'] ?? $orcamento->tolerancia_qtd_pct),
                'observacao' => array_key_exists('observacao', $data)
                    ? $data['observacao']
                    : $orcamento->observacao,
                'decidido_em' => null,
                'canal_aprovacao' => null,
                'aceite_nome_cliente' => null,
                'aceite_faixa_index' => null,
                'aceite_ip' => null,
                'aceite_user_agent' => null,
                'motivo_decisao' => null,
                'visualizado_em' => null,
            ]);
            $orcamento->save();

            $this->audit->log('ATUALIZAR', 'Orcamento', $orcamento->id, $before, [
                'versao' => $orcamento->versao,
                'status' => $orcamento->status,
                'parceiro_id' => $orcamento->parceiro_id,
            ]);
        });

        return $this->show($orcamento->fresh(['parceiro', 'vendedor']));
    }

    public function destroy(Orcamento $orcamento): void
    {
        $this->assertEditavel($orcamento);

        DB::transaction(function () use ($orcamento) {
            $before = ['status' => $orcamento->status, 'codigo' => $orcamento->codigo];
            $orcamento->status = Orcamento::STATUS_CANCELADO;
            $orcamento->save();
            $orcamento->delete(); // soft delete

            $this->audit->log('EXCLUIR', 'Orcamento', $orcamento->id, $before, [
                'status' => Orcamento::STATUS_CANCELADO,
                'deleted' => true,
            ]);
        });
    }

    private function assertEditavel(Orcamento $orcamento): void
    {
        if (! $orcamento->isEditavel()) {
            throw ValidationException::withMessages([
                'status' => [
                    'Orçamento não editável neste status (enviado/aprovado/cancelado). '
                    .'Se foi rejeitado, edite e reenvie; caso contrário gere um novo ORC.',
                ],
            ]);
        }
    }

    private function resolveParceiro(Empresa $empresa, int $parceiroId): Parceiro
    {
        $parceiro = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($parceiroId)
            ->first();

        if ($parceiro === null) {
            throw ValidationException::withMessages([
                'parceiro_id' => ['Parceiro obrigatório e deve pertencer à empresa do contexto.'],
            ]);
        }

        return $parceiro;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private function precificar(Empresa $empresa, Parceiro $parceiro, array $data): array
    {
        if (TipoOperacaoSaida::isServico($data['tipo_operacao'] ?? $data['necessidade'] ?? null)) {
            $input = $this->buildServicoInput($data, $parceiro);

            return [$input, $this->servicoPrecificador->calcular($input)];
        }

        $input = $this->buildMotorInput($data, $parceiro, $empresa);

        return [$input, $this->motor->calcular($input)];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function buildServicoInput(array $data, Parceiro $parceiro): array
    {
        $tipo = CatalogoServicoSaida::get((string) ($data['tipo_servico'] ?? CatalogoServicoSaida::AVULSO));
        $material = array_key_exists('material_cliente', $data)
            ? (bool) $data['material_cliente']
            : $tipo['material_cliente_padrao'];
        $desc = trim((string) ($data['descricao_servico'] ?? ''));
        if ($desc === '') {
            $desc = $tipo['descricao_padrao'];
        }

        return [
            'cliente' => $parceiro->razao_social,
            'parceiro_id' => $parceiro->id,
            'tipo_operacao' => TipoOperacaoSaida::SERVICO,
            'tipo_servico' => $tipo['codigo'],
            'descricao_servico' => $desc,
            'material_cliente' => $material,
            'unidade' => strtoupper(trim((string) ($data['unidade'] ?? $tipo['unidade_padrao']))) ?: $tipo['unidade_padrao'],
            'horas_maquina' => isset($data['horas_maquina']) ? (float) $data['horas_maquina'] : null,
            'maquina' => $data['maquina'] ?? null,
            'cessao_bem_id' => isset($data['cessao_bem_id']) ? (int) $data['cessao_bem_id'] : null,
            'familia_fiscal' => $tipo['familia_fiscal'],
            'codigo_tributacao_nacional_iss' => $tipo['codigo_tributacao_nacional_iss'],
            'codigo_nbs' => $tipo['codigo_nbs'],
            'necessidade' => 'SERVICO',
            'faixas' => array_map(static fn (array $f) => [
                'quantidade' => (float) $f['quantidade'],
                'valor_unitario' => (float) $f['valor_unitario'],
                'comissao_pct' => (float) ($f['comissao_pct'] ?? 0),
            ], $data['faixas']),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function buildMotorInput(array $data, Parceiro $parceiro, Empresa $empresa): array
    {
        $data = ModelosComposicao::ensureInPayload($data);

        $input = [
            'cliente' => $parceiro->razao_social,
            'parceiro_id' => $parceiro->id,
            'tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO,
            'medida' => $data['medida'],
            'largura_cm' => (float) $data['largura_cm'],
            'puxada_cm' => (float) $data['puxada_cm'],
            'cores' => $data['cores'],
            'papel' => $data['papel'],
            'acabamento' => $data['acabamento'],
            'modelos' => (int) $data['modelos'],
            // Snapshot operacional — não entra nas fórmulas R1–R20 do motor.
            'modelos_composicao' => $data['modelos_composicao'],
            'colunas' => (int) $data['colunas'],
            'etiq_por_rolo' => (int) $data['etiq_por_rolo'],
            'tubete' => $data['tubete'],
            'z' => array_key_exists('z', $data) && $data['z'] !== null && $data['z'] !== ''
                ? (float) $data['z']
                : null,
            'maquina' => $data['maquina'],
            'maquina_roda_servico' => $data['maquina_roda_servico'] ?? $data['maquina'],
            'imposto_pct' => (float) ($data['imposto_pct'] ?? 16),
            'matriz' => strtoupper((string) ($data['matriz'] ?? 'SIM')),
            'coluna_rebobinacao' => (int) ($data['coluna_rebobinacao'] ?? 1),
            'tipo_troca_produto' => $data['tipo_troca_produto'] ?? 'SEM PARADA',
            'rpm' => (float) ($data['rpm'] ?? 1000),
            'faca_nova' => (bool) ($data['faca_nova'] ?? false),
            'formato_faca' => $data['formato_faca'] ?? null,
            'valor_faca_nova' => isset($data['valor_faca_nova']) ? (float) $data['valor_faca_nova'] : 0.0,
            'prazo_faca_dias' => isset($data['prazo_faca_dias']) ? (int) $data['prazo_faca_dias'] : null,
            'faixas' => array_map(static fn (array $f) => [
                'quantidade' => (int) $f['quantidade'],
                'comissao_pct' => (float) ($f['comissao_pct'] ?? 0),
            ], $data['faixas']),
            'overrides' => $data['overrides'] ?? null,
        ];

        $ck = $this->motor->chaveMatriz(
            $input['cliente'],
            $input['medida'],
            $input['z'],
            $input['cores'],
            $input['largura_cm'],
            $input['colunas'],
        );
        $input['matriz_ja_cobrada'] = MatrizCobrada::query()
            ->where('empresa_id', $empresa->id)
            ->where('chave_matriz', $ck)
            ->exists();

        return $input;
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function persistableInput(array $input, array $data, ?Parceiro $vendedor = null): array
    {
        unset($input['matriz_ja_cobrada']);

        $modo = $this->freteEstimado->normalizarModo($data['modo_entrega'] ?? null);

        return array_merge($input, [
            'prazo_entrega_dias' => (int) ($data['prazo_entrega_dias'] ?? 12),
            'validade_dias' => (int) ($data['validade_dias'] ?? 7),
            'tolerancia_qtd_pct' => (float) ($data['tolerancia_qtd_pct'] ?? 20),
            'observacao' => $data['observacao'] ?? null,
            'url_arte' => UrlArtePublica::normalize($data['url_arte'] ?? null),
            'condicao_pagamento' => $this->nullIfEmpty($data['condicao_pagamento'] ?? null),
            'forma_pagamento' => $this->nullIfEmpty($data['forma_pagamento'] ?? null),
            'vendedor_parceiro_id' => $vendedor?->id,
            'vendedor_nome' => $vendedor?->razao_social,
            'vendedor_codigo' => $vendedor?->codigo,
            'comissao_aliquota' => $vendedor?->comissao_percentual !== null
                ? (string) $vendedor->comissao_percentual
                : null,
            'modo_entrega' => $modo,
            'valor_frete_manual' => $this->freteEstimado->valorFreteManualSnapshot(
                $modo,
                $data['valor_frete_manual'] ?? null,
            ),
            'necessidade' => $this->necessidadeSnapshot($data['necessidade'] ?? $input['necessidade'] ?? null),
            'tipo_operacao' => TipoOperacaoSaida::fromInput(
                $data['tipo_operacao'] ?? $input['tipo_operacao'] ?? $data['necessidade'] ?? $input['necessidade'] ?? null
            ),
            'tipo_servico' => $input['tipo_servico'] ?? $data['tipo_servico'] ?? null,
            'descricao_servico' => $input['descricao_servico'] ?? $data['descricao_servico'] ?? null,
            'material_cliente' => (bool) ($input['material_cliente'] ?? $data['material_cliente'] ?? false),
            'unidade' => $input['unidade'] ?? $data['unidade'] ?? null,
            'horas_maquina' => $input['horas_maquina'] ?? $data['horas_maquina'] ?? null,
            'cessao_bem_id' => $input['cessao_bem_id'] ?? $data['cessao_bem_id'] ?? null,
            'codigo_tributacao_nacional_iss' => $input['codigo_tributacao_nacional_iss'] ?? null,
            'codigo_nbs' => $input['codigo_nbs'] ?? null,
            'familia_fiscal' => $input['familia_fiscal'] ?? null,
            'faca_nova' => (bool) ($data['faca_nova'] ?? $input['faca_nova'] ?? false),
            'formato_faca' => $data['formato_faca'] ?? $input['formato_faca'] ?? null,
            'valor_faca_nova' => (float) ($data['valor_faca_nova'] ?? $input['valor_faca_nova'] ?? 0),
            'prazo_faca_dias' => array_key_exists('prazo_faca_dias', $data)
                ? ($data['prazo_faca_dias'] !== null ? (int) $data['prazo_faca_dias'] : null)
                : ($input['prazo_faca_dias'] ?? null),
            'faca_colunas_mapa' => $this->nullIfEmpty($data['faca_colunas_mapa'] ?? $input['faca_colunas_mapa'] ?? null),
            'faca_posicao' => $this->normalizeFacaPosicao($data['faca_posicao'] ?? $input['faca_posicao'] ?? null),
            'faca_contorno_svg' => $this->sanitizeFacaContornoSvg($data['faca_contorno_svg'] ?? $input['faca_contorno_svg'] ?? null),
            'faca_diametro_cm' => $this->nullablePositiveFloat($data['faca_diametro_cm'] ?? $input['faca_diametro_cm'] ?? null),
            'faca_tamanho_tipo' => $this->nullIfEmpty($data['faca_tamanho_tipo'] ?? $input['faca_tamanho_tipo'] ?? null),
        ]);
    }

    private function sanitizeFacaContornoSvg(mixed $raw): ?string
    {
        if ($raw === null || trim((string) $raw) === '') {
            return null;
        }

        $sanitized = $this->contornoSvgSanitizer->sanitize((string) $raw);
        if ($sanitized === null) {
            throw ValidationException::withMessages([
                'faca_contorno_svg' => 'SVG inválido ou não permitido.',
            ]);
        }

        return $sanitized;
    }

    private function normalizeFacaPosicao(mixed $raw): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        return FacaPosicao::normalize($raw);
    }

    private function nullablePositiveFloat(mixed $v): ?float
    {
        if ($v === null || $v === '') {
            return null;
        }
        if (! is_numeric($v)) {
            return null;
        }
        $n = (float) $v;

        return $n > 0 ? $n : null;
    }

    private function nullIfEmpty(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

    private function necessidadeSnapshot(mixed $value): ?string
    {
        $s = $this->nullIfEmpty($value);
        if ($s === null) {
            return null;
        }

        return strtoupper($s);
    }

    /**
     * Anexa FACA NOVA e frete estimado ao result sem alterar fórmulas R1–R20.
     * Frete somável compõe valor_total_proposta (não o unitário / valor_total do motor).
     *
     * @param  array<string, mixed>  $result
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function enrichResult(array $result, array $data, Parceiro $parceiro, Empresa $empresa): array
    {
        if (TipoOperacaoSaida::isServico($data['tipo_operacao'] ?? $result['tipo_operacao'] ?? null)) {
            $data['faca_nova'] = false;
            $data['valor_faca_nova'] = 0;
        }
        $facaNova = (bool) ($data['faca_nova'] ?? false);
        $valorFaca = $facaNova ? max(0.0, (float) ($data['valor_faca_nova'] ?? 0)) : 0.0;
        $prazoFaca = $facaNova && isset($data['prazo_faca_dias']) && $data['prazo_faca_dias'] !== null
            ? (int) $data['prazo_faca_dias']
            : null;

        $result['faca_nova'] = $facaNova;
        $result['valor_faca_nova'] = $valorFaca;
        $result['prazo_faca_dias'] = $prazoFaca;
        $result['formato_faca'] = $data['formato_faca'] ?? null;

        if ($facaNova && isset($result['faixas']) && is_array($result['faixas'])) {
            foreach ($result['faixas'] as $i => $fx) {
                $result['faixas'][$i]['valor_faca_nova'] = $valorFaca;
                $result['faixas'][$i]['valor_total_com_faca'] =
                    (float) ($fx['valor_total'] ?? 0) + $valorFaca;
            }
        }

        return array_merge(
            $this->freteEstimado->aplicar($result, $data, $parceiro, $empresa),
            $this->diasUteis->previsaoPreview($empresa, $data, $result),
        );
    }

    /** @return array<string, mixed> */
    private function toOut(Orcamento $o): array
    {
        $o->loadMissing(Orcamento::userStampWith());

        return [
            'id' => $o->id,
            'empresa_id' => $o->empresa_id,
            'ano' => $o->ano,
            'numero' => $o->numero,
            'codigo' => $o->codigo,
            'versao' => $o->versao,
            'parceiro_id' => $o->parceiro_id,
            'vendedor_parceiro_id' => $o->vendedor_parceiro_id,
            'cliente_nome' => $o->cliente_nome,
            'status' => $o->status,
            'status_exibicao' => $this->statusExibicao($o),
            'editavel' => $o->isEditavel(),
            'enviavel' => $o->isEnviavel(),
            'aguardando_cliente' => $o->aguardandoCliente(),
            'input_snapshot' => $o->input_snapshot,
            'result_snapshot' => $o->result_snapshot,
            'tipo_operacao' => TipoOperacaoSaida::fromInput(
                is_array($o->input_snapshot) ? ($o->input_snapshot['tipo_operacao'] ?? $o->input_snapshot['necessidade'] ?? null) : null
            ),
            'chave_matriz' => $o->chave_matriz,
            'cobra_matriz' => $o->cobra_matriz,
            'valor_matriz' => $o->valor_matriz,
            'prazo_entrega_dias' => $o->prazo_entrega_dias,
            'validade_dias' => $o->validade_dias,
            ...$this->diasUteis->previsaoParaOrcamento($o),
            'tolerancia_qtd_pct' => $o->tolerancia_qtd_pct,
            'observacao' => $o->observacao,
            'enviado_em' => $o->enviado_em?->toIso8601String(),
            'visualizado_em' => $o->visualizado_em?->toIso8601String(),
            'decidido_em' => $o->decidido_em?->toIso8601String(),
            'canal_aprovacao' => $o->canal_aprovacao,
            'aceite_nome_cliente' => $o->aceite_nome_cliente,
            'aceite_faixa_index' => $o->aceite_faixa_index,
            'motivo_decisao' => $o->motivo_decisao,
            'financeiro_status' => $o->financeiro_status,
            'adiantamento_titulo_id' => $o->adiantamento_titulo_id,
            'pedido' => $o->relationLoaded('pedido') && $o->pedido
                ? [
                    'id' => $o->pedido->id,
                    'codigo' => $o->pedido->codigo,
                    'status' => $o->pedido->status,
                ]
                : null,
            'link_aprovacao' => $o->relationLoaded('linkAprovacao') && $o->linkAprovacao
                ? [
                    'ativo' => (bool) $o->linkAprovacao->ativo,
                    'expira_em' => $o->linkAprovacao->expira_em?->toIso8601String(),
                    'visualizacoes' => $o->linkAprovacao->visualizacoes,
                    'usado_em' => $o->linkAprovacao->usado_em?->toIso8601String(),
                    'destino_nome' => $o->linkAprovacao->destino_nome,
                    'destino_funcao' => $o->linkAprovacao->destino_funcao,
                    'canal_envio' => $o->linkAprovacao->canal_envio,
                    'url' => $o->linkAprovacao->ativo && $o->linkAprovacao->usado_em === null
                        ? $this->linkPublicoUrl($o->linkAprovacao->token)
                        : null,
                    // destino_envio (telefone/e-mail) só no painel de envio — não na listagem pública do ORC.
                ]
                : null,
            'parceiro' => $o->relationLoaded('parceiro') && $o->parceiro
                ? [
                    'id' => $o->parceiro->id,
                    'codigo' => $o->parceiro->codigo,
                    'razao_social' => $o->parceiro->razao_social,
                    'nome_fantasia' => $o->parceiro->nome_fantasia,
                    'is_prospect' => (bool) $o->parceiro->is_prospect,
                ]
                : null,
            'vendedor' => $o->relationLoaded('vendedor') && $o->vendedor
                ? [
                    'id' => $o->vendedor->id,
                    'codigo' => $o->vendedor->codigo,
                    'razao_social' => $o->vendedor->razao_social,
                    'nome_fantasia' => $o->vendedor->nome_fantasia,
                    'comissao_percentual' => $o->vendedor->comissao_percentual !== null
                        ? (string) $o->vendedor->comissao_percentual
                        : null,
                ]
                : null,
            'criado_por' => Orcamento::userStampFrom($o->criador),
            'atualizado_por' => Orcamento::userStampFrom($o->atualizador),
            'created_at' => $o->created_at?->toIso8601String(),
            'updated_at' => $o->updated_at?->toIso8601String(),
        ];
    }

    /** @param  array<string, mixed>  $result */
    private function extractValorPrimeiraFaixa(array $result): ?string
    {
        $valor = data_get($result, 'faixas.0.valor_etiqueta');
        if ($valor === null || $valor === '' || ! is_numeric($valor)) {
            return null;
        }

        return number_format((float) $valor, 4, '.', '');
    }

    /**
     * Rótulo operacional para UI (estudo: aceite comercial vs liberação financeira).
     * APROVADO + AGUARDA_ADIANTAMENTO → "Aguardando pagamento".
     */
    private function statusExibicao(Orcamento $o): string
    {
        if (
            $o->status === Orcamento::STATUS_APROVADO
            && $o->financeiro_status === AdiantamentoService::FIN_AGUARDA_ADIANTAMENTO
        ) {
            return 'AGUARDANDO_PAGAMENTO';
        }

        return $o->status;
    }

    private function linkPublicoUrl(string $token): string
    {
        $base = rtrim((string) config('erp.orcamento_public_base_url', config('app.url')), '/');

        return $base.'/p/'.$token;
    }
}
