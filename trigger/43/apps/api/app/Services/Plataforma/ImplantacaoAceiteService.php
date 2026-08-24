<?php

namespace App\Services\Plataforma;

use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\EmpresaAtivacao;
use App\Models\EmpresaContaFinanceira;
use App\Models\Entrega;
use App\Models\Faturamento;
use App\Models\ImplantacaoAceite;
use App\Models\NaturezaGerencial;
use App\Models\OrcMapaFaca;
use App\Models\Orcamento;
use App\Models\OrdemProducao;
use App\Models\OrdemServico;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\Titulo;
use App\Models\User;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use App\Support\ImplantacaoCatalogo;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ImplantacaoAceiteService
{
    public function __construct(
        private readonly EmpresaCertificadoA1Service $certificadoA1,
    ) {}

    /**
     * @return array{
     *   empresa: array{id: int, codigo: string, nome: string},
     *   resumo: array<string, mixed>,
     *   ondas: list<array{onda: int, nome: string}>,
     *   itens: list<array<string, mixed>>
     * }
     */
    public function matriz(Empresa $empresa): array
    {
        $catalogo = ImplantacaoCatalogo::itens();
        $aceites = ImplantacaoAceite::query()
            ->with(['validadoDevPor:id,name', 'validadoClientePor:id,name'])
            ->where('empresa_id', $empresa->id)
            ->get()
            ->keyBy('codigo');

        $evidencias = $this->evidencias($empresa);
        $itens = [];

        foreach ($catalogo as $def) {
            /** @var ImplantacaoAceite|null $row */
            $row = $aceites->get($def['codigo']);
            $statusDev = $row?->status_dev ?? ImplantacaoCatalogo::STATUS_PENDENTE;
            $statusCliente = $row?->status_cliente ?? ImplantacaoCatalogo::STATUS_PENDENTE;
            $evKey = $def['evidencia'];
            $ev = $evKey !== null ? ($evidencias[$evKey] ?? null) : null;

            $itens[] = [
                'codigo' => $def['codigo'],
                'nome' => $def['nome'],
                'porque' => $def['porque'],
                'onda' => $def['onda'],
                'onda_nome' => ImplantacaoCatalogo::ONDA_NOMES[$def['onda']] ?? ('Onda '.$def['onda']),
                'superficie' => $def['superficie'],
                'elo' => $def['elo'],
                'paralelo' => $def['paralelo'],
                'rota' => $def['rota'],
                'linha' => $this->statusLinha($statusDev, $statusCliente),
                'status_dev' => $statusDev,
                'status_cliente' => $statusCliente,
                'obs_dev' => $row?->obs_dev,
                'obs_cliente' => $row?->obs_cliente,
                'validado_dev_em' => $row?->validado_dev_em?->toIso8601String(),
                'validado_cliente_em' => $row?->validado_cliente_em?->toIso8601String(),
                'validado_dev_por_nome' => $row?->validadoDevPor?->name,
                'validado_cliente_por_nome' => $row?->validadoClientePor?->name,
                'evidencia' => $ev,
            ];
        }

        return [
            'empresa' => [
                'id' => $empresa->id,
                'codigo' => $empresa->codigo,
                'nome' => $empresa->nome_fantasia ?? $empresa->razao_social,
            ],
            'resumo' => $this->resumo($itens),
            'ondas' => collect(ImplantacaoCatalogo::ONDA_NOMES)
                ->map(fn (string $nome, int $onda) => ['onda' => $onda, 'nome' => $nome])
                ->values()
                ->all(),
            'itens' => $itens,
        ];
    }

    /**
     * @param  array{eixo: string, status: string, observacao?: string|null}  $data
     * @return array<string, mixed>
     */
    public function validar(Empresa $empresa, string $codigo, User $user, array $data): array
    {
        if (! ImplantacaoCatalogo::existe($codigo)) {
            throw ValidationException::withMessages([
                'codigo' => ['Item de implantação desconhecido.'],
            ]);
        }

        $eixo = $data['eixo'];
        $status = $data['status'];
        $obs = isset($data['observacao']) ? trim((string) $data['observacao']) : null;
        if ($obs === '') {
            $obs = null;
        }

        if (! in_array($status, ImplantacaoCatalogo::statuses(), true)) {
            throw ValidationException::withMessages([
                'status' => ['Status inválido.'],
            ]);
        }

        if (! in_array($eixo, ['dev', 'cliente'], true)) {
            throw ValidationException::withMessages([
                'eixo' => ['Eixo deve ser dev ou cliente.'],
            ]);
        }

        $row = ImplantacaoAceite::query()->firstOrNew([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
        ]);

        if (! $row->exists) {
            $row->status_dev = ImplantacaoCatalogo::STATUS_PENDENTE;
            $row->status_cliente = ImplantacaoCatalogo::STATUS_PENDENTE;
        }

        if ($eixo === 'dev') {
            $row->status_dev = $status;
            $row->obs_dev = $obs;
            $row->validado_dev_por = $user->id;
            $row->validado_dev_em = now();
        } else {
            $row->status_cliente = $status;
            $row->obs_cliente = $obs;
            $row->validado_cliente_por = $user->id;
            $row->validado_cliente_em = now();
        }

        $row->save();

        $matriz = $this->matriz($empresa);
        foreach ($matriz['itens'] as $item) {
            if ($item['codigo'] === $codigo) {
                return $item;
            }
        }

        throw ValidationException::withMessages([
            'codigo' => ['Falha ao recarregar o item.'],
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $itens
     * @return array<string, mixed>
     */
    private function resumo(array $itens): array
    {
        $cont = static function (array $lista, ?string $superficie = null): array {
            $sub = $superficie === null
                ? $lista
                : array_values(array_filter($lista, fn ($i) => $i['superficie'] === $superficie));

            $total = count($sub);
            $aceitos = count(array_filter($sub, fn ($i) => $i['linha'] === 'aceito'));
            $prontos = count(array_filter($sub, fn ($i) => $i['linha'] === 'pronto_cliente'));
            $pendDev = count(array_filter($sub, fn ($i) => $i['linha'] === 'pendente_dev'));
            $bloqueados = count(array_filter($sub, fn ($i) => $i['linha'] === 'bloqueado'));
            $na = count(array_filter($sub, fn ($i) => $i['linha'] === 'na'));

            return [
                'total' => $total,
                'aceitos' => $aceitos,
                'prontos_para_cliente' => $prontos,
                'pendentes_dev' => $pendDev,
                'bloqueados' => $bloqueados,
                'na' => $na,
                'pct_aceitos' => $total > 0 ? (int) round(100 * $aceitos / $total) : 0,
            ];
        };

        $elos = array_values(array_filter($itens, fn ($i) => $i['elo'] === true));
        $jaAte = null;
        $proximo = null;
        foreach ($elos as $elo) {
            if ($elo['linha'] === 'aceito' || $elo['linha'] === 'na') {
                if ($elo['linha'] === 'aceito') {
                    $jaAte = ['codigo' => $elo['codigo'], 'nome' => $elo['nome']];
                }

                continue;
            }
            $proximo = ['codigo' => $elo['codigo'], 'nome' => $elo['nome'], 'linha' => $elo['linha']];
            break;
        }

        return [
            'geral' => $cont($itens),
            'flexorc' => $cont($itens, ImplantacaoCatalogo::SUPERFICIE_FLEXORC),
            'erp' => $cont($itens, ImplantacaoCatalogo::SUPERFICIE_ERP),
            'ja_operamos_ate' => $jaAte,
            'proximo_elo' => $proximo,
        ];
    }

    private function statusLinha(string $dev, string $cliente): string
    {
        if ($dev === ImplantacaoCatalogo::STATUS_NA && $cliente === ImplantacaoCatalogo::STATUS_NA) {
            return 'na';
        }
        if ($dev === ImplantacaoCatalogo::STATUS_RECUSADO || $cliente === ImplantacaoCatalogo::STATUS_RECUSADO) {
            return 'bloqueado';
        }
        if ($dev === ImplantacaoCatalogo::STATUS_OK && $cliente === ImplantacaoCatalogo::STATUS_OK) {
            return 'aceito';
        }
        if ($dev === ImplantacaoCatalogo::STATUS_OK
            && in_array($cliente, [ImplantacaoCatalogo::STATUS_PENDENTE, ImplantacaoCatalogo::STATUS_NA], true)) {
            return 'pronto_cliente';
        }
        if ($dev !== ImplantacaoCatalogo::STATUS_OK) {
            return 'pendente_dev';
        }

        return 'em_andamento';
    }

    /**
     * Evidências são apoio visual — nunca derrubam a matriz.
     *
     * @return array<string, array{ok: bool, label: string}>
     */
    private function evidencias(Empresa $empresa): array
    {
        $ev = static fn (bool $ok, string $sim, string $nao): array => [
            'ok' => $ok,
            'label' => $ok ? $sim : $nao,
        ];

        try {
            $usuarios = (int) DB::table('empresa_user')->where('empresa_id', $empresa->id)->count();
            $conta = $this->contaAtivacaoDaEmpresa($empresa);
            $ativacao = EmpresaAtivacao::query()->where('empresa_id', $empresa->id)->first();
            $a1Apto = $this->certificadoA1->aptoParaOperar($empresa);
            $pix = EmpresaContaFinanceira::query()
                ->where('empresa_id', $empresa->id)
                ->whereNotNull('pix_chave')
                ->where('pix_chave', '!=', '')
                ->exists();
            $parceiros = Parceiro::query()->where('empresa_id', $empresa->id)->count();
            $orcs = Orcamento::query()->where('empresa_id', $empresa->id)->count();
            $orcAprovado = Orcamento::query()
                ->where('empresa_id', $empresa->id)
                ->where('status', Orcamento::STATUS_APROVADO)
                ->exists();
            $facas = OrcMapaFaca::query()->where('empresa_id', $empresa->id)->count();
            $catalogoOk = $ativacao?->catalogo_conferido_em !== null;
            $sinal = Titulo::query()
                ->where('empresa_id', $empresa->id)
                ->where('tipo', Titulo::TIPO_RECEBER)
                ->whereNotNull('orcamento_id')
                ->exists();

            $pedidos = Pedido::query()->where('empresa_id', $empresa->id)->count();
            $opOs = OrdemProducao::query()->where('empresa_id', $empresa->id)->count()
                + OrdemServico::query()->where('empresa_id', $empresa->id)->count();
            $fat = Faturamento::query()->where('empresa_id', $empresa->id)->count();
            $exp = Entrega::query()->where('empresa_id', $empresa->id)->count();
            $naturezas = NaturezaGerencial::query()->where('aceita_lancamento', true)->count();

            return [
                'usuarios' => $ev($usuarios > 0, "{$usuarios} usuário(s) vinculados", 'Nenhum usuário na EMP'),
                'mensalidade' => $ev(
                    $conta?->acessoLiberado() ?? false,
                    $conta?->pagamentoAutenticado() ? 'Mensalidade autenticada' : 'Cortesia vigente',
                    'Mensalidade pendente'
                ),
                'empresa' => $ev(
                    filled($empresa->cnpj) && filled($empresa->razao_social),
                    'Empresa cadastrada',
                    'Cadastro incompleto'
                ),
                'certificado_a1' => $ev($a1Apto, 'A1 apto', 'A1 pendente ou inválido'),
                'cfin_pix' => $ev($pix, 'PIX cadastrado', 'Sem chave PIX na EMP'),
                'parceiros' => $ev($parceiros > 0, "{$parceiros} parceiro(s)", 'Nenhum parceiro'),
                'catalogo' => $ev($catalogoOk, 'Catálogo conferido', 'Catálogo ainda não conferido'),
                'facas' => $ev($facas > 0, "{$facas} faca(s)", 'Sem mapa de facas'),
                'orcamento' => $ev($orcs > 0, "{$orcs} orçamento(s)", 'Nenhum orçamento'),
                'orc_aprovado' => $ev($orcAprovado, 'Há orçamento aprovado', 'Sem aprovação ainda'),
                'sinal' => $ev($sinal, 'Há título/sinal na EMP', 'Sem sinal registrado'),
                'pedido' => $ev($pedidos > 0, "{$pedidos} pedido(s)", 'Nenhum pedido (ERP)'),
                'op_os' => $ev($opOs > 0, "{$opOs} OP/OS", 'Sem OP/OS (ERP)'),
                'faturamento' => $ev($fat > 0, "{$fat} faturamento(s)", 'Sem faturamento (ERP)'),
                'expedicao' => $ev($exp > 0, "{$exp} entrega(s)", 'Sem expedição (ERP)'),
                'naturezas' => $ev($naturezas > 0, 'Naturezas disponíveis', 'Sem naturezas'),
            ];
        } catch (\Throwable) {
            return [
                'usuarios' => $ev(false, '', 'Evidência indisponível'),
                'mensalidade' => $ev(false, '', 'Evidência indisponível'),
                'empresa' => $ev(
                    filled($empresa->cnpj) && filled($empresa->razao_social),
                    'Empresa cadastrada',
                    'Cadastro incompleto'
                ),
                'certificado_a1' => $ev(false, '', 'Evidência indisponível'),
                'cfin_pix' => $ev(false, '', 'Evidência indisponível'),
                'parceiros' => $ev(false, '', 'Evidência indisponível'),
                'catalogo' => $ev(false, '', 'Evidência indisponível'),
                'facas' => $ev(false, '', 'Evidência indisponível'),
                'orcamento' => $ev(false, '', 'Evidência indisponível'),
                'orc_aprovado' => $ev(false, '', 'Evidência indisponível'),
                'sinal' => $ev(false, '', 'Evidência indisponível'),
                'pedido' => $ev(false, '', 'Evidência indisponível'),
                'op_os' => $ev(false, '', 'Evidência indisponível'),
                'faturamento' => $ev(false, '', 'Evidência indisponível'),
                'expedicao' => $ev(false, '', 'Evidência indisponível'),
                'naturezas' => $ev(false, '', 'Evidência indisponível'),
            ];
        }
    }

    private function contaAtivacaoDaEmpresa(Empresa $empresa): ?ContaAtivacao
    {
        $masterId = DB::table('empresa_user')
            ->where('empresa_id', $empresa->id)
            ->orderBy('user_id')
            ->value('user_id');

        if ($masterId === null) {
            return null;
        }

        $conta = ContaAtivacao::query()->where('user_id', $masterId)->first();
        if ($conta !== null) {
            return $conta;
        }

        // Qualquer usuário da EMP com conta_ativacoes (master típico).
        $userIds = DB::table('empresa_user')->where('empresa_id', $empresa->id)->pluck('user_id');

        return ContaAtivacao::query()->whereIn('user_id', $userIds)->orderBy('id')->first();
    }
}
