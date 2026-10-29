<?php

declare(strict_types=1);

namespace App\Domain\Demanda;

use App\Domain\Auditoria\AuditoriaService;
use App\Domain\Carteira\CarteiraService;
use App\Domain\Fatura\FaturaService;
use App\Domain\Notificacao\NotificacaoService;
use App\Domain\RegraNegocio;
use App\Models\Apresentacao;
use App\Models\Aprovacao;
use App\Models\Demanda;
use App\Models\DemandaEvento;
use App\Models\Empresa;
use App\Models\Fatura;
use App\Models\Marco;
use App\Models\Mensagem;
use App\Models\NfseDocumento;
use App\Models\Parametro;
use App\Models\Proposta;
use App\Models\Usuario;
use App\Suporte\CpfProtegido;
use App\Suporte\DiasUteis;
use App\Suporte\Dinheiro;
use Illuminate\Support\Facades\DB;

class DemandaService
{
    public function __construct(
        private CarteiraService $carteira,
        private DemandaTransicao $transicao,
        private FaturaService $faturas,
        private NotificacaoService $notificacoes,
        private AuditoriaService $auditoria,
    ) {}

    /**
     * @param  array<string, mixed>  $dados
     */
    public function abrir(Empresa $empresa, Usuario $usuario, array $dados, bool $rascunho = false): Demanda
    {
        return DB::transaction(function () use ($empresa, $usuario, $dados, $rascunho) {
            $this->garantirPodeAbrir($empresa, true, ! $rascunho);
            $numero = DB::selectOne("SELECT nextval('demandas_codigo_seq') AS n")->n;
            $demanda = Demanda::query()->create([
                ...$dados,
                'codigo' => sprintf('DEM-%06d', $numero),
                'empresa_id' => $empresa->id,
                'aberto_por' => $usuario->id,
                'status' => 'RASCUNHO',
                'criada_em' => now(),
            ]);
            DemandaEvento::query()->create([
                'demanda_id' => $demanda->id,
                'de_status' => null,
                'para_status' => 'RASCUNHO',
                'ator_tipo' => 'CLIENTE',
                'ator_id' => $usuario->id,
                'motivo' => 'Demanda criada',
                'em' => now(),
            ]);
            if (! $rascunho) {
                $this->reservarEEnviar($demanda, $empresa, $usuario);
            }
            $this->auditoria->registrar('demanda_criada', 'demandas', $demanda->id, $empresa->id, null, [
                'codigo' => $demanda->codigo,
                'status' => $demanda->status,
            ]);
            if ($demanda->status === 'EM_ANALISE') {
                $this->notificacoes->operadores(
                    $empresa->id,
                    'demanda_recebida',
                    'Nova demanda '.$demanda->codigo,
                    $empresa->razao_social.' enviou '.$demanda->titulo.'.',
                );
            }

            return $demanda->refresh();
        });
    }

    public function enviarRascunho(Demanda $demanda, Usuario $usuario): void
    {
        DB::transaction(function () use ($demanda, $usuario) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if ($demanda->status !== 'RASCUNHO') {
                throw new RegraNegocio('Só um rascunho pode ser enviado.');
            }
            $empresa = Empresa::query()->lockForUpdate()->findOrFail($demanda->empresa_id);
            $this->garantirPodeAbrir($empresa, false);
            $this->reservarEEnviar($demanda, $empresa, $usuario);
            $this->notificacoes->operadores(
                $empresa->id,
                'demanda_recebida',
                'Nova demanda '.$demanda->codigo,
                $empresa->razao_social.' enviou '.$demanda->titulo.'.',
            );
        });
    }

    public function descartarRascunho(Demanda $demanda, Usuario $usuario): void
    {
        DB::transaction(function () use ($demanda, $usuario) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if ($demanda->status !== 'RASCUNHO') {
                throw new RegraNegocio('Só um rascunho pode ser descartado.');
            }
            $this->transicao->ir($demanda, 'CANCELADA', 'CLIENTE', $usuario->id, 'Rascunho descartado');
        });
    }

    /**
     * @param  array<string, mixed>  $dados
     */
    public function propor(Demanda $demanda, int $operadorId, array $dados): Proposta
    {
        return DB::transaction(function () use ($demanda, $operadorId, $dados) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if (! in_array($demanda->status, ['EM_ANALISE', 'PROPOSTA_ENVIADA'], true)) {
                throw new RegraNegocio('Esta demanda não aceita uma nova proposta.');
            }
            $minimo = Parametro::inteiro('TICKET_ABERTURA');
            if ((int) $dados['valor_centavos'] < $minimo) {
                throw new RegraNegocio('O valor da proposta não pode ser menor que o ticket de abertura ('.Dinheiro::reais($minimo).').');
            }
            Proposta::query()
                ->where('demanda_id', $demanda->id)
                ->where('status', 'VIGENTE')
                ->update(['status' => 'SUBSTITUIDA']);
            $versao = (int) Proposta::query()->where('demanda_id', $demanda->id)->max('versao') + 1;
            $proposta = Proposta::query()->create([
                ...$dados,
                'demanda_id' => $demanda->id,
                'versao' => $versao,
                'valida_ate' => now()->addDays(Parametro::inteiro('VALIDADE_PROPOSTA_DIAS')),
                'status' => 'VIGENTE',
                'criada_em' => now(),
            ]);
            if ($demanda->status === 'EM_ANALISE') {
                $this->transicao->ir($demanda, 'PROPOSTA_ENVIADA', 'TRIGGER', $operadorId);
            }
            $demanda->aguardando_cliente = true;
            $demanda->save();
            $this->auditoria->registrar('proposta_enviada', 'propostas', $proposta->id, $demanda->empresa_id, null, [
                'versao' => $versao,
                'valor_centavos' => $proposta->valor_centavos,
            ], 'TRIGGER', $operadorId);
            $this->avisarCliente(
                $demanda,
                'proposta_disponivel',
                'Proposta disponível',
                'A proposta v'.$versao.' de '.$demanda->codigo.' está pronta para a sua decisão. Valor: '.Dinheiro::reais($proposta->valor_centavos).'.',
            );

            return $proposta;
        });
    }

    public function aprovar(Demanda $demanda, Usuario $usuario, string $ip): Aprovacao
    {
        return DB::transaction(function () use ($demanda, $usuario, $ip) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            $proposta = $this->propostaVigente($demanda);
            if ($proposta->valida_ate->isPast()) {
                throw new RegraNegocio('Esta proposta venceu. Aguarde uma nova versão ou a expiração da demanda.');
            }
            $cpf = CpfProtegido::ler($usuario->cpf_cifrado);
            if ($cpf === null) {
                throw new RegraNegocio('Não foi possível confirmar o CPF do aprovador.');
            }
            $aprovacao = Aprovacao::query()->create([
                'proposta_id' => $proposta->id,
                'empresa_id' => $demanda->empresa_id,
                'usuario_id' => $usuario->id,
                'cpf_hash' => CpfProtegido::hash($cpf),
                'valor_centavos' => $proposta->valor_centavos,
                'escopo_snapshot' => $proposta->snapshot(),
                'ip' => $ip,
                'em' => now(),
            ]);
            $proposta->status = 'APROVADA';
            $proposta->save();
            $demanda->aguardando_cliente = false;
            $demanda->save();
            $this->transicao->ir($demanda, 'APROVADA', 'CLIENTE', $usuario->id, 'Proposta v'.$proposta->versao.' aprovada');
            $this->auditoria->registrar('demanda_aprovada', 'aprovacoes', $aprovacao->id, $demanda->empresa_id, null, [
                'proposta_id' => $proposta->id,
                'valor_centavos' => $proposta->valor_centavos,
            ]);
            $this->notificacoes->operadores(
                $demanda->empresa_id,
                'demanda_aprovada',
                $demanda->codigo.' aprovada',
                'O cliente aprovou a proposta v'.$proposta->versao.' por '.Dinheiro::reais($proposta->valor_centavos).'. A execução pode começar.',
            );

            return $aprovacao;
        });
    }

    public function recusarCliente(Demanda $demanda, Usuario $usuario, string $motivo): void
    {
        DB::transaction(function () use ($demanda, $usuario, $motivo) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            $proposta = $this->propostaVigente($demanda);
            $anteriores = Demanda::query()
                ->where('empresa_id', $demanda->empresa_id)
                ->where('status', 'RECUSADA_CLIENTE')
                ->where('encerrada_em', '>=', now()->subDays(Parametro::inteiro('JANELA_RECUSA_DIAS')))
                ->count();
            $cobra = $anteriores >= Parametro::inteiro('RECUSAS_SEM_CUSTO');
            $this->encerrarReserva($demanda, $usuario->id, 'CLIENTE', $cobra);
            $proposta->status = 'RECUSADA';
            $proposta->save();
            $this->transicao->ir($demanda, 'RECUSADA_CLIENTE', 'CLIENTE', $usuario->id, $motivo);
            $this->auditoria->registrar('demanda_recusada_cliente', 'demandas', $demanda->id, $demanda->empresa_id, null, [
                'cobra_ticket' => $cobra,
            ]);
        });
    }

    public function recusarTrigger(Demanda $demanda, int $operadorId, string $motivo): void
    {
        DB::transaction(function () use ($demanda, $operadorId, $motivo) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if (! in_array($demanda->status, ['EM_ANALISE', 'PROPOSTA_ENVIADA'], true)) {
                throw new RegraNegocio('A Trigger só recusa a demanda antes da aprovação.');
            }
            $this->devolverReserva($demanda, 'TRIGGER', $operadorId, 'Recusa da Trigger');
            Proposta::query()->where('demanda_id', $demanda->id)->where('status', 'VIGENTE')->update(['status' => 'RECUSADA']);
            $this->transicao->ir($demanda, 'RECUSADA_TRIGGER', 'TRIGGER', $operadorId, $motivo);
            $this->avisarCliente($demanda, 'demanda_recusada', 'Demanda não aceita', $demanda->codigo.' não foi aceita. O saldo reservado voltou para a carteira. Motivo: '.$motivo);
        });
    }

    public function expirar(Demanda $demanda): void
    {
        DB::transaction(function () use ($demanda) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if ($demanda->status !== 'PROPOSTA_ENVIADA') {
                return;
            }
            $proposta = Proposta::query()->where('demanda_id', $demanda->id)->where('status', 'VIGENTE')->first();
            if (! $proposta || $proposta->valida_ate->isFuture()) {
                return;
            }
            $this->devolverReserva($demanda, 'SISTEMA', null, 'Proposta expirada');
            $proposta->status = 'EXPIRADA';
            $proposta->save();
            $this->transicao->ir($demanda, 'EXPIRADA', 'SISTEMA', null, 'Proposta venceu sem decisão');
            $this->avisarCliente($demanda, 'proposta_expirada', 'Proposta vencida', 'A proposta de '.$demanda->codigo.' venceu e o saldo reservado voltou para a carteira.');
        });
    }

    public function iniciarExecucao(Demanda $demanda, int $operadorId): void
    {
        DB::transaction(function () use ($demanda, $operadorId) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if ($demanda->status !== 'APROVADA') {
                throw new RegraNegocio('A execução começa depois da aprovação.');
            }
            $this->transicao->ir($demanda, 'EM_EXECUCAO', 'TRIGGER', $operadorId);
            Marco::query()->create([
                'demanda_id' => $demanda->id,
                'texto' => 'Execução iniciada.',
                'visivel_ao_cliente' => true,
                'criado_por' => $operadorId,
                'criado_em' => now(),
            ]);
            $aprovada = Proposta::query()
                ->where('demanda_id', $demanda->id)
                ->where('status', 'APROVADA')
                ->first();
            $plano = PropostaEtapas::textoMarco(is_array($aprovada?->etapas) ? $aprovada->etapas : []);
            if ($plano !== null) {
                Marco::query()->create([
                    'demanda_id' => $demanda->id,
                    'texto' => $plano,
                    'visivel_ao_cliente' => true,
                    'criado_por' => $operadorId,
                    'criado_em' => now(),
                ]);
            }
            $this->avisarCliente($demanda, 'execucao_iniciada', 'Execução iniciada', 'A Trigger começou a executar '.$demanda->codigo.'.');
        });
    }

    public function apresentar(Demanda $demanda, int $operadorId, string $resumo): Apresentacao
    {
        return DB::transaction(function () use ($demanda, $operadorId, $resumo) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if ($demanda->status !== 'EM_EXECUCAO') {
                throw new RegraNegocio('A apresentação acontece durante a execução.');
            }
            if (! Proposta::query()->where('demanda_id', $demanda->id)->where('status', 'APROVADA')->exists()) {
                throw new RegraNegocio('Não há proposta aprovada para apresentar.');
            }
            $apresentacao = Apresentacao::query()->updateOrCreate(
                ['demanda_id' => $demanda->id],
                ['resumo' => $resumo, 'criada_em' => now()],
            );
            $demanda->validacao_ate = DiasUteis::somar(now(), Parametro::inteiro('DIAS_VALIDACAO_UTEIS'));
            $demanda->aguardando_cliente = true;
            $demanda->save();
            $this->transicao->ir($demanda, 'AGUARDANDO_VALIDACAO', 'TRIGGER', $operadorId, 'Entrega apresentada para validação');
            $this->auditoria->registrar('demanda_apresentada', 'apresentacoes', $apresentacao->id, $demanda->empresa_id, null, [
                'validacao_ate' => $demanda->validacao_ate->toIso8601String(),
            ], 'TRIGGER', $operadorId);
            $prazo = $demanda->validacao_ate->timezone('America/Sao_Paulo')->format('d/m/Y H:i');
            $this->avisarCliente(
                $demanda,
                'apresentacao_pronta',
                'Entrega para validar',
                'A entrega de '.$demanda->codigo.' está pronta. O saldo só é abatido depois da sua validação, até '.$prazo.'.',
            );

            return $apresentacao;
        });
    }

    public function validarEntrega(Demanda $demanda, Usuario $usuario): Fatura
    {
        $fatura = $this->faturarValidacao($demanda, 'CLIENTE', $usuario->id, 'Entrega validada pelo cliente', false);
        if (! $fatura) {
            throw new RegraNegocio('Esta entrega não está aguardando validação.');
        }

        return $fatura;
    }

    public function validarPorPrazo(Demanda $demanda): void
    {
        $this->faturarValidacao($demanda, 'SISTEMA', null, 'Prazo de validação encerrado. Aceite registrado.', true);
    }

    public function pedirAjuste(Demanda $demanda, Usuario $usuario, string $motivo): void
    {
        DB::transaction(function () use ($demanda, $usuario, $motivo) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if ($demanda->status !== 'AGUARDANDO_VALIDACAO') {
                throw new RegraNegocio('O ajuste só cabe enquanto a entrega aguarda validação.');
            }
            if ((int) $demanda->ajustes_usados >= 1) {
                throw new RegraNegocio('O ajuste deste escopo já foi usado. Valide a entrega ou aguarde o prazo.');
            }
            if (Fatura::query()->where('demanda_id', $demanda->id)->exists()) {
                throw new RegraNegocio('Esta entrega já foi validada.');
            }
            $demanda->ajustes_usados = 1;
            $demanda->validacao_ate = null;
            $demanda->aguardando_cliente = false;
            $demanda->save();
            Mensagem::query()->create([
                'demanda_id' => $demanda->id,
                'autor_tipo' => 'CLIENTE',
                'autor_id' => $usuario->id,
                'visibilidade' => 'CLIENTE',
                'corpo' => 'Ajuste pedido: '.$motivo,
                'criada_em' => now(),
            ]);
            $this->transicao->ir($demanda, 'EM_EXECUCAO', 'CLIENTE', $usuario->id, $motivo);
            $this->auditoria->registrar('ajuste_pedido', 'demandas', $demanda->id, $demanda->empresa_id, null, [
                'motivo' => $motivo,
            ]);
            $this->notificacoes->operadores(
                $demanda->empresa_id,
                'ajuste_pedido',
                $demanda->codigo.' voltou para execução',
                'O cliente pediu um ajuste dentro do escopo aprovado. O saldo não foi abatido. Motivo: '.$motivo,
            );
        });
    }

    public function cancelarDepoisDaAprovacao(Demanda $demanda, int $operadorId, string $motivo, bool $consumirTicket): void
    {
        DB::transaction(function () use ($demanda, $operadorId, $motivo, $consumirTicket) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if (! in_array($demanda->status, ['APROVADA', 'EM_EXECUCAO', 'AGUARDANDO_VALIDACAO'], true)) {
                throw new RegraNegocio('Depois da validação o cancelamento segue a fatura, não este caminho.');
            }
            if (Fatura::query()->where('demanda_id', $demanda->id)->exists()) {
                throw new RegraNegocio('Esta demanda já tem fatura.');
            }
            $this->encerrarReserva($demanda, $operadorId, 'TRIGGER', $consumirTicket);
            $this->transicao->ir($demanda, 'CANCELADA', 'TRIGGER', $operadorId, $motivo);
            $this->auditoria->registrar('demanda_cancelada', 'demandas', $demanda->id, $demanda->empresa_id, null, [
                'consumiu_ticket' => $consumirTicket,
            ], 'TRIGGER', $operadorId);
        });
    }

    private function faturarValidacao(Demanda $demanda, string $atorTipo, ?int $atorId, string $motivo, bool $silencioso): ?Fatura
    {
        return DB::transaction(function () use ($demanda, $atorTipo, $atorId, $motivo, $silencioso) {
            $demanda = Demanda::query()->lockForUpdate()->findOrFail($demanda->id);
            if ($demanda->status !== 'AGUARDANDO_VALIDACAO') {
                if ($silencioso) {
                    return null;
                }
                throw new RegraNegocio('Esta entrega não está aguardando validação.');
            }
            if ($silencioso && ($demanda->validacao_ate === null || $demanda->validacao_ate->isFuture())) {
                return null;
            }
            $proposta = Proposta::query()->where('demanda_id', $demanda->id)->where('status', 'APROVADA')->first();
            if (! $proposta) {
                throw new RegraNegocio('Não há proposta aprovada para faturar.');
            }
            $aprovacao = Aprovacao::query()->where('proposta_id', $proposta->id)->first();
            $valor = (int) ($aprovacao?->valor_centavos ?? $proposta->valor_centavos);
            $this->carteira->travar($demanda->empresa_id);
            $cobertura = $this->faturas->cobertura($demanda);
            $complemento = max(0, $valor - $cobertura);
            $fatura = Fatura::query()->create([
                'empresa_id' => $demanda->empresa_id,
                'demanda_id' => $demanda->id,
                'proposta_id' => $proposta->id,
                'valor_centavos' => $valor,
                'complemento_centavos' => $complemento,
                'status' => 'ABERTA',
                'nfse_status' => 'PLANEJADA',
                'criada_em' => now(),
            ]);
            NfseDocumento::query()->create([
                'fatura_id' => $fatura->id,
                'status' => 'PLANEJADA',
                'atualizado_em' => now(),
            ]);
            $demanda->aguardando_cliente = false;
            $demanda->save();
            $this->transicao->ir($demanda, 'APRESENTADA', $atorTipo, $atorId, $motivo);
            if ($complemento === 0) {
                $this->faturas->liquidar($fatura);
            } else {
                $this->faturas->complementarSePrecisar($fatura->refresh());
                $falta = Dinheiro::reais($complemento);
                $texto = $atorTipo === 'SISTEMA'
                    ? 'O prazo de validação de '.$demanda->codigo.' encerrou. A entrega foi aceita. Falta '.$falta.' por PIX para concluir.'
                    : 'A entrega de '.$demanda->codigo.' foi validada. Falta '.$falta.' por PIX para concluir.';
                $this->avisarCliente($demanda, 'entrega_validada', 'Entrega validada', $texto);
            }
            $this->auditoria->registrar('entrega_validada', 'faturas', $fatura->id, $demanda->empresa_id, null, [
                'valor_centavos' => $fatura->valor_centavos,
                'complemento_centavos' => $complemento,
                'aceite' => $atorTipo === 'SISTEMA' ? 'tacito' : 'cliente',
            ], $atorTipo, $atorId);

            return $fatura->refresh();
        });
    }

    private function reservarEEnviar(Demanda $demanda, Empresa $empresa, Usuario $usuario): void
    {
        $ticket = Parametro::inteiro('TICKET_ABERTURA');
        $this->carteira->movimentar(
            $empresa->id,
            'RESERVA',
            'disponivel',
            $ticket,
            'reserva:demanda:'.$demanda->id,
            [
                'demanda_id' => $demanda->id,
                'ator_tipo' => 'CLIENTE',
                'ator_id' => $usuario->id,
                'observacao' => 'Abertura da demanda',
            ],
        );
        $this->transicao->ir($demanda, 'EM_ANALISE', 'CLIENTE', $usuario->id, 'Ticket reservado');
    }

    private function garantirPodeAbrir(Empresa $empresa, bool $verificarDemandaAberta = true, bool $exigirSaldo = true): void
    {
        if ($empresa->status !== 'ATIVA') {
            throw new RegraNegocio($this->motivoConta($empresa->status));
        }
        $vencida = Fatura::query()
            ->where('empresa_id', $empresa->id)
            ->where('status', 'ABERTA')
            ->where('criada_em', '<=', now()->subDays(Parametro::inteiro('DIAS_PARA_BLOQUEIO')))
            ->exists();
        if ($vencida) {
            throw new RegraNegocio('Há uma liquidação em atraso. Regularize o PIX da entrega antes de abrir outra demanda.');
        }
        if ($verificarDemandaAberta) {
            $aberta = Demanda::query()
                ->where('empresa_id', $empresa->id)
                ->whereNotIn('status', Demanda::TERMINAIS)
                ->exists();
            if ($aberta) {
                throw new RegraNegocio('Há uma demanda em andamento. Conclua ou encerre essa demanda antes de abrir outra.');
            }
        }
        if (! $exigirSaldo) {
            return;
        }
        $carteira = $this->carteira->garantir($empresa->id);
        $ticket = Parametro::inteiro('TICKET_ABERTURA');
        if ((int) $carteira->disponivel_centavos < $ticket) {
            throw new RegraNegocio('Saldo insuficiente para abrir uma demanda. Disponível: '.Dinheiro::reais((int) $carteira->disponivel_centavos).'. É preciso '.Dinheiro::reais($ticket).'.');
        }
    }

    private function motivoConta(string $status): string
    {
        return match ($status) {
            'AGUARDA_PIX', 'RASCUNHO' => 'A conta ainda não foi ativada. Conclua o PIX de ativação.',
            'BLOQUEADA' => 'Sua conta está bloqueada por uma liquidação em atraso.',
            'EXPIRADA' => 'Este cadastro expirou. Faça um novo cadastro.',
            'CANCELADA' => 'Esta conta foi cancelada.',
            default => 'A conta não pode abrir demanda neste estado.',
        };
    }

    private function propostaVigente(Demanda $demanda): Proposta
    {
        if ($demanda->status !== 'PROPOSTA_ENVIADA') {
            throw new RegraNegocio('Não há proposta aguardando a sua decisão.');
        }
        $proposta = Proposta::query()->where('demanda_id', $demanda->id)->where('status', 'VIGENTE')->first();
        if (! $proposta) {
            throw new RegraNegocio('Não há proposta vigente.');
        }

        return $proposta;
    }

    private function encerrarReserva(Demanda $demanda, ?int $atorId, string $atorTipo, bool $consumir): void
    {
        $reserva = $this->carteira->reservaAberta($demanda->id);
        if ($reserva <= 0) {
            return;
        }
        if ($consumir) {
            $this->carteira->movimentar(
                $demanda->empresa_id,
                'CONSUMO',
                'reservado',
                $reserva,
                'consumo:demanda:'.$demanda->id.':analise',
                [
                    'demanda_id' => $demanda->id,
                    'ator_tipo' => $atorTipo,
                    'ator_id' => $atorId,
                    'observacao' => 'ANALISE_NAO_CONTRATADA',
                ],
            );

            return;
        }
        $this->devolverReserva($demanda, $atorTipo, $atorId, 'Reserva devolvida');
    }

    private function devolverReserva(Demanda $demanda, string $atorTipo, ?int $atorId, string $observacao): void
    {
        $reserva = $this->carteira->reservaAberta($demanda->id);
        if ($reserva <= 0) {
            return;
        }
        $this->carteira->movimentar(
            $demanda->empresa_id,
            'ESTORNO_RESERVA',
            'reservado',
            $reserva,
            'estorno:demanda:'.$demanda->id,
            [
                'demanda_id' => $demanda->id,
                'ator_tipo' => $atorTipo,
                'ator_id' => $atorId,
                'observacao' => $observacao,
            ],
        );
    }

    private function avisarCliente(Demanda $demanda, string $tipo, string $titulo, string $corpo): void
    {
        $usuario = Usuario::query()->find($demanda->aberto_por);
        if ($usuario) {
            $this->notificacoes->cliente($usuario, $demanda->empresa_id, $tipo, $titulo, $corpo);
        }
    }
}
