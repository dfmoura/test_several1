<?php

namespace App\Services\Plataforma;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\Orcamento;
use App\Models\OrdemCompra;
use App\Models\OrdemProducao;
use App\Models\Pedido;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Estoque\EstoqueReposicaoService;
use App\Support\PadraoDecimal;

/**
 * Cockpit da EMP ativa — cadeia operacional do estudo 32 (ORC→PED→OP→ENT→TIT).
 * Não é DRE (M10), não é sitemap (menu lateral), não é marca (shell).
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
    private const PED_ENCERRADOS = [
        Pedido::STATUS_ENCERRADO,
        Pedido::STATUS_CANCELADO,
    ];

    public function __construct(private readonly EstoqueReposicaoService $reposicao) {}

    /**
     * @return array<string, mixed>
     */
    public function montar(User $user, Empresa $empresa): array
    {
        $cadeia = [];
        $filas = [];

        $comercial = $user->can('orcamento.ler');
        $pedidos = $comercial || $user->can('producao.ler');
        $producao = $user->can('producao.ler');
        $expedicao = $user->can('expedicao.ler');
        $compras = $user->can('compras.ler');
        $estoque = $user->can('estoque.ler');
        $financeiro = $user->can('financeiro.ler');

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
        }

        if ($pedidos) {
            $pedCurso = Pedido::query()
                ->where('empresa_id', $empresa->id)
                ->whereNotIn('status', self::PED_ENCERRADOS)
                ->count();
            $pedFaturar = $this->contar(Pedido::class, $empresa, [Pedido::STATUS_PRODUZIDO]);
            $cadeia[] = $this->card(
                'pedidos',
                'Pedidos',
                'Em curso nesta EMP',
                $pedCurso,
                'inteiro',
                '/pedidos',
                $pedFaturar > 0,
            );
            $this->fila($filas, 'ped_faturar', 'Prontos para faturar', 'Produzidos, ainda sem NF/TIT', $pedFaturar, '/pedidos');
        }

        if ($producao) {
            $opAbertas = $this->contar(OrdemProducao::class, $empresa, OrdemProducao::STATUSES_ABERTOS);
            $cadeia[] = $this->card(
                'producao',
                'Produção',
                'OP abertas ou em andamento',
                $opAbertas,
                'inteiro',
                '/ordens-producao',
                $opAbertas > 0,
            );
        }

        if ($expedicao) {
            $filaExp = Pedido::query()
                ->where('empresa_id', $empresa->id)
                ->whereIn('status', [Pedido::STATUS_FATURADO, Pedido::STATUS_EM_ENTREGA])
                ->count();
            $cadeia[] = $this->card(
                'expedicao',
                'Expedição',
                'Faturados à espera de saída',
                $filaExp,
                'inteiro',
                '/expedicao',
                $filaExp > 0,
            );
        }

        if ($financeiro) {
            $receber = $this->titulosAbertos($empresa, Titulo::TIPO_RECEBER);
            $pagar = $this->titulosAbertos($empresa, Titulo::TIPO_PAGAR);
            $cadeia[] = $this->card(
                'receber',
                'A receber',
                'Saldo em aberto',
                $receber['saldo'],
                'moeda',
                '/financeiro/contas-a-receber?situacao=aberto',
                $receber['vencidos'] > 0,
            );
            $cadeia[] = $this->card(
                'pagar',
                'A pagar',
                'Saldo em aberto',
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
