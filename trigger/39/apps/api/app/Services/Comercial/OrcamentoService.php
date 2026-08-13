<?php

namespace App\Services\Comercial;

use App\Models\Empresa;
use App\Models\MatrizCobrada;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Comercial\Orcamento\OrcamentoCatalogo;
use App\Services\Comercial\Orcamento\OrcamentoMotor;
use App\Services\Financeiro\AdiantamentoService;
use App\Support\ModelosComposicao;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrcamentoService
{
    public function __construct(
        private readonly OrcamentoMotor $motor,
        private readonly CodigoGenerator $codigoGenerator,
        private readonly AuditLogger $audit,
    ) {}

    /** @return array<string, mixed> */
    public function catalogMeta(): array
    {
        return OrcamentoCatalogo::load()->metaForUi();
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
        $input = $this->buildMotorInput($data, $parceiro, $empresa);

        return $this->enrichResult($this->motor->calcular($input), $data);
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
            'linkAprovacao',
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
        $input = $this->buildMotorInput($data, $parceiro, $empresa);
        $result = $this->enrichResult($this->motor->calcular($input), $data);

        $orcamento = DB::transaction(function () use ($empresa, $parceiro, $data, $input, $result) {
            $ano = (int) now()->year;
            $prefix = 'ORC-'.$ano;
            $codigo = $this->codigoGenerator->nextCode($empresa->id, $prefix, 5);
            // nextCode → ORC-2026-00001; extrai número
            $parts = explode('-', $codigo);
            $numero = (int) end($parts);

            $snapshotInput = $this->persistableInput($input, $data);

            $orc = Orcamento::query()->create([
                'empresa_id' => $empresa->id,
                'ano' => $ano,
                'numero' => $numero,
                'codigo' => $codigo,
                'versao' => 1,
                'parceiro_id' => $parceiro->id,
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
        $input = $this->buildMotorInput($data, $parceiro, $empresa);
        $result = $this->enrichResult($this->motor->calcular($input), $data);

        $before = [
            'versao' => $orcamento->versao,
            'status' => $orcamento->status,
            'parceiro_id' => $orcamento->parceiro_id,
        ];

        DB::transaction(function () use ($orcamento, $parceiro, $data, $input, $result, $before) {
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
                'cliente_nome' => $parceiro->razao_social,
                'status' => Orcamento::STATUS_CALCULADO,
                'input_snapshot' => $this->persistableInput($input, $data),
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

        return $this->show($orcamento->fresh(['parceiro']));
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
     * @return array<string, mixed>
     */
    private function buildMotorInput(array $data, Parceiro $parceiro, Empresa $empresa): array
    {
        $data = ModelosComposicao::ensureInPayload($data);

        $input = [
            'cliente' => $parceiro->razao_social,
            'parceiro_id' => $parceiro->id,
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
    private function persistableInput(array $input, array $data): array
    {
        unset($input['matriz_ja_cobrada']);

        return array_merge($input, [
            'prazo_entrega_dias' => (int) ($data['prazo_entrega_dias'] ?? 12),
            'validade_dias' => (int) ($data['validade_dias'] ?? 7),
            'tolerancia_qtd_pct' => (float) ($data['tolerancia_qtd_pct'] ?? 20),
            'observacao' => $data['observacao'] ?? null,
            'condicao_pagamento' => $this->nullIfEmpty($data['condicao_pagamento'] ?? null),
            'forma_pagamento' => $this->nullIfEmpty($data['forma_pagamento'] ?? null),
            'faca_nova' => (bool) ($data['faca_nova'] ?? $input['faca_nova'] ?? false),
            'formato_faca' => $data['formato_faca'] ?? $input['formato_faca'] ?? null,
            'valor_faca_nova' => (float) ($data['valor_faca_nova'] ?? $input['valor_faca_nova'] ?? 0),
            'prazo_faca_dias' => array_key_exists('prazo_faca_dias', $data)
                ? ($data['prazo_faca_dias'] !== null ? (int) $data['prazo_faca_dias'] : null)
                : ($input['prazo_faca_dias'] ?? null),
        ]);
    }

    private function nullIfEmpty(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

    /**
     * Anexa metadados de FACA NOVA ao result sem alterar fórmulas R1–R20 do motor.
     *
     * @param  array<string, mixed>  $result
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function enrichResult(array $result, array $data): array
    {
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

        return $result;
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
            'cliente_nome' => $o->cliente_nome,
            'status' => $o->status,
            'status_exibicao' => $this->statusExibicao($o),
            'editavel' => $o->isEditavel(),
            'enviavel' => $o->isEnviavel(),
            'aguardando_cliente' => $o->aguardandoCliente(),
            'input_snapshot' => $o->input_snapshot,
            'result_snapshot' => $o->result_snapshot,
            'chave_matriz' => $o->chave_matriz,
            'cobra_matriz' => $o->cobra_matriz,
            'valor_matriz' => $o->valor_matriz,
            'prazo_entrega_dias' => $o->prazo_entrega_dias,
            'validade_dias' => $o->validade_dias,
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
            'link_aprovacao' => $o->relationLoaded('linkAprovacao') && $o->linkAprovacao
                ? [
                    'ativo' => (bool) $o->linkAprovacao->ativo,
                    'expira_em' => $o->linkAprovacao->expira_em?->toIso8601String(),
                    'visualizacoes' => $o->linkAprovacao->visualizacoes,
                    'usado_em' => $o->linkAprovacao->usado_em?->toIso8601String(),
                    'destino_nome' => $o->linkAprovacao->destino_nome,
                    'destino_funcao' => $o->linkAprovacao->destino_funcao,
                    'canal_envio' => $o->linkAprovacao->canal_envio,
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
}
