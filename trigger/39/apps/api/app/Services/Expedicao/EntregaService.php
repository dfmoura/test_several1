<?php

namespace App\Services\Expedicao;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Entrega;
use App\Models\Faturamento;
use App\Models\ParametroEmpresa;
use App\Models\Parceiro;
use App\Models\ParceiroEnderecoEntrega;
use App\Models\Pedido;
use App\Models\Titulo;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService;
use App\Services\Fiscal\FiscalHubResolver;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Romaneio ENT- após FAT (estudo 32 / ADR_ENTREGA_EXPEDICAO).
 * Eixo logístico distinto de TIT/BX. Não baixa estoque PA.
 */
class EntregaService
{
    public const PARAM_NF_ANTES = 'politica_nf_antes_expedir';

    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly FiscalHubResolver $hubs,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $status = null): array
    {
        $query = Entrega::query()
            ->where('empresa_id', $empresa->id)
            ->with([
                'parceiro:id,codigo,razao_social',
                'pedido:id,codigo,status',
                'faturamento:id,codigo,nf_status',
                'transportadora:id,codigo,razao_social',
            ])
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like)
                    ->orWhere('rastreio', 'like', $like)
                    ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', $like))
                    ->orWhereHas('parceiro', fn ($p) => $p->where('razao_social', 'like', $like));
            });
        }

        return $query->limit(200)->get()->map(fn (Entrega $e) => $this->toOut($e))->all();
    }

    /**
     * Fila operacional: faturados sem ENT vigente + em entrega.
     *
     * @return list<array<string, mixed>>
     */
    public function fila(Empresa $empresa): array
    {
        $pedidos = Pedido::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('status', [Pedido::STATUS_FATURADO, Pedido::STATUS_EM_ENTREGA])
            ->with([
                'parceiro:id,codigo,razao_social',
                'itens',
                'faturamento:id,codigo,nf_status,pedido_id,status',
            ])
            ->orderBy('id')
            ->limit(200)
            ->get();

        $out = [];
        foreach ($pedidos as $pedido) {
            $preview = $this->preview($empresa, $pedido);
            $out[] = [
                'pedido_id' => $pedido->id,
                'pedido_codigo' => $pedido->codigo,
                'pedido_status' => $pedido->status,
                'parceiro' => $pedido->parceiro ? [
                    'id' => $pedido->parceiro->id,
                    'codigo' => $pedido->parceiro->codigo,
                    'razao_social' => $pedido->parceiro->razao_social,
                ] : null,
                'modo' => $preview['modo'],
                'tipo_saida_sugerido' => $preview['tipo_saida_sugerido'],
                'destino_label' => $preview['destino']['label'] ?? null,
                'apto' => $preview['apto'],
                'acao' => $preview['acao'],
                'entrega' => $preview['entrega'],
                'faturamento' => $preview['faturamento'],
                'bloqueios' => $preview['bloqueios'],
            ];
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Entrega $entrega): array
    {
        $entrega->load([
            'parceiro:id,codigo,razao_social,logradouro,numero,complemento,bairro,municipio,uf,cep',
            'pedido:id,codigo,status,empresa_id,snapshot',
            'faturamento:id,codigo,nf_status,valor_a_cobrar,condicao_pagamento,forma_pagamento',
            'transportadora:id,codigo,razao_social',
            ...Entrega::userStampWith(),
            'expedidoPor:id,name',
            'confirmadoPor:id,name',
            'recusadoPor:id,name',
            'canceladoPor:id,name',
        ]);

        return $this->toOut($entrega, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function preview(Empresa $empresa, Pedido $pedido): array
    {
        $this->assertEmpresaPed($empresa, $pedido);
        $pedido->loadMissing(['itens', 'parceiro.enderecosEntrega', 'faturamento', 'orcamento']);

        $existente = $this->vigenteDoPedido($empresa, $pedido)
            ?? $this->ultimaDoPedido($empresa, $pedido);

        if ($existente && $existente->estaVigente()) {
            $entOut = $this->show($existente);
            $base = $this->basePreview($empresa, $pedido);
            unset($base['faturamento_model']);

            return array_merge($base, [
                'ja_expedido' => true,
                'apto' => false,
                'pode_confirmar' => true,
                'pode_cancelar' => true,
                'pode_recusar' => true,
                'acao' => $existente->modo === Entrega::MODO_RETIRAR
                    ? 'confirmar_retirada'
                    : 'confirmar_entrega',
                'entrega' => $entOut,
                'bloqueios' => [],
            ]);
        }

        $base = $this->basePreview($empresa, $pedido);
        $fatModel = $base['faturamento_model'] ?? null;
        unset($base['faturamento_model']);
        $bloqueios = $this->bloqueiosExpedir($empresa, $pedido, $fatModel instanceof Faturamento ? $fatModel : null);

        return array_merge($base, [
            'ja_expedido' => $existente !== null && $existente->status === Entrega::STATUS_ENTREGUE,
            'apto' => $bloqueios === [],
            'pode_confirmar' => false,
            'pode_cancelar' => false,
            'pode_recusar' => false,
            'acao' => $bloqueios === [] ? 'expedir' : 'aguardar',
            'entrega' => $existente ? $this->toOut($existente, true) : null,
            'bloqueios' => $bloqueios,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function expedir(Empresa $empresa, Pedido $pedido, array $data = []): array
    {
        $this->assertEmpresaPed($empresa, $pedido);

        $existente = $this->vigenteDoPedido($empresa, $pedido);
        if ($existente) {
            return $this->show($existente);
        }

        $preview = $this->preview($empresa, $pedido);
        if ($preview['bloqueios'] !== []) {
            throw ValidationException::withMessages([
                'pedido' => $preview['bloqueios'],
            ]);
        }

        $modo = (string) $preview['modo'];
        $tipo = $this->resolverTipoSaida($modo, $data);
        $transportadora = $this->resolverTransportadora($empresa, $tipo, $data);
        $rastreio = $this->nullIfEmpty($data['rastreio'] ?? null);
        if ($tipo === Entrega::TIPO_TRANSPORTADORA && ($rastreio === null || mb_strlen($rastreio) < 3)) {
            throw ValidationException::withMessages([
                'rastreio' => ['Informe o código de rastreio da transportadora.'],
            ]);
        }

        $volumes = (int) ($data['volumes'] ?? 1);
        if ($volumes < 1 || $volumes > 999) {
            throw ValidationException::withMessages([
                'volumes' => ['Volumes deve ser entre 1 e 999.'],
            ]);
        }

        $peso = null;
        if (isset($data['peso_kg']) && $data['peso_kg'] !== '' && $data['peso_kg'] !== null) {
            $peso = PadraoDecimal::parseStrict((string) $data['peso_kg'], 3);
            if ($peso === null || bccomp($peso, '0', 3) < 0) {
                throw ValidationException::withMessages([
                    'peso_kg' => ['Peso inválido.'],
                ]);
            }
        }

        $fat = Faturamento::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->where('status', Faturamento::STATUS_CONFIRMADO)
            ->firstOrFail();

        $item = $pedido->itens->first();
        $statusEnt = $modo === Entrega::MODO_RETIRAR
            ? Entrega::STATUS_AGUARDA_RETIRADA
            : Entrega::STATUS_EM_TRANSITO;

        $entrega = DB::transaction(function () use (
            $empresa, $pedido, $fat, $item, $modo, $tipo, $transportadora,
            $rastreio, $volumes, $peso, $data, $statusEnt, $preview
        ) {
            $locked = Pedido::query()->lockForUpdate()->findOrFail($pedido->id);
            $dup = $this->vigenteDoPedido($empresa, $locked);
            if ($dup) {
                return $dup;
            }
            if ($locked->status !== Pedido::STATUS_FATURADO) {
                throw ValidationException::withMessages([
                    'pedido' => ['Pedido não está faturado — não é possível expedir.'],
                ]);
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'ENT-'.$ano, 5);

            $entrega = Entrega::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'pedido_id' => $locked->id,
                'faturamento_id' => $fat->id,
                'parceiro_id' => $locked->parceiro_id,
                'modo' => $modo,
                'tipo_saida' => $tipo,
                'status' => $statusEnt,
                'volumes' => $volumes,
                'peso_kg' => $peso,
                'qtde' => $item?->qtde_faturavel ?? $item?->qtde_produzida ?? '0',
                'unidade' => $item?->unidade,
                'transportadora_id' => $transportadora?->id,
                'rastreio' => $rastreio,
                'destino_snapshot' => $preview['destino'],
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
                'expedido_em' => now(),
                'expedido_por' => Auth::id(),
            ]);

            $locked->status = Pedido::STATUS_EM_ENTREGA;
            $locked->save();

            return $entrega;
        });

        return $this->show($entrega->fresh());
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function confirmar(Empresa $empresa, Entrega $entrega, array $data): array
    {
        $this->assertEmpresaEnt($empresa, $entrega);

        $provaTipo = strtoupper(trim((string) ($data['prova_tipo'] ?? '')));
        $provaNome = $this->nullIfEmpty($data['prova_nome'] ?? null);
        $provaDoc = $this->nullIfEmpty($data['prova_documento'] ?? null);
        $provaObs = $this->nullIfEmpty($data['prova_obs'] ?? null);

        $ent = DB::transaction(function () use ($empresa, $entrega, $provaTipo, $provaNome, $provaDoc, $provaObs) {
            $ent = Entrega::query()->lockForUpdate()->findOrFail($entrega->id);
            if ($ent->empresa_id !== $empresa->id) {
                abort(404);
            }
            if ($ent->status === Entrega::STATUS_ENTREGUE) {
                return $ent;
            }
            if (! $ent->estaVigente()) {
                throw ValidationException::withMessages([
                    'entrega' => ['Só é possível confirmar uma entrega em andamento.'],
                ]);
            }

            $this->assertProva($ent, $provaTipo, $provaNome, $provaObs);

            $ent->status = Entrega::STATUS_ENTREGUE;
            $ent->prova_tipo = $provaTipo;
            $ent->prova_nome = $provaNome;
            $ent->prova_documento = $provaDoc;
            $ent->prova_obs = $provaObs;
            $ent->confirmado_em = now();
            $ent->confirmado_por = Auth::id();
            $ent->save();

            $pedido = Pedido::query()->lockForUpdate()->findOrFail($ent->pedido_id);
            if ($pedido->status === Pedido::STATUS_EM_ENTREGA) {
                $pedido->status = Pedido::STATUS_ENTREGUE;
                $pedido->save();
            }

            $this->tentarEncerrarPedido($pedido);

            return $ent;
        });

        return $this->show($ent->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function recusar(Empresa $empresa, Entrega $entrega, string $motivo): array
    {
        $this->assertEmpresaEnt($empresa, $entrega);
        $motivo = trim($motivo);
        if (mb_strlen($motivo) < 3) {
            throw ValidationException::withMessages([
                'motivo' => ['Informe o motivo da recusa (mínimo 3 caracteres).'],
            ]);
        }

        $ent = DB::transaction(function () use ($empresa, $entrega, $motivo) {
            $ent = Entrega::query()->lockForUpdate()->findOrFail($entrega->id);
            if ($ent->empresa_id !== $empresa->id) {
                abort(404);
            }
            if ($ent->status === Entrega::STATUS_RECUSADA) {
                return $ent;
            }
            if (! $ent->estaVigente()) {
                throw ValidationException::withMessages([
                    'entrega' => ['Só é possível recusar uma entrega em andamento.'],
                ]);
            }

            $ent->status = Entrega::STATUS_RECUSADA;
            $ent->motivo_recusa = $motivo;
            $ent->recusado_em = now();
            $ent->recusado_por = Auth::id();
            $ent->save();

            $pedido = Pedido::query()->lockForUpdate()->findOrFail($ent->pedido_id);
            if ($pedido->status === Pedido::STATUS_EM_ENTREGA) {
                $pedido->status = Pedido::STATUS_FATURADO;
                $pedido->save();
            }

            return $ent;
        });

        return $this->show($ent->fresh());
    }

    /**
     * @return array<string, mixed>
     */
    public function cancelar(Empresa $empresa, Entrega $entrega, string $motivo): array
    {
        $this->assertEmpresaEnt($empresa, $entrega);
        $motivo = trim($motivo);
        if (mb_strlen($motivo) < 3) {
            throw ValidationException::withMessages([
                'motivo' => ['Informe o motivo do cancelamento (mínimo 3 caracteres).'],
            ]);
        }

        $ent = DB::transaction(function () use ($empresa, $entrega, $motivo) {
            $ent = Entrega::query()->lockForUpdate()->findOrFail($entrega->id);
            if ($ent->empresa_id !== $empresa->id) {
                abort(404);
            }
            if ($ent->status === Entrega::STATUS_CANCELADA) {
                return $ent;
            }
            if (! $ent->estaVigente()) {
                throw ValidationException::withMessages([
                    'entrega' => ['Só é possível cancelar uma entrega em andamento.'],
                ]);
            }

            $ent->status = Entrega::STATUS_CANCELADA;
            $ent->motivo_cancelamento = $motivo;
            $ent->cancelado_em = now();
            $ent->cancelado_por = Auth::id();
            $ent->save();

            $pedido = Pedido::query()->lockForUpdate()->findOrFail($ent->pedido_id);
            if ($pedido->status === Pedido::STATUS_EM_ENTREGA) {
                $pedido->status = Pedido::STATUS_FATURADO;
                $pedido->save();
            }

            return $ent;
        });

        return $this->show($ent->fresh());
    }

    public function tentarEncerrarPedido(Pedido $pedido): void
    {
        $pedido->refresh();
        if (! in_array($pedido->status, [Pedido::STATUS_ENTREGUE, Pedido::STATUS_ENCERRADO], true)) {
            return;
        }
        if ($pedido->status === Pedido::STATUS_ENCERRADO) {
            return;
        }

        $abertos = Titulo::query()
            ->where('empresa_id', $pedido->empresa_id)
            ->where('pedido_id', $pedido->id)
            ->where('tipo', Titulo::TIPO_RECEBER)
            ->whereIn('status', [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL])
            ->exists();

        if ($abertos) {
            return;
        }

        $pedido->status = Pedido::STATUS_ENCERRADO;
        $pedido->save();
    }

    public function pedidoTemEntregaVigenteOuFechada(int $empresaId, int $pedidoId): bool
    {
        return Entrega::query()
            ->where('empresa_id', $empresaId)
            ->where('pedido_id', $pedidoId)
            ->whereIn('status', [
                Entrega::STATUS_AGUARDA_RETIRADA,
                Entrega::STATUS_EM_TRANSITO,
                Entrega::STATUS_ENTREGUE,
            ])
            ->exists();
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(Entrega $e, bool $detalhe = false): array
    {
        $out = [
            'id' => $e->id,
            'codigo' => $e->codigo,
            'modo' => $e->modo,
            'tipo_saida' => $e->tipo_saida,
            'status' => $e->status,
            'volumes' => $e->volumes,
            'peso_kg' => $e->peso_kg !== null ? (string) $e->peso_kg : null,
            'qtde' => (string) $e->qtde,
            'unidade' => $e->unidade,
            'rastreio' => $e->rastreio,
            'expedido_em' => optional($e->expedido_em)?->toIso8601String(),
            'confirmado_em' => optional($e->confirmado_em)?->toIso8601String(),
            'parceiro' => $e->parceiro ? [
                'id' => $e->parceiro->id,
                'codigo' => $e->parceiro->codigo,
                'razao_social' => $e->parceiro->razao_social,
            ] : null,
            'pedido' => $e->pedido ? [
                'id' => $e->pedido->id,
                'codigo' => $e->pedido->codigo,
                'status' => $e->pedido->status,
            ] : null,
            'faturamento' => $e->faturamento ? [
                'id' => $e->faturamento->id,
                'codigo' => $e->faturamento->codigo,
                'nf_status' => $e->faturamento->nf_status,
            ] : null,
            'transportadora' => $e->transportadora ? [
                'id' => $e->transportadora->id,
                'codigo' => $e->transportadora->codigo,
                'razao_social' => $e->transportadora->razao_social,
            ] : null,
            'created_at' => optional($e->created_at)?->toIso8601String(),
        ];

        if ($detalhe) {
            $out['destino'] = $e->destino_snapshot;
            $out['observacao'] = $e->observacao;
            $out['prova_tipo'] = $e->prova_tipo;
            $out['prova_nome'] = $e->prova_nome;
            $out['prova_documento'] = $e->prova_documento;
            $out['prova_obs'] = $e->prova_obs;
            $out['motivo_recusa'] = $e->motivo_recusa;
            $out['motivo_cancelamento'] = $e->motivo_cancelamento;
            $out['recusado_em'] = optional($e->recusado_em)?->toIso8601String();
            $out['cancelado_em'] = optional($e->cancelado_em)?->toIso8601String();
            $out['expedido_por'] = Entrega::userStampFrom($e->expedidoPor ?? $e->criador);
            $out['confirmado_por'] = Entrega::userStampFrom($e->confirmadoPor);
            $out['titulos_abertos'] = $this->titulosAbertosOut($e);
            $out['criado_por'] = Entrega::userStampFrom($e->criador);
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function basePreview(Empresa $empresa, Pedido $pedido): array
    {
        $modo = $this->modoDoPedido($pedido);
        $item = $pedido->itens->first();
        $fat = $pedido->faturamento;
        $destino = $this->destinoDoPedido($empresa, $pedido, $modo);
        $titulos = $this->titulosAbertosPedido($pedido);

        return [
            'modo' => $modo,
            'tipo_saida_sugerido' => $modo === Entrega::MODO_RETIRAR
                ? Entrega::TIPO_BALCAO
                : Entrega::TIPO_FROTA,
            'destino' => $destino,
            'qtde' => $item ? (string) $item->qtde_faturavel : '0',
            'unidade' => $item?->unidade,
            'descricao' => $item?->descricao,
            'faturamento' => $fat ? [
                'id' => $fat->id,
                'codigo' => $fat->codigo,
                'nf_status' => $fat->nf_status,
                'valor_a_cobrar' => (string) $fat->valor_a_cobrar,
                'condicao_pagamento' => $fat->condicao_pagamento,
                'forma_pagamento' => $fat->forma_pagamento,
            ] : null,
            'faturamento_model' => $fat,
            'titulos_abertos' => $titulos,
            'politica_nf_antes_expedir' => $this->politicaNfAntes($empresa),
            'avisos' => $this->avisosPreview($modo, $titulos, $fat),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $titulos
     * @return list<string>
     */
    private function avisosPreview(string $modo, array $titulos, ?Faturamento $fat): array
    {
        $avisos = [];
        if ($modo === Entrega::MODO_RETIRAR) {
            $avisos[] = 'Retirada no balcão: conferir volumes e registrar quem retirou. A cobrança segue a condição já faturada.';
        } else {
            $avisos[] = 'Entrega por transporte: registrar a saída e confirmar quando o cliente receber. Não é TMS.';
        }
        if ($titulos !== []) {
            $cond = $fat?->condicao_pagamento ? ' ('.$fat->condicao_pagamento.')' : '';
            $avisos[] = 'Há título em aberto'.$cond.' — a baixa é no Contas a receber, não neste passo.';
        } elseif ($fat && bccomp((string) $fat->valor_a_cobrar, '0', PadraoDecimal::SCALE_MONEY) === 0) {
            $avisos[] = 'Saldo já coberto pelo sinal. Confirmar a entrega encerra o pedido.';
        }

        return $avisos;
    }

    /**
     * @return list<string>
     */
    private function bloqueiosExpedir(Empresa $empresa, Pedido $pedido, ?Faturamento $fat): array
    {
        $bloqueios = [];
        if ($pedido->status === Pedido::STATUS_CANCELADO) {
            return ['Pedido cancelado não pode ser expedido.'];
        }
        if (in_array($pedido->status, [Pedido::STATUS_ENTREGUE, Pedido::STATUS_ENCERRADO], true)) {
            return ['Pedido já entregue.'];
        }
        if ($pedido->status !== Pedido::STATUS_FATURADO) {
            $bloqueios[] = 'Expedição exige pedido faturado (nota e cobrança geradas).';
        }
        if (! $fat || $fat->status !== Faturamento::STATUS_CONFIRMADO) {
            $bloqueios[] = 'Não há faturamento vigente para expedir.';
        } elseif ($this->politicaNfAntes($empresa)) {
            $fat->loadMissing('documentosFiscais');
            foreach ($fat->documentosFiscais as $doc) {
                if ($doc->status === DocumentoFiscalSaida::STATUS_PROCESSANDO) {
                    $bloqueios[] = 'A nota '.$doc->codigo.' ainda está em processamento no hub — aguarde a autorização antes de expedir.';
                }
            }
            $hub = $this->hubs->diagnostico($empresa);
            $autorizada = $fat->documentosFiscais->contains(
                fn (DocumentoFiscalSaida $d) => $d->status === DocumentoFiscalSaida::STATUS_AUTORIZADO
            );
            if ($hub['apto'] && ! $autorizada) {
                $bloqueios[] = 'Política da empresa: emitir a nota no hub antes de expedir.';
            }
        }

        return array_values(array_unique($bloqueios));
    }

    private function modoDoPedido(Pedido $pedido): string
    {
        $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
        $input = is_array($snap['input'] ?? null) ? $snap['input'] : [];
        $modo = strtoupper((string) ($input['modo_entrega'] ?? OrcamentoFreteEstimadoService::MODO_RETIRAR));

        return $modo === Entrega::MODO_ENTREGAR ? Entrega::MODO_ENTREGAR : Entrega::MODO_RETIRAR;
    }

    /**
     * @return array<string, mixed>
     */
    private function destinoDoPedido(Empresa $empresa, Pedido $pedido, string $modo): array
    {
        if ($modo === Entrega::MODO_RETIRAR) {
            return [
                'tipo' => 'balcao',
                'label' => 'Retirada no balcão',
                'logradouro' => $empresa->logradouro,
                'numero' => $empresa->numero,
                'complemento' => $empresa->complemento,
                'bairro' => $empresa->bairro,
                'municipio' => $empresa->municipio,
                'uf' => $empresa->uf,
                'cep' => $empresa->cep,
                'responsavel' => null,
            ];
        }

        $par = $pedido->parceiro;
        $entrega = $par?->enderecosEntrega?->firstWhere('principal', true)
            ?? $par?->enderecosEntrega?->first();

        if ($entrega instanceof ParceiroEnderecoEntrega) {
            return [
                'tipo' => 'entrega',
                'label' => $entrega->apelido ?: 'Endereço de entrega',
                'logradouro' => $entrega->logradouro,
                'numero' => $entrega->numero,
                'complemento' => $entrega->complemento,
                'bairro' => $entrega->bairro,
                'municipio' => $entrega->municipio,
                'uf' => $entrega->uf,
                'cep' => $entrega->cep,
                'responsavel' => $entrega->responsavel_nome,
            ];
        }

        return [
            'tipo' => 'fiscal',
            'label' => 'Endereço fiscal do cliente',
            'logradouro' => $par?->logradouro,
            'numero' => $par?->numero,
            'complemento' => $par?->complemento,
            'bairro' => $par?->bairro,
            'municipio' => $par?->municipio,
            'uf' => $par?->uf,
            'cep' => $par?->cep,
            'responsavel' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolverTipoSaida(string $modo, array $data): string
    {
        if ($modo === Entrega::MODO_RETIRAR) {
            return Entrega::TIPO_BALCAO;
        }
        $tipo = strtoupper(trim((string) ($data['tipo_saida'] ?? Entrega::TIPO_FROTA)));
        if (! in_array($tipo, [Entrega::TIPO_FROTA, Entrega::TIPO_TRANSPORTADORA, Entrega::TIPO_OUTRO], true)) {
            throw ValidationException::withMessages([
                'tipo_saida' => ['Tipo de saída inválido para entrega.'],
            ]);
        }

        return $tipo;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolverTransportadora(Empresa $empresa, string $tipo, array $data): ?Parceiro
    {
        if ($tipo !== Entrega::TIPO_TRANSPORTADORA) {
            return null;
        }
        $id = (int) ($data['transportadora_id'] ?? 0);
        if ($id < 1) {
            throw ValidationException::withMessages([
                'transportadora_id' => ['Selecione a transportadora cadastrada.'],
            ]);
        }
        $par = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $id)
            ->where('papel_transportadora', true)
            ->first();
        if (! $par) {
            throw ValidationException::withMessages([
                'transportadora_id' => ['Transportadora inválida para esta empresa.'],
            ]);
        }

        return $par;
    }

    private function assertProva(Entrega $ent, string $provaTipo, ?string $provaNome, ?string $provaObs): void
    {
        if ($ent->modo === Entrega::MODO_RETIRAR) {
            if ($provaTipo !== Entrega::PROVA_ASSINATURA_BALCAO) {
                throw ValidationException::withMessages([
                    'prova_tipo' => ['Retirada no balcão registra o nome de quem retirou.'],
                ]);
            }
            if ($provaNome === null || mb_strlen($provaNome) < 3) {
                throw ValidationException::withMessages([
                    'prova_nome' => ['Informe o nome de quem retirou.'],
                ]);
            }

            return;
        }

        if (! in_array($provaTipo, [Entrega::PROVA_CANHOTO, Entrega::PROVA_RASTREIO, Entrega::PROVA_OUTRO], true)) {
            throw ValidationException::withMessages([
                'prova_tipo' => ['Informe o tipo de prova da entrega (canhoto, rastreio ou outro).'],
            ]);
        }
        $texto = $provaObs ?? $provaNome;
        if ($texto === null || mb_strlen($texto) < 3) {
            throw ValidationException::withMessages([
                'prova_obs' => ['Registre o canhoto, o protocolo ou uma observação da confirmação.'],
            ]);
        }
    }

    private function politicaNfAntes(Empresa $empresa): bool
    {
        $row = ParametroEmpresa::query()
            ->where('empresa_id', $empresa->id)
            ->where('chave', self::PARAM_NF_ANTES)
            ->first();
        if ($row === null) {
            return true;
        }
        $valor = mb_strtoupper(trim((string) $row->valor));

        return ! in_array($valor, ['NAO', 'NÃO', 'N', '0', 'FALSE'], true);
    }

    private function vigenteDoPedido(Empresa $empresa, Pedido $pedido): ?Entrega
    {
        return Entrega::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->whereIn('status', Entrega::STATUSES_VIGENTES)
            ->orderByDesc('id')
            ->first();
    }

    private function ultimaDoPedido(Empresa $empresa, Pedido $pedido): ?Entrega
    {
        return Entrega::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function titulosAbertosPedido(Pedido $pedido): array
    {
        return $this->titulosAbertos($pedido->empresa_id, $pedido->id);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function titulosAbertosOut(Entrega $e): array
    {
        if (! $e->pedido_id) {
            return [];
        }

        return $this->titulosAbertos((int) $e->empresa_id, (int) $e->pedido_id);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function titulosAbertos(int $empresaId, int $pedidoId): array
    {
        return Titulo::query()
            ->where('empresa_id', $empresaId)
            ->where('pedido_id', $pedidoId)
            ->where('tipo', Titulo::TIPO_RECEBER)
            ->whereIn('status', [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL])
            ->orderBy('parcela')
            ->orderBy('id')
            ->get()
            ->map(fn (Titulo $t) => [
                'id' => $t->id,
                'codigo' => $t->codigo,
                'saldo' => (string) $t->saldo,
                'vencimento' => $t->vencimento,
                'status' => $t->status,
            ])
            ->all();
    }

    private function assertEmpresaPed(Empresa $empresa, Pedido $pedido): void
    {
        if ($pedido->empresa_id !== $empresa->id) {
            abort(404);
        }
    }

    private function assertEmpresaEnt(Empresa $empresa, Entrega $entrega): void
    {
        if ($entrega->empresa_id !== $empresa->id) {
            abort(404);
        }
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
