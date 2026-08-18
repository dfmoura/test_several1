<?php

namespace App\Services\Financeiro;

use App\Models\Comissao;
use App\Models\ComissaoFechamento;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Pedido;
use App\Models\Titulo;
use App\Models\TituloBaixa;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Comercial\PrecoTravadoPedido;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Apuração COM- sobre RECEBIDO (estudo 32 / ADR_COMISSAO_VENDEDOR).
 */
class ComissaoService
{
    public const ORIGEM_TITULO = 'COMISSAO';

    public const NAT_COMISSAO = '3.01.05';

    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly TituloService $titulos,
    ) {}

    /**
     * BX de TIT RECEBER da venda (origem FATURA) → COM- PREVISTA.
     */
    public function apurarBaixa(Titulo $titulo, TituloBaixa $baixa): ?Comissao
    {
        if ($titulo->tipo !== Titulo::TIPO_RECEBER) {
            return $this->marcarPagasSeTituloComissao($titulo);
        }

        if ($titulo->origem !== FaturamentoService::ORIGEM_FATURA) {
            return null;
        }

        if (! $titulo->pedido_id || ! $titulo->faturamento_id) {
            return null;
        }

        $pedido = Pedido::query()->with(['orcamento', 'faturamento'])->find($titulo->pedido_id);
        if ($pedido === null) {
            return null;
        }

        $politica = $this->politicaDoPedido($pedido);
        if ($politica === null) {
            return null;
        }

        $fat = $pedido->faturamento;
        if ($fat === null || $fat->status !== Faturamento::STATUS_CONFIRMADO) {
            return null;
        }

        $key = 'BX:'.$baixa->id;

        return DB::transaction(function () use ($titulo, $baixa, $pedido, $fat, $politica, $key) {
            return $this->gravarApuracao(
                $pedido,
                $fat,
                $politica,
                $key,
                Comissao::ORIGEM_BAIXA,
                (string) $baixa->valor,
                $titulo->id,
                $baixa->id,
            );
        });
    }

    /**
     * Sinal já quitado é apropriado no FAT — gera COM- na parcela das etiquetas.
     */
    public function apurarApropriacaoSinal(Pedido $pedido, Faturamento $fat): ?Comissao
    {
        $politica = $this->politicaDoPedido($pedido);
        if ($politica === null) {
            return null;
        }

        $sinal = PadraoDecimal::roundHalfUp((string) ($fat->valor_adiantamento ?? '0'), PadraoDecimal::SCALE_MONEY);
        if (bccomp($sinal, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            return null;
        }

        $key = 'FAT-SINAL:'.$fat->id;
        $adiTituloId = $fat->adiantamento_titulo_id ? (int) $fat->adiantamento_titulo_id : null;

        return $this->gravarApuracao(
            $pedido,
            $fat,
            $politica,
            $key,
            Comissao::ORIGEM_APROPRIACAO_SINAL,
            $sinal,
            $adiTituloId,
            null,
        );
    }

    public function temComissaoNaoPrevista(int $empresaId, int $faturamentoId): bool
    {
        return Comissao::query()
            ->where('empresa_id', $empresaId)
            ->where('faturamento_id', $faturamentoId)
            ->where('status', '!=', Comissao::STATUS_ESTORNADA)
            ->where('status', '!=', Comissao::STATUS_PREVISTA)
            ->exists();
    }

    /**
     * @return list<Comissao>
     */
    public function estornarDoFaturamento(Faturamento $fat, string $motivo): array
    {
        if ($this->temComissaoNaoPrevista((int) $fat->empresa_id, (int) $fat->id)) {
            throw ValidationException::withMessages([
                'comissao' => ['Há comissão já liberada ou paga neste faturamento — não é possível estornar.'],
            ]);
        }

        $rows = Comissao::query()
            ->where('empresa_id', $fat->empresa_id)
            ->where('faturamento_id', $fat->id)
            ->where('status', Comissao::STATUS_PREVISTA)
            ->lockForUpdate()
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $row->status = Comissao::STATUS_ESTORNADA;
            $row->estornada_em = now();
            $row->estornada_por = Auth::id();
            $obs = trim((string) $row->observacao);
            $nota = 'Estorno FAT: '.$motivo;
            $row->observacao = $obs === '' ? $nota : $obs.' · '.$nota;
            $row->save();
            $out[] = $row;
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, array $filters = []): array
    {
        $q = Comissao::query()
            ->with([
                'vendedor:id,codigo,razao_social,nome_fantasia',
                'pedido:id,codigo',
                'orcamento:id,codigo',
                'faturamento:id,codigo',
                'titulo:id,codigo',
                'fechamento:id,codigo,status',
                ...Comissao::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if (! empty($filters['status'])) {
            $q->where('status', $filters['status']);
        }
        if (! empty($filters['vendedor_parceiro_id'])) {
            $q->where('vendedor_parceiro_id', (int) $filters['vendedor_parceiro_id']);
        }
        if (! empty($filters['pedido_id'])) {
            $q->where('pedido_id', (int) $filters['pedido_id']);
        }
        if (! empty($filters['q'])) {
            $term = '%'.$filters['q'].'%';
            $q->where(function ($inner) use ($term) {
                $inner->where('codigo', 'like', $term)
                    ->orWhereHas('vendedor', function ($v) use ($term) {
                        $v->where('razao_social', 'like', $term)
                            ->orWhere('codigo', 'like', $term);
                    })
                    ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', $term));
            });
        }

        return $q->limit(400)->get()->map(fn (Comissao $c) => $this->toOut($c))->all();
    }

    /** @return array<string, mixed> */
    public function resumoPedido(Empresa $empresa, Pedido $pedido): array
    {
        if ($pedido->empresa_id !== $empresa->id) {
            abort(404);
        }

        $pedido->loadMissing(['orcamento', 'faturamento', 'parceiro:id,codigo,razao_social']);
        $politica = $this->politicaDoPedido($pedido);
        $linhas = Comissao::query()
            ->with(['vendedor:id,codigo,razao_social,nome_fantasia', 'fechamento:id,codigo,status'])
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->orderBy('id')
            ->get();

        $soma = ['PREVISTA' => '0.00', 'LIBERADA' => '0.00', 'PAGA' => '0.00', 'ESTORNADA' => '0.00'];
        foreach ($linhas as $c) {
            if (! isset($soma[$c->status])) {
                continue;
            }
            $soma[$c->status] = PadraoDecimal::roundHalfUp(
                bcadd($soma[$c->status], (string) $c->valor, PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            );
        }

        $potencial = '0.00';
        if ($politica !== null && $pedido->faturamento) {
            $potencial = $politica['comissao_total'];
        } elseif ($politica !== null) {
            $potencial = null;
        }

        return [
            'pedido_id' => $pedido->id,
            'pedido_codigo' => $pedido->codigo,
            'vendedor' => $politica['vendedor'] ?? ($pedido->orcamento?->vendedor_parceiro_id ? [
                'id' => $pedido->orcamento->vendedor_parceiro_id,
            ] : null),
            'aliquota' => $politica['aliquota'] ?? null,
            'base_etiquetas' => $politica['base_etiquetas'] ?? null,
            'comissao_potencial' => $potencial,
            'totais' => $soma,
            'linhas' => $linhas->map(fn (Comissao $c) => $this->toOut($c))->all(),
            'elegivel' => $politica !== null,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function fechar(Empresa $empresa, array $data): array
    {
        $ids = array_values(array_unique(array_map('intval', $data['comissao_ids'] ?? [])));
        $inicio = $this->nullIfEmpty($data['periodo_inicio'] ?? null);
        $fim = $this->nullIfEmpty($data['periodo_fim'] ?? null);
        $vencimento = $this->nullIfEmpty($data['vencimento'] ?? null) ?? now()->toDateString();
        $obs = $this->nullIfEmpty($data['observacao'] ?? null);

        $fechamento = DB::transaction(function () use ($empresa, $ids, $inicio, $fim, $vencimento, $obs) {
            $q = Comissao::query()
                ->where('empresa_id', $empresa->id)
                ->where('status', Comissao::STATUS_PREVISTA)
                ->lockForUpdate();

            if ($ids !== []) {
                $q->whereIn('id', $ids);
            } else {
                if ($inicio) {
                    $q->whereDate('created_at', '>=', $inicio);
                }
                if ($fim) {
                    $q->whereDate('created_at', '<=', $fim);
                }
            }

            $linhas = $q->orderBy('id')->get();
            if ($linhas->isEmpty()) {
                throw ValidationException::withMessages([
                    'comissao_ids' => ['Nenhuma comissão prevista para liberar neste filtro.'],
                ]);
            }

            if ($ids !== [] && $linhas->count() !== count($ids)) {
                throw ValidationException::withMessages([
                    'comissao_ids' => ['Uma ou mais comissões não estão previstas nesta EMP.'],
                ]);
            }

            $total = '0.00';
            foreach ($linhas as $c) {
                $total = PadraoDecimal::roundHalfUp(
                    bcadd($total, (string) $c->valor, PadraoDecimal::SCALE_MONEY + 2),
                    PadraoDecimal::SCALE_MONEY
                );
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'CFE-'.$ano, 5);

            $fechamento = ComissaoFechamento::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'status' => ComissaoFechamento::STATUS_ABERTO,
                'periodo_inicio' => $inicio,
                'periodo_fim' => $fim,
                'vencimento' => $vencimento,
                'valor_total' => $total,
                'observacao' => $obs,
                'liberado_em' => now(),
                'liberado_por' => Auth::id(),
            ]);

            foreach ($linhas as $c) {
                $c->status = Comissao::STATUS_LIBERADA;
                $c->fechamento_id = $fechamento->id;
                $c->save();
            }

            return $fechamento;
        });

        return $this->fechamentoToOut($fechamento->fresh(['comissoes.vendedor']));
    }

    /** @return array<string, mixed> */
    public function gerarPagamento(Empresa $empresa, ComissaoFechamento $fechamento): array
    {
        if ($fechamento->empresa_id !== $empresa->id) {
            abort(404);
        }

        $out = DB::transaction(function () use ($empresa, $fechamento) {
            $locked = ComissaoFechamento::query()->lockForUpdate()->findOrFail($fechamento->id);
            if ($locked->status === ComissaoFechamento::STATUS_TITULO_GERADO
                || $locked->status === ComissaoFechamento::STATUS_PAGO) {
                return $locked;
            }
            if ($locked->status !== ComissaoFechamento::STATUS_ABERTO) {
                throw ValidationException::withMessages([
                    'fechamento' => ['Fechamento '.$locked->codigo.' não está aberto para gerar pagamento.'],
                ]);
            }

            $natureza = $this->naturezaComissao();
            $vencimento = optional($locked->vencimento)?->format('Y-m-d') ?? now()->toDateString();
            $emissao = now()->toDateString();

            $linhas = Comissao::query()
                ->where('fechamento_id', $locked->id)
                ->where('status', Comissao::STATUS_LIBERADA)
                ->lockForUpdate()
                ->orderBy('id')
                ->get();

            if ($linhas->isEmpty()) {
                throw ValidationException::withMessages([
                    'fechamento' => ['Fechamento sem comissões liberadas.'],
                ]);
            }

            $porVendedor = [];
            foreach ($linhas as $c) {
                $vid = (int) $c->vendedor_parceiro_id;
                if (! isset($porVendedor[$vid])) {
                    $porVendedor[$vid] = ['valor' => '0.00', 'ids' => []];
                }
                $porVendedor[$vid]['valor'] = PadraoDecimal::roundHalfUp(
                    bcadd($porVendedor[$vid]['valor'], (string) $c->valor, PadraoDecimal::SCALE_MONEY + 2),
                    PadraoDecimal::SCALE_MONEY
                );
                $porVendedor[$vid]['ids'][] = $c->id;
            }

            foreach ($porVendedor as $vid => $grupo) {
                $titulo = $this->titulos->criarPagarComissao(
                    $empresa,
                    (int) $vid,
                    $natureza,
                    $grupo['valor'],
                    $emissao,
                    $vencimento,
                    $locked->codigo,
                    'Comissão '.$locked->codigo,
                );
                Comissao::query()->whereIn('id', $grupo['ids'])->update([
                    'titulo_pagar_id' => $titulo->id,
                ]);
            }

            $locked->status = ComissaoFechamento::STATUS_TITULO_GERADO;
            $locked->save();

            return $locked;
        });

        return $this->fechamentoToOut($out->fresh(['comissoes.vendedor', 'comissoes.tituloPagar']));
    }

    /** @return array<string, mixed> */
    public function cancelarFechamento(Empresa $empresa, ComissaoFechamento $fechamento, string $motivo): array
    {
        if ($fechamento->empresa_id !== $empresa->id) {
            abort(404);
        }
        $motivo = trim($motivo);
        if (mb_strlen($motivo) < 3) {
            throw ValidationException::withMessages([
                'motivo' => ['Informe o motivo (mínimo 3 caracteres).'],
            ]);
        }

        $out = DB::transaction(function () use ($fechamento, $motivo) {
            $locked = ComissaoFechamento::query()->lockForUpdate()->findOrFail($fechamento->id);
            if ($locked->status === ComissaoFechamento::STATUS_CANCELADO) {
                return $locked;
            }
            if ($locked->status === ComissaoFechamento::STATUS_PAGO) {
                throw ValidationException::withMessages([
                    'fechamento' => ['Fechamento já pago — não cancela.'],
                ]);
            }

            $linhas = Comissao::query()
                ->where('fechamento_id', $locked->id)
                ->lockForUpdate()
                ->get();

            $titulos = [];
            foreach ($linhas as $c) {
                if ($c->titulo_pagar_id) {
                    $titulos[$c->titulo_pagar_id] = true;
                }
            }

            foreach (array_keys($titulos) as $tid) {
                $tit = Titulo::query()->lockForUpdate()->find($tid);
                if ($tit === null) {
                    continue;
                }
                if ($tit->status !== Titulo::STATUS_ABERTO) {
                    throw ValidationException::withMessages([
                        'fechamento' => ['Título '.$tit->codigo.' já movimentado — não é possível cancelar o fechamento.'],
                    ]);
                }
                $this->titulos->cancelarAberto($tit, $motivo);
            }

            foreach ($linhas as $c) {
                $c->status = Comissao::STATUS_PREVISTA;
                $c->fechamento_id = null;
                $c->titulo_pagar_id = null;
                $c->save();
            }

            $locked->status = ComissaoFechamento::STATUS_CANCELADO;
            $locked->cancelado_em = now();
            $locked->cancelado_por = Auth::id();
            $locked->motivo_cancelamento = $motivo;
            $locked->save();

            return $locked;
        });

        return $this->fechamentoToOut($out->fresh(['comissoes.vendedor']));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listFechamentos(Empresa $empresa): array
    {
        return ComissaoFechamento::query()
            ->with(['comissoes.vendedor:id,codigo,razao_social'])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (ComissaoFechamento $f) => $this->fechamentoToOut($f))
            ->all();
    }

    /** @return array<string, mixed> */
    public function showFechamento(ComissaoFechamento $fechamento): array
    {
        $fechamento->loadMissing(['comissoes.vendedor', 'comissoes.tituloPagar', 'comissoes.pedido']);

        return $this->fechamentoToOut($fechamento);
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(Comissao $c): array
    {
        $c->loadMissing([
            'vendedor:id,codigo,razao_social,nome_fantasia',
            'pedido:id,codigo',
            'orcamento:id,codigo',
            'faturamento:id,codigo',
            'titulo:id,codigo',
            'fechamento:id,codigo,status',
            'tituloPagar:id,codigo,status,saldo',
            ...Comissao::userStampWith(),
        ]);

        return [
            'id' => $c->id,
            'codigo' => $c->codigo,
            'status' => $c->status,
            'origem_evento' => $c->origem_evento,
            'aliquota' => (string) $c->aliquota,
            'base_valor' => (string) $c->base_valor,
            'valor' => (string) $c->valor,
            'observacao' => $c->observacao,
            'vendedor' => $c->vendedor ? [
                'id' => $c->vendedor->id,
                'codigo' => $c->vendedor->codigo,
                'razao_social' => $c->vendedor->razao_social,
                'nome_fantasia' => $c->vendedor->nome_fantasia,
            ] : null,
            'pedido' => $c->pedido ? ['id' => $c->pedido->id, 'codigo' => $c->pedido->codigo] : null,
            'orcamento' => $c->orcamento ? ['id' => $c->orcamento->id, 'codigo' => $c->orcamento->codigo] : null,
            'faturamento' => $c->faturamento ? ['id' => $c->faturamento->id, 'codigo' => $c->faturamento->codigo] : null,
            'titulo' => $c->titulo ? ['id' => $c->titulo->id, 'codigo' => $c->titulo->codigo] : null,
            'fechamento' => $c->fechamento ? [
                'id' => $c->fechamento->id,
                'codigo' => $c->fechamento->codigo,
                'status' => $c->fechamento->status,
            ] : null,
            'titulo_pagar' => $c->tituloPagar ? [
                'id' => $c->tituloPagar->id,
                'codigo' => $c->tituloPagar->codigo,
                'status' => $c->tituloPagar->status,
                'saldo' => (string) $c->tituloPagar->saldo,
            ] : null,
            'created_at' => optional($c->created_at)?->toIso8601String(),
            'criado_por' => Comissao::userStampFrom($c->criador),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function fechamentoToOut(ComissaoFechamento $f): array
    {
        $f->loadMissing(['comissoes.vendedor', 'comissoes.tituloPagar']);

        return [
            'id' => $f->id,
            'codigo' => $f->codigo,
            'status' => $f->status,
            'periodo_inicio' => optional($f->periodo_inicio)?->format('Y-m-d'),
            'periodo_fim' => optional($f->periodo_fim)?->format('Y-m-d'),
            'vencimento' => optional($f->vencimento)?->format('Y-m-d'),
            'valor_total' => (string) $f->valor_total,
            'observacao' => $f->observacao,
            'liberado_em' => optional($f->liberado_em)?->toIso8601String(),
            'comissoes' => $f->comissoes->map(fn (Comissao $c) => $this->toOut($c))->values()->all(),
            'created_at' => optional($f->created_at)?->toIso8601String(),
        ];
    }

    /**
     * @param  array{vendedor_id: int, vendedor: array<string, mixed>, aliquota: string, base_etiquetas: string, valor_bruto: string, comissao_total: string}  $politica
     */
    private function gravarApuracao(
        Pedido $pedido,
        Faturamento $fat,
        array $politica,
        string $key,
        string $origem,
        string $valorEvento,
        ?int $tituloId,
        ?int $baixaId,
    ): ?Comissao {
        $existente = Comissao::query()
            ->where('empresa_id', $pedido->empresa_id)
            ->where('idempotency_key', $key)
            ->first();
        if ($existente) {
            return $existente;
        }

        $bruto = $politica['valor_bruto'];
        if (bccomp($bruto, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            return null;
        }

        $evento = PadraoDecimal::roundHalfUp($valorEvento, PadraoDecimal::SCALE_MONEY);
        if (bccomp($evento, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            return null;
        }

        $base = PadraoDecimal::roundHalfUp(
            bcdiv(
                bcmul($evento, $politica['base_etiquetas'], PadraoDecimal::SCALE_MONEY + 4),
                $bruto,
                PadraoDecimal::SCALE_MONEY + 4
            ),
            PadraoDecimal::SCALE_MONEY
        );

        $valor = PadraoDecimal::roundHalfUp(
            bcdiv(
                bcmul($evento, $politica['comissao_total'], PadraoDecimal::SCALE_MONEY + 4),
                $bruto,
                PadraoDecimal::SCALE_MONEY + 4
            ),
            PadraoDecimal::SCALE_MONEY
        );

        $ja = $this->somaVigenteDoFaturamento((int) $pedido->empresa_id, (int) $fat->id);
        $recebido = $this->valorJaRecebidoDaVenda($fat, $evento, $origem);
        $completa = bccomp($recebido, $bruto, PadraoDecimal::SCALE_MONEY) >= 0;
        if ($completa) {
            $resto = PadraoDecimal::roundHalfUp(
                bcsub($politica['comissao_total'], $ja, PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            );
            if (bccomp($resto, '0', PadraoDecimal::SCALE_MONEY) >= 0) {
                $valor = $resto;
            }
        }

        if (bccomp($valor, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            return null;
        }

        $ano = (int) now()->year;
        $codigo = $this->codigos->nextCode((int) $pedido->empresa_id, 'COM-'.$ano, 5);

        return Comissao::query()->create([
            'empresa_id' => $pedido->empresa_id,
            'codigo' => $codigo,
            'idempotency_key' => $key,
            'vendedor_parceiro_id' => $politica['vendedor_id'],
            'orcamento_id' => $pedido->orcamento_id,
            'pedido_id' => $pedido->id,
            'faturamento_id' => $fat->id,
            'titulo_id' => $tituloId,
            'baixa_id' => $baixaId,
            'origem_evento' => $origem,
            'status' => Comissao::STATUS_PREVISTA,
            'aliquota' => $politica['aliquota'],
            'base_valor' => $base,
            'valor' => $valor,
        ]);
    }

    /**
     * @return array{vendedor_id: int, vendedor: array<string, mixed>, aliquota: string, base_etiquetas: string, valor_bruto: string, comissao_total: string}|null
     */
    private function politicaDoPedido(Pedido $pedido): ?array
    {
        $pedido->loadMissing(['orcamento', 'faturamento']);
        $input = is_array($pedido->snapshot['input'] ?? null) ? $pedido->snapshot['input'] : [];
        $faixa = is_array($pedido->snapshot['faixa'] ?? null) ? $pedido->snapshot['faixa'] : [];

        $vid = $pedido->vendedor_parceiro_id
            ?? $pedido->orcamento?->vendedor_parceiro_id
            ?? ($input['vendedor_parceiro_id'] ?? null);
        $vid = $vid !== null && $vid !== '' ? (int) $vid : 0;
        if ($vid <= 0) {
            return null;
        }

        $aliquota = $this->aliquotaFaixa($pedido, $input, $faixa);
        if (bccomp($aliquota, '0', PadraoDecimal::SCALE_PERCENT) <= 0) {
            return null;
        }

        $fat = $pedido->faturamento;
        $snapFat = is_array($fat?->snapshot) ? $fat->snapshot : [];
        $baseEtq = PrecoTravadoPedido::fromMixed($snapFat['valor_itens'] ?? null, PadraoDecimal::SCALE_MONEY)
            ?? PrecoTravadoPedido::fromMixed($faixa['valor_etiqueta'] ?? null, PadraoDecimal::SCALE_MONEY)
            ?? '0.00';
        $bruto = $fat
            ? PadraoDecimal::roundHalfUp((string) $fat->valor_bruto, PadraoDecimal::SCALE_MONEY)
            : $baseEtq;

        if (bccomp($baseEtq, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            return null;
        }

        $comissaoTotal = PadraoDecimal::roundHalfUp(
            bcdiv(
                bcmul($baseEtq, $aliquota, PadraoDecimal::SCALE_PERCENT + 4),
                '100',
                PadraoDecimal::SCALE_MONEY + 4
            ),
            PadraoDecimal::SCALE_MONEY
        );

        $par = \App\Models\Parceiro::query()
            ->whereKey($vid)
            ->first(['id', 'codigo', 'razao_social', 'nome_fantasia']);

        return [
            'vendedor_id' => $vid,
            'vendedor' => $par ? [
                'id' => $par->id,
                'codigo' => $par->codigo,
                'razao_social' => $par->razao_social,
                'nome_fantasia' => $par->nome_fantasia,
            ] : ['id' => $vid],
            'aliquota' => $aliquota,
            'base_etiquetas' => $baseEtq,
            'valor_bruto' => $bruto,
            'comissao_total' => $comissaoTotal,
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $faixa
     */
    private function aliquotaFaixa(Pedido $pedido, array $input, array $faixa): string
    {
        $idx = (int) $pedido->faixa_index;
        $faixas = is_array($input['faixas'] ?? null) ? $input['faixas'] : [];
        $pct = $faixas[$idx]['comissao_pct'] ?? $faixa['comissao_pct'] ?? $input['comissao_aliquota'] ?? 0;

        $parsed = PrecoTravadoPedido::fromMixed($pct, PadraoDecimal::SCALE_PERCENT);

        return $parsed ?? '0.0000';
    }

    private function somaVigenteDoFaturamento(int $empresaId, int $faturamentoId): string
    {
        $sum = Comissao::query()
            ->where('empresa_id', $empresaId)
            ->where('faturamento_id', $faturamentoId)
            ->whereNotIn('status', [Comissao::STATUS_ESTORNADA])
            ->sum('valor');

        return PadraoDecimal::roundHalfUp((string) $sum, PadraoDecimal::SCALE_MONEY);
    }

    private function valorJaRecebidoDaVenda(Faturamento $fat, string $eventoAtual, string $origem): string
    {
        $sinal = PadraoDecimal::roundHalfUp((string) ($fat->valor_adiantamento ?? '0'), PadraoDecimal::SCALE_MONEY);
        $baixadoFatura = '0.00';

        $tits = Titulo::query()
            ->where('faturamento_id', $fat->id)
            ->where('origem', FaturamentoService::ORIGEM_FATURA)
            ->with('baixas')
            ->get();

        foreach ($tits as $t) {
            foreach ($t->baixas as $b) {
                $baixadoFatura = PadraoDecimal::roundHalfUp(
                    bcadd($baixadoFatura, (string) $b->valor, PadraoDecimal::SCALE_MONEY + 2),
                    PadraoDecimal::SCALE_MONEY
                );
            }
        }

        $total = PadraoDecimal::roundHalfUp(
            bcadd($sinal, $baixadoFatura, PadraoDecimal::SCALE_MONEY + 2),
            PadraoDecimal::SCALE_MONEY
        );

        // Apropriação entra no mesmo commit do FAT, antes de qualquer BX FATURA.
        if ($origem === Comissao::ORIGEM_APROPRIACAO_SINAL) {
            return PadraoDecimal::roundHalfUp(
                bcadd($sinal, '0', PadraoDecimal::SCALE_MONEY),
                PadraoDecimal::SCALE_MONEY
            );
        }

        return $total;
    }

    private function marcarPagasSeTituloComissao(Titulo $titulo): ?Comissao
    {
        if ($titulo->tipo !== Titulo::TIPO_PAGAR || $titulo->origem !== self::ORIGEM_TITULO) {
            return null;
        }
        if ($titulo->status !== Titulo::STATUS_QUITADO) {
            return null;
        }

        DB::transaction(function () use ($titulo) {
            $linhas = Comissao::query()
                ->where('titulo_pagar_id', $titulo->id)
                ->where('status', Comissao::STATUS_LIBERADA)
                ->lockForUpdate()
                ->get();

            foreach ($linhas as $c) {
                $c->status = Comissao::STATUS_PAGA;
                $c->save();
            }

            $fechamentoIds = $linhas->pluck('fechamento_id')->filter()->unique();
            foreach ($fechamentoIds as $fid) {
                $abertas = Comissao::query()
                    ->where('fechamento_id', $fid)
                    ->whereIn('status', [Comissao::STATUS_LIBERADA, Comissao::STATUS_PREVISTA])
                    ->exists();
                if (! $abertas) {
                    ComissaoFechamento::query()
                        ->whereKey($fid)
                        ->where('status', ComissaoFechamento::STATUS_TITULO_GERADO)
                        ->update(['status' => ComissaoFechamento::STATUS_PAGO]);
                }
            }
        });

        return null;
    }

    private function naturezaComissao(): NaturezaGerencial
    {
        $nat = NaturezaGerencial::query()
            ->where(function ($q) {
                $q->where('codigo_exibicao', self::NAT_COMISSAO)
                    ->orWhere('codigo', self::NAT_COMISSAO);
            })
            ->first();

        if ($nat === null) {
            throw ValidationException::withMessages([
                'natureza' => ['Natureza gerencial 3.01.05 (comissões de vendedores) não encontrada.'],
            ]);
        }

        return $nat;
    }

    private function nullIfEmpty(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }
}
