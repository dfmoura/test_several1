<?php

namespace App\Services\Comercial;

use App\Models\Orcamento;
use App\Models\OrcamentoLinkAprovacao;
use App\Models\Parceiro;
use App\Services\Audit\AuditLogger;
use App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService;
use App\Services\Financeiro\AdiantamentoService;
use App\Services\Plataforma\EmpresaAtivacaoService;
use App\Support\FlexorcSuperficie;
use App\Support\TipoOperacaoSaida;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Aceite do cliente via link (ADR_ORC_LINK_APROVACAO / estudo 32).
 * Destinatário = contato oficial autorizado do cadastro.
 * Pós-aceite: adiantamento PIX quando política exige (ADR_ORC_ADIANTAMENTO_PIX).
 * E-mail: ADR_ORC_EMAIL_PROPOSTA · WhatsApp ViaZap: ADR_ORC_WHATSAPP_VIAZAP.
 */
class OrcamentoAprovacaoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OrcamentoService $orcamentoService,
        private readonly AdiantamentoService $adiantamento,
        private readonly EmpresaAtivacaoService $ativacao,
        private readonly OrcamentoPropostaEmailService $propostaEmail,
        private readonly OrcamentoPropostaWhatsAppService $propostaWhatsApp,
    ) {}

    /**
     * Contatos do parceiro elegíveis para receber o link.
     *
     * @return array{destinatarios: list<array<string, mixed>>, aviso: string|null}
     */
    public function listarDestinatarios(Orcamento $orcamento): array
    {
        $parceiro = Parceiro::query()
            ->with(['contatos' => fn ($q) => $q->orderByDesc('autorizado_aprovar')->orderByDesc('principal')->orderBy('ordem')->orderBy('id')])
            ->find($orcamento->parceiro_id);

        if ($parceiro === null) {
            return ['destinatarios' => [], 'aviso' => 'Parceiro do orçamento não encontrado.'];
        }

        $destinatarios = [];
        foreach ($parceiro->contatos as $c) {
            $canal = $this->canalPreferido($c->whatsapp, $c->email, $c->telefone);
            if ($canal === null) {
                continue;
            }
            if (! $c->autorizado_aprovar && ! $c->principal) {
                continue;
            }
            $destinatarios[] = [
                'parceiro_contato_id' => $c->id,
                'nome' => $c->nome !== '' ? $c->nome : 'Contato',
                'funcao' => $c->funcao,
                'whatsapp' => $c->whatsapp ?: $parceiro->whatsapp,
                'email' => $c->email ?: $parceiro->email,
                'telefone' => $c->telefone ?: $parceiro->telefone,
                'canal' => $canal['canal'],
                'destino' => $canal['destino'],
                'autorizado_aprovar' => (bool) $c->autorizado_aprovar,
                'principal' => (bool) $c->principal,
                'legado' => false,
            ];
        }

        // Prioriza autorizados; se só houver principal sem flag (dados antigos), mantém.
        $autorizados = array_values(array_filter($destinatarios, fn ($d) => $d['autorizado_aprovar']));
        if ($autorizados !== []) {
            $destinatarios = $autorizados;
        }

        $aviso = null;
        if ($destinatarios === []) {
            $legado = $this->destinatarioLegado($parceiro);
            if ($legado !== null) {
                $destinatarios[] = $legado;
                $aviso = 'Nenhum contato com flag “autorizado a aprovar”. Usando dados principais do cadastro — cadastre um contato oficial quando possível.';
            } else {
                $aviso = 'Cadastre no parceiro um contato autorizado a aprovar (com WhatsApp ou e-mail) antes de enviar o link.';
            }
        } elseif ($autorizados === [] && $destinatarios !== []) {
            $aviso = 'Nenhum contato marcado como autorizado a aprovar — exibindo o principal. Marque o aprovador no cadastro do parceiro.';
        }

        return ['destinatarios' => $destinatarios, 'aviso' => $aviso];
    }

    /**
     * @param  array{parceiro_contato_id?: int|null, usar_contato_legado?: bool}  $opts
     * @return array{
     *   url: string,
     *   token: string,
     *   mensagem: string,
     *   canal_url: string|null,
     *   expira_em: string,
     *   reutilizado: bool,
     *   destinatario: array<string, mixed>,
     *   email_enviado: bool,
     *   email_destino: string|null,
     *   email_motivo: string|null,
     *   zap_enviado: bool,
     *   zap_destino: string|null,
     *   zap_motivo: string|null,
     *   orcamento: array<string, mixed>
     * }
     */
    public function enviarParaAprovacao(Orcamento $orcamento, array $opts = []): array
    {
        if (! $orcamento->isEnviavel()) {
            throw ValidationException::withMessages([
                'status' => [
                    'Só orçamentos em preparação (calculado), rejeitados ou já enviados (lembrete) podem gerar o link.',
                ],
            ]);
        }

        $orcamento->loadMissing('empresa');
        if ($orcamento->empresa) {
            app()->instance('empresa', $orcamento->empresa);
            if (! $this->ativacao->podeEnviarOrcamento($orcamento->empresa)) {
                throw ValidationException::withMessages(
                    $this->ativacao->errosBloqueioEnvio($orcamento->empresa),
                );
            }
        }

        $destinatario = $this->resolverDestinatario($orcamento, $opts);

        $dias = max(1, (int) $orcamento->validade_dias);
        $agora = now();
        $expiraEm = $agora->copy()->addDays($dias);
        $reutilizado = false;

        $link = DB::transaction(function () use ($orcamento, $destinatario, $agora, $expiraEm, &$reutilizado) {
            $orcamento->refresh();
            $existente = OrcamentoLinkAprovacao::query()
                ->where('orcamento_id', $orcamento->id)
                ->lockForUpdate()
                ->first();

            $mesmoDestino = $existente
                && (int) ($existente->parceiro_contato_id ?? 0) === (int) ($destinatario['parceiro_contato_id'] ?? 0)
                && (string) ($existente->destino_envio ?? '') === (string) $destinatario['destino'];

            if (
                $existente
                && $existente->ativo
                && $existente->usado_em === null
                && $existente->expira_em !== null
                && $existente->expira_em->isFuture()
                && $orcamento->aguardandoCliente()
                && $mesmoDestino
            ) {
                $existente->fill([
                    'enviado_em' => $agora,
                    'canal_envio' => $destinatario['canal'],
                    'destino_envio' => $destinatario['destino'],
                    'destino_nome' => $destinatario['nome'],
                    'destino_funcao' => $destinatario['funcao'],
                    'parceiro_contato_id' => $destinatario['parceiro_contato_id'],
                ]);
                $existente->save();
                $reutilizado = true;
                $link = $existente;
            } else {
                $token = $this->novoToken();
                $payload = [
                    'token' => $token,
                    'ativo' => true,
                    'expira_em' => $expiraEm,
                    'enviado_em' => $agora,
                    'canal_envio' => $destinatario['canal'],
                    'destino_envio' => $destinatario['destino'],
                    'destino_nome' => $destinatario['nome'],
                    'destino_funcao' => $destinatario['funcao'],
                    'parceiro_contato_id' => $destinatario['parceiro_contato_id'],
                    'visualizacoes' => 0,
                    'usado_em' => null,
                ];
                if ($existente) {
                    $existente->fill($payload);
                    $existente->save();
                    $link = $existente;
                } else {
                    $link = OrcamentoLinkAprovacao::query()->create(array_merge(
                        ['orcamento_id' => $orcamento->id],
                        $payload,
                    ));
                }
            }

            $before = ['status' => $orcamento->status];
            $lembrete = $orcamento->aguardandoCliente();

            $orcamento->fill([
                'status' => $lembrete ? $orcamento->status : Orcamento::STATUS_ENVIADO,
                'enviado_em' => $orcamento->enviado_em ?? $agora,
            ]);

            if (! $lembrete) {
                $orcamento->fill([
                    'status' => Orcamento::STATUS_ENVIADO,
                    'visualizado_em' => null,
                    'decidido_em' => null,
                    'canal_aprovacao' => null,
                    'aceite_nome_cliente' => null,
                    'aceite_faixa_index' => null,
                    'aceite_ip' => null,
                    'aceite_user_agent' => null,
                    'motivo_decisao' => null,
                ]);
            }

            $orcamento->save();

            $this->audit->log('ENVIAR_APROVACAO', 'Orcamento', $orcamento->id, $before, [
                'status' => $orcamento->status,
                'token_suffix' => substr($link->token, -8),
                'expira_em' => $link->expira_em?->toIso8601String(),
                'reutilizado' => $reutilizado,
                'lembrete' => $lembrete,
                'destinatario' => $destinatario['nome'],
                'canal' => $destinatario['canal'],
                'parceiro_contato_id' => $destinatario['parceiro_contato_id'],
            ]);

            return $link;
        });

        $url = $this->publicUrl($link->token);
        $orcamento = $orcamento->fresh(['parceiro', 'empresa', 'linkAprovacao']);
        $mensagem = $this->mensagemPadrao($orcamento, $link, $url);
        $canalUrl = $this->canalDeepLink(
            (string) ($link->canal_envio ?? ''),
            (string) ($link->destino_envio ?? ''),
            $mensagem,
            $orcamento,
        );

        $emailMeta = ['enviado' => false, 'destino' => null, 'motivo' => 'sem_empresa'];
        if ($orcamento->empresa) {
            $emailMeta = $this->propostaEmail->tentarEnviarAposLink(
                $orcamento,
                $orcamento->empresa,
                $url,
                $destinatario,
                $link->expira_em?->toIso8601String(),
            );
        }

        $zapMeta = $this->propostaWhatsApp->tentarEnviarAposLink(
            $orcamento,
            $destinatario,
            $mensagem,
        );

        return [
            'url' => $url,
            'token' => $link->token,
            'mensagem' => $mensagem,
            'canal_url' => $canalUrl,
            'expira_em' => $link->expira_em?->toIso8601String(),
            'reutilizado' => $reutilizado,
            'destinatario' => [
                'parceiro_contato_id' => $link->parceiro_contato_id,
                'nome' => $link->destino_nome,
                'funcao' => $link->destino_funcao,
                'canal' => $link->canal_envio,
                'destino' => $link->destino_envio,
            ],
            'email_enviado' => (bool) $emailMeta['enviado'],
            'email_destino' => $emailMeta['destino'],
            'email_motivo' => $emailMeta['motivo'],
            'zap_enviado' => (bool) $zapMeta['enviado'],
            'zap_destino' => $zapMeta['destino'],
            'zap_motivo' => $zapMeta['motivo'],
            'orcamento' => $this->orcamentoService->show($orcamento),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function propostaPublica(string $token): array
    {
        $link = $this->findLinkOrFail($token);
        $orcamento = $link->orcamento;
        if ($orcamento === null || $orcamento->trashed()) {
            throw new HttpException(404, 'Proposta não encontrada.');
        }

        // Pós-aceite com PIX pendente (fatia completa com sinal).
        if (
            FlexorcSuperficie::emiteSinalNoAceite()
            && $orcamento->status === Orcamento::STATUS_APROVADO
            && $orcamento->financeiro_status === AdiantamentoService::FIN_AGUARDA_ADIANTAMENTO
            && $link->usado_em !== null
        ) {
            if ($orcamento->empresa) {
                app()->instance('empresa', $orcamento->empresa);
            }

            return $this->dtoPagamentoPublico($orcamento->fresh(['empresa', 'adiantamentoTitulo.cobrancas']), $link);
        }

        if (
            $orcamento->status === Orcamento::STATUS_APROVADO
            && $orcamento->financeiro_status === AdiantamentoService::FIN_LIBERADO
            && $link->usado_em !== null
        ) {
            throw new HttpException(410, 'Pagamento confirmado. Esta proposta não está mais disponível.');
        }

        if (! $link->ativo || $link->usado_em !== null) {
            throw new HttpException(410, 'Esta proposta não está mais disponível.');
        }

        if (in_array($orcamento->status, [Orcamento::STATUS_APROVADO, Orcamento::STATUS_REPROVADO], true)) {
            throw new HttpException(410, 'Esta proposta não está mais disponível.');
        }

        $vencido = $link->expira_em === null || $link->expira_em->isPast();

        if (! $vencido && $orcamento->aguardandoCliente()) {
            DB::transaction(function () use ($link, $orcamento) {
                $link->increment('visualizacoes');
                if ($orcamento->status === Orcamento::STATUS_ENVIADO) {
                    $orcamento->status = Orcamento::STATUS_VISUALIZADO;
                    $orcamento->visualizado_em = $orcamento->visualizado_em ?? now();
                    $orcamento->save();
                }
            });
            $orcamento->refresh();
        }

        return $this->dtoComercial($orcamento->fresh(['empresa']), $link->fresh(), $vencido);
    }

    /**
     * Prévia comercial autenticada (staff) — mesma visão do cliente, sem token e sem decidir.
     *
     * @return array<string, mixed>
     */
    public function propostaComercialInterna(Orcamento $orcamento): array
    {
        $orcamento->loadMissing('empresa');

        return $this->dtoComercial($orcamento, null, false, 'preview');
    }

    /**
     * Polling do adiantamento após aceite.
     *
     * @return array<string, mixed>
     */
    public function adiantamentoPublico(string $token): array
    {
        $link = $this->findLinkOrFail($token);
        $orcamento = $link->orcamento;
        if ($orcamento === null || $orcamento->trashed()) {
            throw new HttpException(404, 'Proposta não encontrada.');
        }

        if ($orcamento->status !== Orcamento::STATUS_APROVADO) {
            throw new HttpException(409, 'Orçamento ainda não foi aprovado.');
        }

        if ($orcamento->empresa) {
            app()->instance('empresa', $orcamento->empresa);
        }

        $dto = $this->adiantamento->dtoPublico($orcamento->fresh(['empresa', 'adiantamentoTitulo.cobrancas']));

        return [
            'codigo' => $orcamento->codigo,
            'status' => $orcamento->status,
            'financeiro_status' => $orcamento->financeiro_status,
            'adiantamento' => $dto,
        ];
    }

    /**
     * @param  array{acao: string, faixa_index?: int, nome_cliente?: string, motivo?: string|null}  $data
     * @return array<string, mixed>
     */
    public function decidirPeloLink(string $token, array $data, ?string $ip, ?string $userAgent): array
    {
        $acao = strtoupper((string) ($data['acao'] ?? ''));
        if (! in_array($acao, ['APROVAR', 'RECUSAR'], true)) {
            throw ValidationException::withMessages([
                'acao' => ['Informe APROVAR ou RECUSAR.'],
            ]);
        }

        $link = $this->findLinkOrFail($token);

        if (! $link->ativo || $link->usado_em !== null) {
            throw new HttpException(410, 'Esta proposta não está mais disponível.');
        }

        if ($link->expira_em === null || $link->expira_em->isPast()) {
            throw new HttpException(410, 'Proposta vencida — solicite atualização ao vendedor.');
        }

        $orcamento = $link->orcamento;
        if ($orcamento === null || $orcamento->trashed()) {
            throw new HttpException(404, 'Proposta não encontrada.');
        }

        if ($orcamento->empresa) {
            app()->instance('empresa', $orcamento->empresa);
        }

        if (in_array($orcamento->status, [Orcamento::STATUS_APROVADO, Orcamento::STATUS_REPROVADO], true)) {
            throw new HttpException(409, 'Proposta já decidida.');
        }

        if (! $orcamento->aguardandoCliente()) {
            throw new HttpException(409, 'Orçamento não está aguardando aprovação do cliente.');
        }

        if ($acao === 'APROVAR') {
            return $this->aprovar($orcamento, $link, $data, $ip, $userAgent);
        }

        return $this->recusar($orcamento, $link, $data, $ip, $userAgent);
    }

    /**
     * @param  array{parceiro_contato_id?: int|null, usar_contato_legado?: bool}  $opts
     * @return array{parceiro_contato_id: int|null, nome: string, funcao: string|null, canal: string, destino: string, email: string|null, legado: bool}
     */
    private function resolverDestinatario(Orcamento $orcamento, array $opts): array
    {
        $lista = $this->listarDestinatarios($orcamento);
        $destinatarios = $lista['destinatarios'];

        if ($destinatarios === []) {
            throw ValidationException::withMessages([
                'parceiro_contato_id' => [
                    $lista['aviso'] ?? 'Cadastre um contato autorizado a aprovar no parceiro (WhatsApp ou e-mail).',
                ],
            ]);
        }

        // Lembrete sem trocar destinatário: reusa o do link ativo se ainda elegível.
        if ($orcamento->aguardandoCliente() && empty($opts['parceiro_contato_id']) && empty($opts['usar_contato_legado'])) {
            $orcamento->loadMissing('linkAprovacao');
            $link = $orcamento->linkAprovacao;
            if ($link && $link->destino_nome && $link->destino_envio) {
                $base = [
                    'parceiro_contato_id' => $link->parceiro_contato_id,
                    'nome' => (string) $link->destino_nome,
                    'funcao' => $link->destino_funcao,
                    'canal' => (string) ($link->canal_envio ?: 'WHATSAPP'),
                    'destino' => (string) $link->destino_envio,
                    'legado' => $link->parceiro_contato_id === null,
                ];
                // Dual-canal: e-mail e WhatsApp resolvem pelo cadastro mesmo no lembrete.
                $base['email'] = $this->propostaEmail->resolverEmailDestino($orcamento, $base);
                $base['whatsapp'] = $this->propostaWhatsApp->resolverWhatsAppDestino($orcamento, $base);

                return $base;
            }
        }

        $contatoId = isset($opts['parceiro_contato_id']) ? (int) $opts['parceiro_contato_id'] : null;
        $usarLegado = (bool) ($opts['usar_contato_legado'] ?? false);

        if ($contatoId) {
            foreach ($destinatarios as $d) {
                if ((int) $d['parceiro_contato_id'] === $contatoId) {
                    return $this->destinatarioEnvioFromLista($d, false);
                }
            }
            throw ValidationException::withMessages([
                'parceiro_contato_id' => ['Contato inválido ou sem permissão/canal para aprovar este orçamento.'],
            ]);
        }

        if ($usarLegado) {
            foreach ($destinatarios as $d) {
                if (! empty($d['legado'])) {
                    return $this->destinatarioEnvioFromLista($d, true);
                }
            }
        }

        // Se só há um elegível, aceita implícito (UX).
        if (count($destinatarios) === 1) {
            $d = $destinatarios[0];

            return $this->destinatarioEnvioFromLista($d, (bool) ($d['legado'] ?? false));
        }

        throw ValidationException::withMessages([
            'parceiro_contato_id' => ['Selecione o contato oficial que receberá o link de aprovação.'],
        ]);
    }

    private function emailLimpo(mixed $email): ?string
    {
        $mail = trim((string) $email);

        return ($mail !== '' && filter_var($mail, FILTER_VALIDATE_EMAIL)) ? $mail : null;
    }

    /**
     * Payload de envio com e-mail e WhatsApp do cadastro (dual-canal automático).
     *
     * @param  array<string, mixed>  $d
     * @return array{
     *   parceiro_contato_id: int|null,
     *   nome: string,
     *   funcao: string|null,
     *   canal: string,
     *   destino: string,
     *   email: string|null,
     *   whatsapp: string|null,
     *   legado: bool
     * }
     */
    private function destinatarioEnvioFromLista(array $d, bool $legado): array
    {
        $wa = preg_replace('/\D+/', '', (string) ($d['whatsapp'] ?? '')) ?: null;
        if ($wa !== null && strlen($wa) < 10) {
            $wa = null;
        }

        return [
            'parceiro_contato_id' => isset($d['parceiro_contato_id']) ? (int) $d['parceiro_contato_id'] : null,
            'nome' => (string) $d['nome'],
            'funcao' => $d['funcao'] ?? null,
            'canal' => (string) $d['canal'],
            'destino' => (string) $d['destino'],
            'email' => $this->emailLimpo($d['email'] ?? null),
            'whatsapp' => $wa,
            'legado' => $legado,
        ];
    }

    /**
     * @return array{parceiro_contato_id: null, nome: string, funcao: string|null, whatsapp: ?string, email: ?string, telefone: ?string, canal: string, destino: string, autorizado_aprovar: bool, principal: bool, legado: true}|null
     */
    private function destinatarioLegado(Parceiro $parceiro): ?array
    {
        $canal = $this->canalPreferido($parceiro->whatsapp, $parceiro->email, $parceiro->telefone);
        if ($canal === null) {
            return null;
        }
        $nome = trim((string) ($parceiro->contato_nome ?: $parceiro->razao_social));
        if ($nome === '') {
            $nome = 'Responsável';
        }

        return [
            'parceiro_contato_id' => null,
            'nome' => $nome,
            'funcao' => $parceiro->contato_funcao,
            'whatsapp' => $parceiro->whatsapp,
            'email' => $parceiro->email,
            'telefone' => $parceiro->telefone,
            'canal' => $canal['canal'],
            'destino' => $canal['destino'],
            'autorizado_aprovar' => true,
            'principal' => true,
            'legado' => true,
        ];
    }

    /**
     * @return array{canal: string, destino: string}|null
     */
    private function canalPreferido(?string $whatsapp, ?string $email, ?string $telefone): ?array
    {
        $wa = preg_replace('/\D+/', '', (string) $whatsapp) ?: null;
        $tel = preg_replace('/\D+/', '', (string) $telefone) ?: null;
        $mail = trim((string) $email) ?: null;

        if ($wa !== null && strlen($wa) >= 10) {
            return ['canal' => 'WHATSAPP', 'destino' => $wa];
        }
        if ($mail !== null && filter_var($mail, FILTER_VALIDATE_EMAIL)) {
            return ['canal' => 'EMAIL', 'destino' => $mail];
        }
        if ($tel !== null && strlen($tel) >= 10) {
            return ['canal' => 'TELEFONE', 'destino' => $tel];
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function aprovar(
        Orcamento $orcamento,
        OrcamentoLinkAprovacao $link,
        array $data,
        ?string $ip,
        ?string $userAgent,
    ): array {
        $nome = trim((string) ($data['nome_cliente'] ?? ''));
        if (mb_strlen($nome) < 2) {
            throw ValidationException::withMessages([
                'nome_cliente' => ['Informe seu nome para confirmar o aceite.'],
            ]);
        }

        $faixaIndex = (int) ($data['faixa_index'] ?? -1);
        $faixas = $orcamento->result_snapshot['faixas'] ?? [];
        if (! is_array($faixas) || ! array_key_exists($faixaIndex, $faixas)) {
            throw ValidationException::withMessages([
                'faixa_index' => ['Selecione a quantidade que deseja aprovar.'],
            ]);
        }

        $agora = now();
        $adiantamentoOut = null;

        DB::transaction(function () use (
            $orcamento,
            $link,
            $nome,
            $faixaIndex,
            $data,
            $ip,
            $userAgent,
            $agora,
            &$adiantamentoOut,
        ) {
            $before = ['status' => $orcamento->status];
            $orcamento->fill([
                'status' => Orcamento::STATUS_APROVADO,
                'decidido_em' => $agora,
                'canal_aprovacao' => Orcamento::CANAL_LINK,
                'aceite_nome_cliente' => $nome,
                'aceite_faixa_index' => $faixaIndex,
                'aceite_ip' => $ip,
                'aceite_user_agent' => $userAgent ? mb_substr($userAgent, 0, 512) : null,
                'motivo_decisao' => isset($data['motivo']) ? (trim((string) $data['motivo']) ?: null) : null,
            ]);
            $orcamento->save();

            $link->fill([
                'ativo' => false,
                'usado_em' => $agora,
            ]);
            $link->save();

            $orcamento->loadMissing(['empresa', 'parceiro']);
            $adiantamentoOut = null;
            $finStatus = AdiantamentoService::FIN_LIBERADO;
            if (FlexorcSuperficie::emiteSinalNoAceite()) {
                $emit = $this->adiantamento->emitirDoOrcamento($orcamento->fresh(['empresa', 'parceiro']), $faixaIndex);
                $adiantamentoOut = $emit['adiantamento'] ?? null;
                $finStatus = $emit['financeiro_status'] ?? AdiantamentoService::FIN_LIBERADO;
            } else {
                $orcamento->financeiro_status = AdiantamentoService::FIN_LIBERADO;
                $orcamento->save();
            }

            $this->audit->log('APROVAR_LINK_CLIENTE', 'Orcamento', $orcamento->id, $before, [
                'status' => Orcamento::STATUS_APROVADO,
                'faixa_index' => $faixaIndex,
                'nome' => $nome,
                'destinatario' => $link->destino_nome,
                'financeiro_status' => $finStatus,
                'adiantamento' => $adiantamentoOut !== null,
            ]);
        });

        $orcamento->refresh();
        $mensagem = $adiantamentoOut !== null
            ? 'Proposta aceita. Conclua o pagamento do PIX abaixo — o orçamento fica aguardando pagamento até a confirmação.'
            : 'Proposta aprovada. Em breve a equipe dará andamento.';

        return [
            'ok' => true,
            'status' => Orcamento::STATUS_APROVADO,
            'status_exibicao' => $adiantamentoOut !== null
                ? 'AGUARDANDO_PAGAMENTO'
                : Orcamento::STATUS_APROVADO,
            'codigo' => $orcamento->codigo,
            'mensagem' => $mensagem,
            'financeiro_status' => $orcamento->financeiro_status,
            'adiantamento' => $adiantamentoOut,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function recusar(
        Orcamento $orcamento,
        OrcamentoLinkAprovacao $link,
        array $data,
        ?string $ip,
        ?string $userAgent,
    ): array {
        $motivo = isset($data['motivo']) ? trim((string) $data['motivo']) : '';
        $agora = now();

        DB::transaction(function () use ($orcamento, $link, $motivo, $ip, $userAgent, $agora) {
            $before = ['status' => $orcamento->status];
            $orcamento->fill([
                'status' => Orcamento::STATUS_REPROVADO,
                'decidido_em' => $agora,
                'canal_aprovacao' => Orcamento::CANAL_LINK,
                'motivo_decisao' => $motivo !== '' ? $motivo : 'Recusado pelo cliente no link',
                'aceite_ip' => $ip,
                'aceite_user_agent' => $userAgent ? mb_substr($userAgent, 0, 512) : null,
                'aceite_nome_cliente' => null,
                'aceite_faixa_index' => null,
            ]);
            $orcamento->save();

            $link->fill([
                'ativo' => false,
                'usado_em' => $agora,
            ]);
            $link->save();

            $this->audit->log('RECUSAR_LINK_CLIENTE', 'Orcamento', $orcamento->id, $before, [
                'status' => Orcamento::STATUS_REPROVADO,
                'motivo' => $orcamento->motivo_decisao,
                'destinatario' => $link->destino_nome,
            ]);
        });

        return [
            'ok' => true,
            'status' => Orcamento::STATUS_REPROVADO,
            'codigo' => $orcamento->codigo,
            'mensagem' => 'Proposta recusada. O comercial poderá revisar e enviar novamente.',
        ];
    }

    private function findLinkOrFail(string $token): OrcamentoLinkAprovacao
    {
        $token = trim($token);
        if ($token === '' || strlen($token) < 20) {
            throw new HttpException(404, 'Link inválido.');
        }

        $link = OrcamentoLinkAprovacao::query()
            ->with(['orcamento.empresa'])
            ->where('token', $token)
            ->first();

        if ($link === null) {
            throw new HttpException(404, 'Link inválido ou revogado.');
        }

        return $link;
    }

    private function novoToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
    }

    private function publicUrl(string $token): string
    {
        $base = rtrim((string) config('erp.orcamento_public_base_url'), '/');
        if ($base === '') {
            $base = rtrim((string) config('app.url'), '/');
        }

        return $base.'/p/'.$token;
    }

    private function mensagemPadrao(Orcamento $orcamento, OrcamentoLinkAprovacao $link, string $url): string
    {
        $empresa = $orcamento->empresa;
        $nomeEmpresa = $empresa?->nome_fantasia ?: ($empresa?->razao_social ?: 'nossa empresa');
        $validade = $link->expira_em
            ? $link->expira_em->format('d/m/Y')
            : '—';
        $contato = trim((string) ($link->destino_nome ?: 'olá'));
        $primeiro = explode(' ', $contato)[0] ?: $contato;

        // Fonte única Zap + clipboard + wa.me (ADR_ORC_WHATSAPP_VIAZAP).
        // URL sozinha na linha → WhatsApp vira link clicável; /p/{token} = ver/aprovar/recusar.
        return "Olá, {$primeiro}! 👋\n"
            ."\n"
            ."Encaminhamos a proposta comercial {$orcamento->codigo} (versão {$orcamento->versao}) da {$nomeEmpresa}.\n"
            ."\n"
            ."📄 No link abaixo, você poderá consultar todos os detalhes da proposta e também aprovar ou recusar.\n"
            ."\n"
            ."🔐 O acesso é pessoal. Por favor, não compartilhe este link.\n"
            ."\n"
            ."📅 Validade da proposta: {$validade}\n"
            ."\n"
            ."👉 Acesse a proposta:\n"
            ."{$url}\n"
            ."\n"
            ."Ficamos à disposição para qualquer dúvida!\n"
            ."{$nomeEmpresa}";
    }

    /**
     * Deep link do canal (WhatsApp / e-mail) com a mensagem já montada — UX do comercial.
     */
    private function canalDeepLink(string $canal, string $destino, string $mensagem, Orcamento $orcamento): ?string
    {
        $destino = trim($destino);
        if ($destino === '') {
            return null;
        }

        if ($canal === 'WHATSAPP') {
            $n = preg_replace('/\D+/', '', $destino) ?: '';
            if (strlen($n) < 10) {
                return null;
            }
            // BR sem DDI → assume 55 (cadastro costuma vir sem país).
            if (strlen($n) <= 11) {
                $n = '55'.$n;
            }

            return 'https://wa.me/'.$n.'?text='.rawurlencode($mensagem);
        }

        if ($canal === 'EMAIL' && filter_var($destino, FILTER_VALIDATE_EMAIL)) {
            $assunto = 'Proposta comercial '.$orcamento->codigo.' v'.$orcamento->versao;

            return 'mailto:'.$destino
                .'?subject='.rawurlencode($assunto)
                .'&body='.rawurlencode($mensagem);
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function dtoComercial(
        Orcamento $orcamento,
        ?OrcamentoLinkAprovacao $link,
        bool $vencido,
        string $modo = 'proposta',
    ): array {
        $input = is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [];
        $result = is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [];
        $empresa = $orcamento->empresa;
        $facaNova = (bool) ($result['faca_nova'] ?? $input['faca_nova'] ?? false);
        $valorFaca = (float) ($result['valor_faca_nova'] ?? $input['valor_faca_nova'] ?? 0);
        $somenteLeitura = $modo === 'preview' || $link === null;

        $faixas = [];
        foreach (($result['faixas'] ?? []) as $idx => $fx) {
            if (! is_array($fx)) {
                continue;
            }
            $qtd = (int) ($fx['quantidade'] ?? 0);
            $valorTotal = (float) ($fx['valor_total'] ?? 0);
            $valorEtiqueta = (float) ($fx['valor_etiqueta'] ?? 0);
            $rolos = (float) ($fx['rolos'] ?? 0);
            $fxNorm = $fx;
            if ($facaNova && ($fxNorm['valor_total_com_faca'] ?? null) === null) {
                $fxNorm['valor_total_com_faca'] = $valorTotal + $valorFaca;
            }
            $totalProposta = (float) OrcamentoFreteEstimadoService::totalPropostaFaixa($fxNorm);

            $valorFrete = array_key_exists('valor_frete', $fx) && $fx['valor_frete'] !== null && $fx['valor_frete'] !== ''
                ? round((float) $fx['valor_frete'], 2)
                : null;
            $freteSomavel = (bool) ($fx['frete_somavel'] ?? false);

            $faixas[] = [
                'index' => (int) $idx,
                'quantidade' => $qtd,
                'valor_total' => round($totalProposta, 2),
                'valor_unitario' => $qtd > 0 ? round($valorEtiqueta / $qtd, 6) : null,
                'valor_etiqueta' => round($valorEtiqueta, 2),
                'valor_rolo' => $rolos > 0 ? round($valorTotal / $rolos, 2) : null,
                'rolos' => $rolos > 0 ? (int) round($rolos) : null,
                'valor_matriz' => round((float) ($fx['valor_matriz'] ?? 0), 2),
                'valor_faca_nova' => $facaNova ? round((float) ($fx['valor_faca_nova'] ?? $valorFaca), 2) : 0,
                'valor_frete' => $valorFrete,
                'frete_somavel' => $freteSomavel,
            ];
        }

        $destinoNome = $link?->destino_nome;
        $destinoFuncao = $link?->destino_funcao;

        return [
            'codigo' => $orcamento->codigo,
            'versao' => $orcamento->versao,
            'status' => $orcamento->status,
            'vencido' => $somenteLeitura ? false : $vencido,
            'disponivel' => $somenteLeitura
                ? false
                : (! $vencido && $link !== null && $link->ativo && $link->usado_em === null),
            'somente_leitura' => $somenteLeitura,
            'expira_em' => $somenteLeitura ? null : $link?->expira_em?->toIso8601String(),
            'cliente_nome' => $orcamento->cliente_nome,
            'destinatario' => [
                'nome' => $destinoNome,
                'funcao' => $destinoFuncao,
                'instrucao' => $somenteLeitura
                    ? 'Prévia interna da proposta. Aprovar ou recusar só pelo link pessoal enviado ao destinatário.'
                    : ($destinoNome
                        ? 'Esta proposta foi enviada para aprovação de '.$destinoNome.'. Somente esta pessoa deve aprovar ou recusar.'
                        : 'Somente o destinatário deste link deve aprovar ou recusar a proposta.'),
            ],
            'empresa' => [
                'nome_fantasia' => $empresa?->nome_fantasia,
                'razao_social' => $empresa?->razao_social,
                'cnpj' => $empresa?->cnpj,
                'telefone' => $empresa?->telefone,
                'email' => $empresa?->email,
                'municipio' => $empresa?->municipio,
                'uf' => $empresa?->uf,
            ],
            'tipo_operacao' => TipoOperacaoSaida::fromInput(
                $input['tipo_operacao'] ?? $input['necessidade'] ?? null
            ),
            'descricao' => [
                'medida' => $input['medida'] ?? null,
                'papel' => $input['papel'] ?? null,
                'acabamento' => $input['acabamento'] ?? null,
                'cores' => $input['cores'] ?? null,
                'etiq_por_rolo' => $input['etiq_por_rolo'] ?? null,
                'largura_cm' => $input['largura_cm'] ?? null,
                'puxada_cm' => $input['puxada_cm'] ?? null,
                'formato_faca' => $input['formato_faca'] ?? null,
                'faca_nova' => $facaNova,
                'faca_colunas_mapa' => $input['faca_colunas_mapa'] ?? null,
                'faca_posicao' => $input['faca_posicao'] ?? null,
                'faca_contorno_svg' => $input['faca_contorno_svg'] ?? null,
                'faca_diametro_cm' => $input['faca_diametro_cm'] ?? null,
                'modelos' => isset($input['modelos']) ? (int) $input['modelos'] : null,
                'modelos_composicao' => $this->modelosComposicaoPublica($input),
                'tipo_servico' => $input['tipo_servico'] ?? null,
                'descricao_servico' => $input['descricao_servico'] ?? null,
                'material_cliente' => isset($input['material_cliente']) ? (bool) $input['material_cliente'] : null,
                'unidade' => $input['unidade'] ?? null,
            ],
            'prazo_entrega_dias' => $orcamento->prazo_entrega_dias,
            'validade_dias' => $orcamento->validade_dias,
            'tolerancia_qtd_pct' => (float) $orcamento->tolerancia_qtd_pct,
            'condicao_pagamento' => $this->nullIfEmptySnap($input['condicao_pagamento'] ?? null),
            'forma_pagamento' => $this->nullIfEmptySnap($input['forma_pagamento'] ?? null),
            'frete' => $this->fretePublico($input, $result, $faixas),
            'cobra_matriz' => (bool) $orcamento->cobra_matriz,
            'valor_matriz' => (float) $orcamento->valor_matriz,
            'matriz_nota' => $orcamento->cobra_matriz ? 'Cobrado somente no 1º pedido deste modelo.' : null,
            'faixas' => $faixas,
            'observacao_comercial' => null,
            'modo' => $modo,
            'financeiro_status' => $orcamento->financeiro_status,
            'adiantamento' => null,
        ];
    }

    /**
     * CONSOLIDADO: valor, não fórmula (GERACAO §1.5 / ADR_ORC_FRETE_ESTIMADO).
     *
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $result
     * @param  list<array<string, mixed>>  $faixas
     * @return array{modo: string, texto: string, somavel: bool}
     */
    private function fretePublico(array $input, array $result, array $faixas): array
    {
        $snap = is_array($result['frete'] ?? null) ? $result['frete'] : [];
        $modo = strtoupper((string) ($snap['modo'] ?? $input['modo_entrega'] ?? OrcamentoFreteEstimadoService::MODO_RETIRAR));
        if ($modo !== OrcamentoFreteEstimadoService::MODO_ENTREGAR) {
            return [
                'modo' => OrcamentoFreteEstimadoService::MODO_RETIRAR,
                'texto' => 'Retirada no local',
                'somavel' => false,
            ];
        }

        $somavel = false;
        foreach ($faixas as $fx) {
            if (($fx['frete_somavel'] ?? false) && $fx['valor_frete'] !== null) {
                $somavel = true;
                break;
            }
        }

        $origem = strtoupper((string) ($snap['origem'] ?? $input['origem_frete'] ?? ''));
        $texto = 'Entrega — frete a combinar';
        if ($somavel) {
            $texto = 'Entrega — frete estimado';
        } elseif ($origem === OrcamentoFreteEstimadoService::ORIGEM_MANUAL) {
            $texto = 'Entrega — sem cobrança de frete';
        }

        return [
            'modo' => OrcamentoFreteEstimadoService::MODO_ENTREGAR,
            'texto' => $texto,
            'somavel' => $somavel,
        ];
    }

    private function nullIfEmptySnap(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

    /**
     * Composição de artes para a proposta ao cliente (só linhas com nome).
     *
     * @param  array<string, mixed>  $input
     * @return list<array{ordem: int, nome: string, percentual: float}>|null
     */
    private function modelosComposicaoPublica(array $input): ?array
    {
        $raw = $input['modelos_composicao'] ?? null;
        if (! is_array($raw) || $raw === []) {
            return null;
        }

        $out = [];
        foreach (array_values($raw) as $i => $row) {
            if (! is_array($row)) {
                continue;
            }
            $nome = trim((string) ($row['nome'] ?? ''));
            if ($nome === '') {
                continue;
            }
            $out[] = [
                'ordem' => (int) ($row['ordem'] ?? $i + 1),
                'nome' => $nome,
                'percentual' => round((float) ($row['percentual'] ?? 0), 4),
            ];
        }

        return $out === [] ? null : $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function dtoPagamentoPublico(Orcamento $orcamento, OrcamentoLinkAprovacao $link): array
    {
        $empresa = $orcamento->empresa;
        $adi = $this->adiantamento->dtoPublico($orcamento);

        return [
            'modo' => 'pagamento',
            'codigo' => $orcamento->codigo,
            'versao' => $orcamento->versao,
            'status' => $orcamento->status,
            'vencido' => false,
            'disponivel' => false,
            'financeiro_status' => $orcamento->financeiro_status,
            'expira_em' => $link->expira_em?->toIso8601String(),
            'cliente_nome' => $orcamento->cliente_nome,
            'empresa' => [
                'nome_fantasia' => $empresa?->nome_fantasia,
                'razao_social' => $empresa?->razao_social,
                'cnpj' => $empresa?->cnpj,
                'telefone' => $empresa?->telefone,
                'email' => $empresa?->email,
                'municipio' => $empresa?->municipio,
                'uf' => $empresa?->uf,
            ],
            'adiantamento' => $adi,
            'mensagem' => ($adi['pago'] ?? false)
                ? 'Pagamento confirmado. Orçamento aprovado.'
                : 'Proposta aceita. Conclua o pagamento do PIX abaixo — o orçamento fica aguardando pagamento até a confirmação.',
            'status_exibicao' => ($adi['pago'] ?? false) ? 'APROVADO' : 'AGUARDANDO_PAGAMENTO',
        ];
    }
}
