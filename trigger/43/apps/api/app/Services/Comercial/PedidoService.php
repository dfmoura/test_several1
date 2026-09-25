<?php

namespace App\Services\Comercial;

use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Calendario\DiasUteisService;
use App\Services\Financeiro\AdiantamentoService;
use App\Support\CatalogoServicoSaida;
use App\Support\OrcamentoAceiteFaixas;
use App\Support\PadraoDecimal;
use App\Support\TipoOperacaoSaida;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Conversão ORC LIBERADO → PED (estudo 32 GERACAO_PEDIDO / ADR_PRODUCAO_PED_OP_ESTOQUE).
 */
class PedidoService
{
    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly DiasUteisService $diasUteis,
    ) {}

    /**
     * Idempotente: se ORC já tem PED, devolve; se LIBERADO, cria.
     */
    public function garantirDeOrcamentoLiberado(Orcamento $orcamento): ?Pedido
    {
        $orcamento->loadMissing(['empresa', 'parceiro', 'pedido']);

        if ($orcamento->pedido) {
            return $orcamento->pedido;
        }

        if ($orcamento->status !== Orcamento::STATUS_APROVADO) {
            return null;
        }

        if ($orcamento->financeiro_status !== AdiantamentoService::FIN_LIBERADO) {
            return null;
        }

        return $this->criarDeOrcamento($orcamento);
    }

    public function criarDeOrcamento(Orcamento $orcamento): Pedido
    {
        $orcamento->loadMissing(['empresa', 'parceiro']);

        if ($orcamento->status !== Orcamento::STATUS_APROVADO) {
            throw ValidationException::withMessages([
                'orcamento' => ['Pedido só nasce de orçamento APROVADO.'],
            ]);
        }

        if ($orcamento->financeiro_status !== AdiantamentoService::FIN_LIBERADO) {
            throw ValidationException::withMessages([
                'orcamento' => ['Pedido exige liberação financeira (crédito/sinal ok).'],
            ]);
        }

        if (! $orcamento->parceiro_id) {
            throw ValidationException::withMessages([
                'parceiro_id' => ['Orçamento sem parceiro cadastrado.'],
            ]);
        }

        $existente = Pedido::query()
            ->where('empresa_id', $orcamento->empresa_id)
            ->where('orcamento_id', $orcamento->id)
            ->first();
        if ($existente) {
            return $existente;
        }

        $faixaIndex = (int) ($orcamento->aceite_faixa_index ?? 0);
        $jobs = $this->jobsDoOrcamento($orcamento);
        $primeiro = $jobs[0];
        $ordemPrimeiro = (int) ($primeiro['ordem'] ?? 1);
        $faixaIndexPrimeiro = OrcamentoAceiteFaixas::indiceDoItem($orcamento, $ordemPrimeiro, $faixaIndex);
        $faixa = $this->faixaDoJob($primeiro['result'], $faixaIndexPrimeiro);
        $input = $primeiro['input'];

        return DB::transaction(function () use ($orcamento, $faixaIndex, $faixaIndexPrimeiro, $faixa, $input, $jobs) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode((int) $orcamento->empresa_id, 'PED-'.$ano, 5);

            $pedido = Pedido::query()->create([
                'empresa_id' => $orcamento->empresa_id,
                'codigo' => $codigo,
                'orcamento_id' => $orcamento->id,
                'parceiro_id' => $orcamento->parceiro_id,
                'vendedor_parceiro_id' => $orcamento->vendedor_parceiro_id,
                'status' => Pedido::STATUS_LIBERADO,
                'faixa_index' => $faixaIndexPrimeiro,
                'tolerancia_qtd_pct' => $this->toleranciaDoPedido($orcamento, $jobs),
                'prazo_entrega_dias' => $orcamento->prazo_entrega_dias,
                'snapshot' => [
                    'orcamento_codigo' => $orcamento->codigo,
                    'orcamento_versao' => $orcamento->versao,
                    'input' => $input,
                    'faixa' => $faixa,
                ],
                'observacao' => $orcamento->observacao,
            ]);

            foreach ($jobs as $i => $job) {
                $ordem = (int) ($job['ordem'] ?? ($i + 1));
                if ($ordem < 1) {
                    $ordem = $i + 1;
                }
                $idx = OrcamentoAceiteFaixas::indiceDoItem($orcamento, $ordem, $faixaIndex);
                $this->criarItemDeJob($orcamento, $pedido, $job, $idx, $ordem);
            }

            return $pedido->fresh(['itens.produtoPa', 'parceiro', 'orcamento']);
        });
    }

    /**
     * Confirma separação de item REV — sem OP. qtde faturável = pedida.
     *
     * @return array<string, mixed>
     */
    public function separarRevenda(Empresa $empresa, Pedido $pedido, PedidoItem $item): array
    {
        if ($pedido->empresa_id !== $empresa->id || $item->pedido_id !== $pedido->id) {
            abort(404);
        }

        if (! in_array($pedido->status, Pedido::STATUSES_ABRE_ORDEM, true)) {
            throw ValidationException::withMessages([
                'pedido' => ['Separação só com pedido LIBERADO ou EM_PRODUCAO.'],
            ]);
        }

        if ($item->necessidade !== PedidoItem::NEC_REVENDA) {
            throw ValidationException::withMessages([
                'pedido_item_id' => ['Só item de revenda se confirma por separação (sem OP).'],
            ]);
        }

        if ($item->status !== PedidoItem::STATUS_PENDENTE) {
            throw ValidationException::withMessages([
                'pedido_item_id' => ['Item de revenda já separado ou cancelado.'],
            ]);
        }

        return DB::transaction(function () use ($pedido, $item) {
            $qtde = PadraoDecimal::roundHalfUp((string) $item->qtde_pedida, PadraoDecimal::SCALE_QTY);
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    'quantidade' => ['Item de revenda sem quantidade válida.'],
                ]);
            }

            $item->qtde_produzida = $qtde;
            $item->qtde_faturavel = $qtde;
            $item->status = PedidoItem::STATUS_PRODUZIDO;
            $item->save();

            $pendentes = $pedido->itens()
                ->whereNotIn('status', [PedidoItem::STATUS_PRODUZIDO, PedidoItem::STATUS_CANCELADO])
                ->exists();
            if (! $pendentes) {
                $pedido->status = Pedido::STATUS_PRODUZIDO;
                $pedido->save();
            }

            $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
            $snap['separacao_revenda'] = [
                'pedido_item_id' => $item->id,
                'qtde' => $qtde,
                'em' => now()->toIso8601String(),
            ];
            $pedido->snapshot = $snap;
            $pedido->save();

            return $this->show($pedido->fresh([
                'itens.produtoPa',
                'parceiro',
                'orcamento',
                'ordensProducao',
                'ordensServico',
                'faturamento',
                'entrega',
            ]));
        });
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $status = null): array
    {
        $query = Pedido::query()
            ->where('empresa_id', $empresa->id)
            ->with(['parceiro:id,codigo,razao_social', 'vendedor:id,codigo,razao_social', 'orcamento:id,codigo', 'itens', 'faturamento'])
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like)
                    ->orWhereHas('parceiro', fn ($p) => $p->where('razao_social', 'like', $like))
                    ->orWhereHas('orcamento', fn ($o) => $o->where('codigo', 'like', $like));
            });
        }

        return $query->limit(200)->get()->map(fn (Pedido $p) => $this->toOut($p))->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Pedido $pedido): array
    {
        $pedido->load([
            'empresa:id,codigo,razao_social,nome_fantasia,cnpj,email,telefone,logradouro,numero,complemento,bairro,municipio,uf,cep',
            'parceiro:id,codigo,razao_social,nome_fantasia,cnpj_cpf,email,telefone,whatsapp,logradouro,numero,complemento,bairro,municipio,uf,cep',
            'vendedor:id,codigo,razao_social,nome_fantasia',
            'orcamento:id,codigo,status,financeiro_status,tolerancia_qtd_pct,vendedor_parceiro_id',
            'itens.produtoPa:id,codigo,descricao_fiscal',
            'ordensProducao.materiais',
            'ordensServico',
            'faturamento',
            'entrega:id,pedido_id,codigo,status',
            ...Pedido::userStampWith(),
        ]);

        return $this->toOut($pedido, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(Pedido $p, bool $detalhe = false): array
    {
        $out = [
            'id' => $p->id,
            'codigo' => $p->codigo,
            'status' => $p->status,
            'faixa_index' => $p->faixa_index,
            'tolerancia_qtd_pct' => (string) $p->tolerancia_qtd_pct,
            'prazo_entrega_dias' => $p->prazo_entrega_dias,
            ...$this->diasUteis->previsaoParaPedido($p),
            'observacao' => $p->observacao,
            'parceiro' => $p->parceiro ? [
                'id' => $p->parceiro->id,
                'codigo' => $p->parceiro->codigo,
                'razao_social' => $p->parceiro->razao_social,
            ] : null,
            'vendedor' => $p->vendedor ? [
                'id' => $p->vendedor->id,
                'codigo' => $p->vendedor->codigo,
                'razao_social' => $p->vendedor->razao_social,
            ] : null,
            'orcamento' => $p->orcamento ? [
                'id' => $p->orcamento->id,
                'codigo' => $p->orcamento->codigo,
                'status' => $p->orcamento->status ?? null,
                'financeiro_status' => $p->orcamento->financeiro_status ?? null,
            ] : null,
            'itens' => $p->itens->map(fn (PedidoItem $i) => [
                'id' => $i->id,
                'ordem' => $i->ordem,
                'necessidade' => $i->necessidade,
                'familia_fiscal' => $i->familia_fiscal,
                'descricao' => $i->descricao,
                'especificacao' => $i->especificacao,
                'faixa_index' => self::faixaIndexDoItem($i),
                'qtde_pedida' => (string) $i->qtde_pedida,
                'qtde_produzida' => (string) $i->qtde_produzida,
                'qtde_faturavel' => (string) $i->qtde_faturavel,
                'unidade' => $i->unidade,
                'preco_unitario' => $i->preco_unitario !== null ? (string) $i->preco_unitario : null,
                'valor_total' => $i->valor_total !== null ? (string) $i->valor_total : null,
                'status' => $i->status,
                'produto_pa' => $i->produtoPa ? [
                    'id' => $i->produtoPa->id,
                    'codigo' => $i->produtoPa->codigo,
                    'descricao_fiscal' => $i->produtoPa->descricao_fiscal,
                ] : null,
            ])->all(),
            'created_at' => optional($p->created_at)?->toIso8601String(),
            'updated_at' => optional($p->updated_at)?->toIso8601String(),
            'apto_faturar' => $p->status === Pedido::STATUS_FATURADO
                ? false
                : ($p->status === Pedido::STATUS_PRODUZIDO),
            'faturamento' => $p->relationLoaded('faturamento') && $p->faturamento
                ? [
                    'id' => $p->faturamento->id,
                    'codigo' => $p->faturamento->codigo,
                    'status' => $p->faturamento->status,
                    'nf_status' => $p->faturamento->nf_status,
                    'valor_bruto' => (string) $p->faturamento->valor_bruto,
                    'valor_adiantamento' => (string) $p->faturamento->valor_adiantamento,
                    'valor_a_cobrar' => (string) $p->faturamento->valor_a_cobrar,
                ]
                : null,
            'entrega' => $p->relationLoaded('entrega') && $p->entrega
                ? [
                    'id' => $p->entrega->id,
                    'codigo' => $p->entrega->codigo,
                    'status' => $p->entrega->status,
                ]
                : null,
        ];

        if ($detalhe) {
            $out['snapshot'] = $p->snapshot;
            $out['criado_por'] = Pedido::userStampFrom($p->criador);
            $out['atualizado_por'] = Pedido::userStampFrom($p->atualizador);
            $out['empresa'] = $this->empresaComercialOut($p);
            if ($p->parceiro) {
                $out['parceiro'] = array_merge($out['parceiro'] ?? [], [
                    'nome_fantasia' => $p->parceiro->nome_fantasia,
                    'cnpj_cpf' => $p->parceiro->cnpj_cpf,
                    'email' => $p->parceiro->email,
                    'telefone' => $p->parceiro->telefone,
                    'whatsapp' => $p->parceiro->whatsapp ?? null,
                    'logradouro' => $p->parceiro->logradouro,
                    'numero' => $p->parceiro->numero,
                    'complemento' => $p->parceiro->complemento,
                    'bairro' => $p->parceiro->bairro,
                    'municipio' => $p->parceiro->municipio,
                    'uf' => $p->parceiro->uf,
                    'cep' => $p->parceiro->cep,
                ]);
            }
            $out['ordens_producao'] = $p->ordensProducao->map(function ($o) {
                $mats = $o->relationLoaded('materiais') ? $o->materiais : collect();
                $pendentes = $mats->filter(fn ($m) => $m->saida_movimento_id === null)->count();
                $requisitados = $mats->filter(fn ($m) => $m->saida_movimento_id !== null)->count();

                return [
                    'id' => $o->id,
                    'codigo' => $o->codigo,
                    'status' => $o->status,
                    'pedido_item_id' => $o->pedido_item_id,
                    'qtde_planejada' => (string) $o->qtde_planejada,
                    'qtde_boa' => $o->qtde_boa !== null ? (string) $o->qtde_boa : null,
                    'materiais_resumo' => [
                        'total' => $mats->count(),
                        'pendentes' => $pendentes,
                        'requisitados' => $requisitados,
                    ],
                ];
            })->all();
            $out['ordens_servico'] = $p->ordensServico->map(fn ($o) => [
                'id' => $o->id,
                'codigo' => $o->codigo,
                'status' => $o->status,
                'pedido_item_id' => $o->pedido_item_id,
                'qtde_planejada' => (string) $o->qtde_planejada,
                'qtde_executada' => $o->qtde_executada !== null ? (string) $o->qtde_executada : null,
            ])->all();
        }

        return $out;
    }

    /**
     * Identidade comercial da EMP para confirmação de pedido ao cliente.
     *
     * @return array<string, mixed>|null
     */
    private function empresaComercialOut(Pedido $p): ?array
    {
        $emp = $p->relationLoaded('empresa') ? $p->empresa : null;
        if ($emp === null) {
            return null;
        }

        return [
            'id' => $emp->id,
            'codigo' => $emp->codigo,
            'razao_social' => $emp->razao_social,
            'nome_fantasia' => $emp->nome_fantasia,
            'cnpj' => $emp->cnpj,
            'email' => $emp->email,
            'telefone' => $emp->telefone,
            'logradouro' => $emp->logradouro,
            'numero' => $emp->numero,
            'complemento' => $emp->complemento,
            'bairro' => $emp->bairro,
            'municipio' => $emp->municipio,
            'uf' => $emp->uf,
            'cep' => $emp->cep,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function faixaAprovada(Orcamento $orcamento, int $faixaIndex): array
    {
        $faixas = $orcamento->result_snapshot['faixas'] ?? [];
        if (! is_array($faixas) || ! array_key_exists($faixaIndex, $faixas) || ! is_array($faixas[$faixaIndex])) {
            throw ValidationException::withMessages([
                'faixa_index' => ['Faixa aprovada inválida.'],
            ]);
        }

        return $faixas[$faixaIndex];
    }

    /**
     * @return list<array{ordem: int, input: array<string, mixed>, result: array<string, mixed>}>
     */
    private function jobsDoOrcamento(Orcamento $orcamento): array
    {
        $orcamento->loadMissing('itens');
        if ($orcamento->itens->isNotEmpty()) {
            return $orcamento->itens
                ->sortBy('ordem')
                ->values()
                ->map(static fn ($item) => [
                    'ordem' => (int) $item->ordem,
                    'input' => is_array($item->input_snapshot) ? $item->input_snapshot : [],
                    'result' => is_array($item->result_snapshot) ? $item->result_snapshot : [],
                ])
                ->all();
        }

        return [[
            'ordem' => 1,
            'input' => is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [],
            'result' => is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [],
        ]];
    }

    /**
     * @param  array<string, mixed>  $result
     * @return array<string, mixed>
     */
    private function faixaDoJob(array $result, int $faixaIndex): array
    {
        $faixas = $result['faixas'] ?? [];
        if (is_array($faixas) && isset($faixas[$faixaIndex]) && is_array($faixas[$faixaIndex])) {
            return $faixas[$faixaIndex];
        }
        if (is_array($faixas) && isset($faixas[0]) && is_array($faixas[0])) {
            return $faixas[0];
        }

        throw ValidationException::withMessages([
            'faixa_index' => ['Faixa aprovada inválida.'],
        ]);
    }

    /**
     * @param  array{input: array<string, mixed>, result: array<string, mixed>}  $job
     */
    private function criarItemDeJob(
        Orcamento $orcamento,
        Pedido $pedido,
        array $job,
        int $faixaIndex,
        int $ordem,
    ): PedidoItem {
        $input = $job['input'];
        $faixa = $this->faixaDoJob($job['result'], $faixaIndex);
        $necessidade = $this->resolverNecessidade($input);
        $tipoOp = TipoOperacaoSaida::fromInput($input['tipo_operacao'] ?? $necessidade);
        if ($tipoOp === TipoOperacaoSaida::SERVICO) {
            $necessidade = PedidoItem::NEC_SERVICO;
        }

        $travado = PrecoTravadoPedido::daFaixa($faixa);
        $qtde = $travado['qtde_faixa'];
        if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'quantidade' => ['Faixa aprovada sem quantidade válida.'],
            ]);
        }

        $servico = $necessidade === PedidoItem::NEC_SERVICO
            ? CatalogoServicoSaida::get((string) ($input['tipo_servico'] ?? CatalogoServicoSaida::AVULSO))
            : null;
        $produto = $this->resolverProdutoDoItem($orcamento->empresa, $necessidade, $input);

        $unidade = 'MIL';
        $familia = 'PA-ETQ';
        if ($servico !== null) {
            $familia = $servico['familia_fiscal'];
            $unidade = strtoupper(trim((string) ($input['unidade'] ?? $servico['unidade_padrao']))) ?: $servico['unidade_padrao'];
        } elseif ($necessidade === PedidoItem::NEC_SERVICO) {
            $familia = 'SVC';
            $unidade = 'UN';
        } elseif ($necessidade === PedidoItem::NEC_REVENDA) {
            $familia = strtoupper(trim((string) ($input['familia_fiscal'] ?? $produto?->grupo ?? 'REV'))) ?: 'REV';
            $unidade = strtoupper(trim((string) ($input['unidade'] ?? $produto?->unidade_comercial ?? 'UN'))) ?: 'UN';
        }

        return PedidoItem::query()->create([
            'empresa_id' => $orcamento->empresa_id,
            'pedido_id' => $pedido->id,
            'ordem' => $ordem,
            'necessidade' => $necessidade,
            'familia_fiscal' => $familia,
            'descricao' => $this->montarDescricao($input, $faixa),
            'especificacao' => $this->montarEspecificacao($input, $servico, $faixa, $faixaIndex),
            'qtde_pedida' => $qtde,
            'qtde_produzida' => '0',
            'qtde_faturavel' => '0',
            'unidade' => $unidade,
            'preco_unitario' => $travado['preco_unitario'],
            'valor_total' => $travado['valor_comercial'],
            'status' => PedidoItem::STATUS_PENDENTE,
            'produto_pa_id' => $produto?->id,
        ]);
    }

    /**
     * @param  list<array{input: array<string, mixed>, result: array<string, mixed>}>  $jobs
     */
    private function toleranciaDoPedido(Orcamento $orcamento, array $jobs): string
    {
        $soRevenda = $jobs !== [] && collect($jobs)->every(
            fn (array $job) => PedidoItem::isRevenda($this->resolverNecessidade($job['input']))
        );

        return $soRevenda ? '0' : (string) ($orcamento->tolerancia_qtd_pct ?? '20');
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function resolverNecessidade(array $input): string
    {
        $raw = strtoupper(trim((string) ($input['necessidade'] ?? $input['tipo_pedido'] ?? 'PRODUCAO')));
        if (in_array($raw, PedidoItem::NECESSIDADES, true)) {
            return $raw;
        }
        if (str_contains($raw, 'SERV')) {
            return PedidoItem::NEC_SERVICO;
        }
        if (str_contains($raw, 'REV')) {
            return PedidoItem::NEC_REVENDA;
        }

        return PedidoItem::NEC_PRODUCAO;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    private function resolverProdutoDoItem(?Empresa $empresa, string $necessidade, array $input): ?Produto
    {
        if ($empresa === null) {
            return null;
        }

        if ($necessidade === PedidoItem::NEC_REVENDA) {
            $id = (int) ($input['produto_id'] ?? 0);
            if ($id < 1) {
                return null;
            }

            return Produto::query()
                ->where('empresa_id', $empresa->id)
                ->whereKey($id)
                ->where('familia', 'REV')
                ->where('situacao', 'ATIVO')
                ->first();
        }

        if ($necessidade !== PedidoItem::NEC_PRODUCAO) {
            return null;
        }

        return Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'like', 'PA-ETQ%')
            ->where('situacao', 'ATIVO')
            ->orderBy('codigo')
            ->first();
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $faixa
     */
    private function montarDescricao(array $input, array $faixa): string
    {
        $revendaDesc = trim((string) ($input['produto_descricao'] ?? $input['produto_codigo'] ?? ''));
        if (PedidoItem::isRevenda($input['necessidade'] ?? null) && $revendaDesc !== '') {
            $codigo = trim((string) ($input['produto_codigo'] ?? ''));
            $label = $codigo !== '' && ! str_contains($revendaDesc, $codigo)
                ? $codigo.' · '.$revendaDesc
                : $revendaDesc;
            $q = isset($faixa['quantidade'])
                ? PadraoDecimal::roundHalfUp((string) $faixa['quantidade'], 0)
                : null;

            return mb_substr($q ? $label.' · Q '.$q : $label, 0, 255);
        }

        $servicoDesc = trim((string) ($input['descricao_servico'] ?? ''));
        if ($servicoDesc !== '') {
            $q = isset($faixa['quantidade'])
                ? PadraoDecimal::roundHalfUp((string) $faixa['quantidade'], 0)
                : null;

            return mb_substr($q ? $servicoDesc.' · Q '.$q : $servicoDesc, 0, 255);
        }

        $parts = array_filter([
            $input['medida'] ?? null,
            isset($input['papel']) ? (string) $input['papel'] : null,
            isset($input['cores']) ? $input['cores'].' cor(es)' : null,
            $input['acabamento'] ?? null,
            isset($faixa['quantidade']) ? 'Q '.PadraoDecimal::roundHalfUp((string) $faixa['quantidade'], 0) : null,
        ]);

        $desc = implode(' · ', $parts);

        return $desc !== '' ? mb_substr($desc, 0, 255) : 'Item do pedido';
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>|null  $servico
     * @param  array<string, mixed>  $faixa
     * @return array<string, mixed>
     */
    private function montarEspecificacao(array $input, ?array $servico, array $faixa, int $faixaIndex): array
    {
        $contrato = [
            'faixa_index' => $faixaIndex,
            'faixa' => $faixa,
        ];

        if (PedidoItem::isRevenda($input['necessidade'] ?? null)) {
            return [
                'tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO,
                'necessidade' => PedidoItem::NEC_REVENDA,
                'produto_id' => $input['produto_id'] ?? null,
                'produto_codigo' => $input['produto_codigo'] ?? null,
                'produto_descricao' => $input['produto_descricao'] ?? null,
                'familia_fiscal' => $input['familia_fiscal'] ?? null,
                'unidade' => $input['unidade'] ?? null,
                ...$contrato,
            ];
        }

        if ($servico !== null || TipoOperacaoSaida::isServico($input['tipo_operacao'] ?? $input['necessidade'] ?? null)) {
            $cat = $servico ?? CatalogoServicoSaida::get((string) ($input['tipo_servico'] ?? CatalogoServicoSaida::AVULSO));

            return [
                'tipo_operacao' => TipoOperacaoSaida::SERVICO,
                'tipo_servico' => $cat['codigo'],
                'descricao_servico' => $input['descricao_servico'] ?? $cat['descricao_padrao'],
                'material_cliente' => (bool) ($input['material_cliente'] ?? $cat['material_cliente_padrao']),
                'unidade' => $input['unidade'] ?? $cat['unidade_padrao'],
                'horas_maquina' => $input['horas_maquina'] ?? null,
                'maquina' => $input['maquina'] ?? null,
                'cessao_bem_id' => $input['cessao_bem_id'] ?? null,
                'codigo_tributacao_nacional_iss' => $input['codigo_tributacao_nacional_iss'] ?? $cat['codigo_tributacao_nacional_iss'],
                'codigo_nbs' => $input['codigo_nbs'] ?? $cat['codigo_nbs'],
                ...$contrato,
            ];
        }

        return [
            'tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO,
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'medida' => $input['medida'] ?? null,
            'papel' => $input['papel'] ?? null,
            'cores' => $input['cores'] ?? null,
            'acabamento' => $input['acabamento'] ?? null,
            'maquina' => $input['maquina'] ?? null,
            'tubete' => $input['tubete'] ?? null,
            'etiq_por_rolo' => $input['etiq_por_rolo'] ?? null,
            'largura_cm' => $input['largura_cm'] ?? null,
            'puxada_cm' => $input['puxada_cm'] ?? null,
            'z' => $input['z'] ?? null,
            'colunas' => $input['colunas'] ?? null,
            'formato_faca' => $input['formato_faca'] ?? null,
            'faca_nova' => $input['faca_nova'] ?? $faixa['faca_nova'] ?? null,
            'saida_etiqueta' => $input['saida_etiqueta'] ?? null,
            'facas' => $input['facas'] ?? $faixa['facas'] ?? null,
            'modelos_composicao' => $input['modelos_composicao'] ?? null,
            'modelos_composicao_quantidades' => $input['modelos_composicao_quantidades'] ?? null,
            ...$contrato,
        ];
    }

    public static function faixaIndexDoItem(PedidoItem $item): ?int
    {
        $spec = is_array($item->especificacao) ? $item->especificacao : [];
        if (! array_key_exists('faixa_index', $spec) || $spec['faixa_index'] === null) {
            return null;
        }

        return (int) $spec['faixa_index'];
    }
}
