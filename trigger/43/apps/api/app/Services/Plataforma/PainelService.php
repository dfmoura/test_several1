<?php

namespace App\Services\Plataforma;

use App\Models\BemPatrimonial;
use App\Models\Empresa;
use App\Models\Entrega;
use App\Models\EstoqueAjuste;
use App\Models\Orcamento;
use App\Models\OrdemCompra;
use App\Models\OrdemProducao;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Estoque\EstoqueReposicaoService;
use App\Services\Financeiro\AdiantamentoService;
use App\Support\FlexorcSuperficie;
use App\Support\PadraoDecimal;

/**
 * Cockpit de ação desta fatia (docs/ADR_PAINEL_COCKPIT.md):
 * filas com count>0 + KPIs da superfície comercial (parceiros, patrimônio, ORC→sinal, pedidos).
 * UI ordena Atenção → Em curso; este serviço só monta o contrato.
 */
class PainelService
{
    /** @var list<string> */
    private const ORC_EM_CURSO = [
        Orcamento::STATUS_RASCUNHO,
        Orcamento::STATUS_CALCULADO,
        Orcamento::STATUS_ENVIADO,
        Orcamento::STATUS_VISUALIZADO,
        Orcamento::STATUS_REPROVADO,
    ];

    /** @var list<string> */
    private const OP_EM_CURSO = [
        OrdemProducao::STATUS_ABERTA,
        OrdemProducao::STATUS_EM_ANDAMENTO,
    ];

    /** @var list<string> */
    private const PED_EM_CURSO = [
        Pedido::STATUS_LIBERADO,
        Pedido::STATUS_EM_PRODUCAO,
        Pedido::STATUS_PRODUZIDO,
    ];

    public function __construct(
        private readonly EmpresaAtivacaoService $ativacao,
        private readonly EstoqueReposicaoService $reposicao,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function montar(User $user, Empresa $empresa): array
    {
        $cadeia = [];
        $filas = [];

        $comercial = $user->can('orcamento.ler');
        $pedidos = $user->can('producao.ler');
        $producao = $pedidos;
        $faturamento = $user->can('faturamento.ler');
        $expedicao = $user->can('expedicao.ler');
        $compras = $user->can('compras.ler');
        $estoque = $user->can('estoque.ler');
        $financeiro = FlexorcSuperficie::expoeFinanceiro()
            && $user->can('financeiro.ler');

        if ($comercial) {
            $orcCurso = $this->contar(Orcamento::class, $empresa, self::ORC_EM_CURSO);
            $orcCliente = $this->contar(Orcamento::class, $empresa, Orcamento::STATUSES_AGUARDANDO_CLIENTE);
            $cadeia[] = $this->card(
                'orcamentos',
                'Orçamentos',
                'Em preparação ou com o cliente',
                $orcCurso,
                'inteiro',
                '/orcamentos',
                $orcCliente > 0,
            );
            $this->fila($filas, 'orc_cliente', 'Aguardando cliente', 'Proposta enviada, ainda sem aceite', $orcCliente, '/orcamentos');

            $clientes = Parceiro::query()
                ->where('empresa_id', $empresa->id)
                ->where(function ($q) {
                    $q->where('papel_cliente', true)->orWhere('is_prospect', true);
                })
                ->count();
            $cadeia[] = $this->card(
                'parceiros',
                'Parceiros',
                'Cadastro único (cliente, prospect, fornecedor…)',
                $clientes,
                'inteiro',
                '/parceiros',
                false,
            );
        }

        if ($pedidos) {
            $pedCurso = $this->contar(Pedido::class, $empresa, self::PED_EM_CURSO);
            $cadeia[] = $this->card(
                'pedidos',
                'Pedidos',
                'Liberados ou em execução',
                $pedCurso,
                'inteiro',
                '/pedidos',
                $pedCurso > 0,
            );
            $this->fila($filas, 'ped_curso', 'Pedidos em curso', 'Aguardando produção ou faturamento', $pedCurso, '/pedidos');
        }

        if ($producao) {
            $opCurso = $this->contar(OrdemProducao::class, $empresa, self::OP_EM_CURSO);
            $cadeia[] = $this->card(
                'ordens_producao',
                'Ordens de produção',
                'Abertas ou em andamento',
                $opCurso,
                'inteiro',
                '/ordens-producao',
                $opCurso > 0,
            );
            $this->fila($filas, 'op_curso', 'OP em andamento', 'Chão de fábrica aguardando conclusão', $opCurso, '/ordens-producao');
        }

        if ($faturamento) {
            $pedFaturar = $this->contar(Pedido::class, $empresa, [Pedido::STATUS_PRODUZIDO]);
            $cadeia[] = $this->card(
                'faturamentos',
                'Faturamentos',
                'Pedidos produzidos aguardando faturar',
                $pedFaturar,
                'inteiro',
                '/financeiro/faturamentos',
                $pedFaturar > 0,
            );
            $this->fila($filas, 'ped_faturar', 'Prontos para faturar', 'Produzidos, ainda sem NF/TIT', $pedFaturar, '/financeiro/faturamentos');
        }

        if ($expedicao) {
            $expPendente = Pedido::query()
                ->where('empresa_id', $empresa->id)
                ->whereIn('status', [Pedido::STATUS_FATURADO, Pedido::STATUS_EM_ENTREGA])
                ->count();
            $cadeia[] = $this->card(
                'expedicao',
                'Expedição',
                'Faturados à espera de saída',
                $expPendente,
                'inteiro',
                '/expedicao',
                $expPendente > 0,
            );
            $entCurso = $this->contar(Entrega::class, $empresa, Entrega::STATUSES_VIGENTES);
            $this->fila($filas, 'exp_curso', 'Entregas em curso', 'Retirada ou transporte aguardando confirmação', $entCurso, '/expedicao');
        }

        if ($user->can('patrimonio.ler')) {
            $bens = BemPatrimonial::query()->where('empresa_id', $empresa->id)->count();
            $cadeia[] = $this->card(
                'patrimonio',
                'Patrimônio',
                'Bens físicos ligados à hora-máquina do ORC',
                $bens,
                'inteiro',
                '/patrimonio',
                $bens < 1,
            );
        }

        if (FlexorcSuperficie::emiteSinalNoAceite()) {
            $sinal = Orcamento::query()
                ->where('empresa_id', $empresa->id)
                ->where('financeiro_status', AdiantamentoService::FIN_AGUARDA_ADIANTAMENTO)
                ->count();
            if ($comercial || $financeiro) {
                $cadeia[] = $this->card(
                    'sinal',
                    'Sinal / PIX',
                    'Aceitos aguardando adiantamento',
                    $sinal,
                    'inteiro',
                    '/orcamentos',
                    $sinal > 0,
                );
                $this->fila($filas, 'orc_sinal', 'Aguardando sinal', 'Cliente aprovou — falta o PIX/adiantamento', $sinal, '/orcamentos');
            }
        }

        if ($financeiro) {
            $receber = $this->titulosAbertos($empresa, Titulo::TIPO_RECEBER);
            $pagar = $this->titulosAbertos($empresa, Titulo::TIPO_PAGAR);
            $cadeia[] = $this->card(
                'receber',
                'A receber',
                'Sinal e demais títulos em aberto',
                $receber['saldo'],
                'moeda',
                '/financeiro/contas-a-receber?situacao=aberto',
                $receber['vencidos'] > 0,
            );
            $cadeia[] = $this->card(
                'pagar',
                'A pagar',
                'Fornecedores e demais títulos em aberto',
                $pagar['saldo'],
                'moeda',
                '/financeiro/contas-a-pagar?situacao=aberto',
                $pagar['vencidos'] > 0,
            );
            $this->fila($filas, 'tit_receber_vencido', 'Receber vencido', 'Títulos do cliente em atraso', $receber['vencidos'], '/financeiro/contas-a-receber?situacao=aberto&faixa=VENCIDO');
            $this->fila($filas, 'tit_pagar_vencido', 'Pagar vencido', 'Títulos a fornecedor em atraso', $pagar['vencidos'], '/financeiro/contas-a-pagar?situacao=aberto&faixa=VENCIDO');
        }

        if ($compras) {
            $ocAbertas = $this->contar(OrdemCompra::class, $empresa, OrdemCompra::STATUSES_RECEBIVEIS);
            $aRepor = count($this->reposicao->list($empresa));
            $this->fila($filas, 'oc_abertas', 'Ordens de compra em aberto', 'A receber ou parciais', $ocAbertas, '/compras/ordens');
            $this->fila($filas, 'reposicao', 'A repor', 'Saldo abaixo do mínimo gerencial', $aRepor, '/compras/reposicao');
        }

        if ($estoque) {
            $ajustes = $this->contar(EstoqueAjuste::class, $empresa, [EstoqueAjuste::STATUS_PENDENTE]);
            $this->fila($filas, 'ajustes', 'Ajustes de estoque pendentes', 'Aguardando alçada', $ajustes, '/estoque/ajustes');
        }

        return [
            'empresa' => [
                'id' => $empresa->id,
                'codigo' => $empresa->codigo,
                'nome' => $empresa->nome_fantasia ?: $empresa->razao_social,
                'venda_ativa' => (bool) $empresa->venda_ativa,
                'estoque_ativo' => (bool) $empresa->estoque_ativo,
            ],
            'modulos' => [
                'comercial' => $comercial,
                'pedidos' => $pedidos,
                'producao' => $producao,
                'expedicao' => $expedicao,
                'compras' => $compras,
                'estoque' => $estoque,
                'financeiro' => $financeiro,
            ],
            'cadeia' => $cadeia,
            'filas' => $filas,
            'ativacao' => $this->ativacao->dto($empresa, $user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function montarSemEmpresa(User $user): array
    {
        return [
            'empresa' => null,
            'modulos' => [
                'comercial' => false,
                'pedidos' => false,
                'producao' => false,
                'expedicao' => false,
                'compras' => false,
                'estoque' => false,
                'financeiro' => false,
            ],
            'cadeia' => [],
            'filas' => [],
            'ativacao' => $this->ativacao->dtoDaConta($user),
        ];
    }

    /**
     * @param  class-string  $model
     * @param  list<string>  $statuses
     */
    private function contar(string $model, Empresa $empresa, array $statuses): int
    {
        return $model::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('status', $statuses)
            ->count();
    }

    /**
     * @return array{saldo: string, vencidos: int}
     */
    private function titulosAbertos(Empresa $empresa, string $tipo): array
    {
        $base = Titulo::query()
            ->where('empresa_id', $empresa->id)
            ->where('tipo', $tipo)
            ->whereIn('status', [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL]);

        $sum = (clone $base)->sum('saldo');
        $saldo = PadraoDecimal::roundHalfUp((string) $sum, PadraoDecimal::SCALE_MONEY);
        $vencidos = (clone $base)
            ->whereDate('vencimento', '<', now()->toDateString())
            ->count();

        return ['saldo' => $saldo, 'vencidos' => $vencidos];
    }

    /**
     * @return array{id: string, label: string, hint: string, valor: int|string, formato: string, to: string, alerta: bool}
     */
    private function card(
        string $id,
        string $label,
        string $hint,
        int|string $valor,
        string $formato,
        string $to,
        bool $alerta,
    ): array {
        return compact('id', 'label', 'hint', 'valor', 'formato', 'to', 'alerta');
    }

    /**
     * @param  list<array<string, mixed>>  $filas
     */
    private function fila(array &$filas, string $id, string $label, string $hint, int $count, string $to): void
    {
        if ($count < 1) {
            return;
        }

        $filas[] = compact('id', 'label', 'hint', 'count', 'to');
    }
}
