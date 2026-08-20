<?php

namespace App\Services\Plataforma;

use App\Models\BemPatrimonial;
use App\Models\Empresa;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Financeiro\AdiantamentoService;
use App\Support\FlexorcSuperficie;
use App\Support\PadraoDecimal;

/**
 * Cockpit desta fatia: cadastro de parceiros + patrimônio + ORC até o envio.
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

    public function __construct(private readonly EmpresaAtivacaoService $ativacao) {}

    /**
     * @return array<string, mixed>
     */
    public function montar(User $user, Empresa $empresa): array
    {
        $cadeia = [];
        $filas = [];

        $comercial = $user->can('orcamento.ler');
        $financeiro = FlexorcSuperficie::expoeFinanceiro()
            && ($user->can('financeiro.ler') || $comercial);

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
            $cadeia[] = $this->card(
                'receber',
                'A receber',
                'Sinal e demais títulos em aberto',
                $receber['saldo'],
                'moeda',
                '/financeiro/contas-a-receber?situacao=aberto',
                $receber['vencidos'] > 0,
            );
            $this->fila($filas, 'tit_receber_vencido', 'Receber vencido', 'Títulos do cliente em atraso', $receber['vencidos'], '/financeiro/contas-a-receber?situacao=aberto&faixa=VENCIDO');
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
                'pedidos' => false,
                'producao' => false,
                'expedicao' => false,
                'compras' => false,
                'estoque' => false,
                'financeiro' => $financeiro,
            ],
            'cadeia' => $cadeia,
            'filas' => $filas,
            'ativacao' => $this->ativacao->dto($empresa),
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
