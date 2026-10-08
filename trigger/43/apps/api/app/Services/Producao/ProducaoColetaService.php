<?php

namespace App\Services\Producao;

use App\Models\Empresa;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\EstoqueSaldo;
use App\Models\OrdemProducao;
use App\Models\OrdemProducaoMaterial;
use App\Models\Produto;
use App\Services\Estoque\EstoqueSaldoWriter;
use App\Support\CaixaMedida;
use App\Support\InsumoEscolhaRelacao;
use App\Support\PadraoDecimal;
use App\Support\ProdutoLotePolitica;
use Illuminate\Validation\ValidationException;

/**
 * Preview e volumes da coleta dirigida (ADR_PRODUCAO_COLETA_DIRIGIDA).
 * Só leitura + DTO — a escrita continua no writer / requisitarMaterial.
 */
class ProducaoColetaService
{
    /** Grupos de bobina em matéria-prima (ADR_CADASTRO_INSUMO_VOLUME). */
    private const GRUPOS_BOBINA = ['MP-PAP', 'MP-FLM', 'MP-LAM', 'MP-RET', 'MP-TEC', 'MP-CLD', 'MP-ADF'];

    /** @var array<int, list<array<string, mixed>>> */
    private array $bobinasPorEmpresa = [];

    public function __construct(private readonly EstoqueSaldoWriter $saldos) {}

    /**
     * @return array<string, mixed>
     */
    public function preview(
        Empresa $empresa,
        Produto $produto,
        string $qtde,
    ): array {
        $qtde = PadraoDecimal::roundHalfUp($qtde, PadraoDecimal::SCALE_QTY);
        $unidade = $produto->unidade_interna ?? 'UN';

        if (! $produto->controla_lote) {
            return [
                'controla_lote' => false,
                'politica' => 'QTD',
                'qtde' => $qtde,
                'unidade' => $unidade,
                'suficiente' => true,
                'qtde_faltante' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY),
                'volumes' => [],
                'candidatos' => [],
            ];
        }

        $sugeridas = $this->saldos->sugerirAlocacaoSaida($empresa, $produto, $qtde);
        $idsSugeridos = [];
        foreach ($sugeridas as $aloc) {
            if (! empty($aloc['lote_id'])) {
                $idsSugeridos[(int) $aloc['lote_id']] = (string) $aloc['qtde'];
            }
        }

        $lotes = EstoqueLote::query()
            ->with('endereco:id,codigo')
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->where('qtde', '>', 0)
            ->orderByRaw('data_validade IS NULL')
            ->orderBy('data_validade')
            ->orderBy('data_entrada')
            ->orderBy('id')
            ->get();

        $porId = $lotes->keyBy('id');
        $volumes = [];
        $ordem = 1;
        foreach ($sugeridas as $aloc) {
            $loteId = (int) ($aloc['lote_id'] ?? 0);
            $lote = $porId->get($loteId);
            if (! $lote) {
                continue;
            }
            $volumes[] = $this->identificarProduto(
                $this->volumeToOut($lote, (string) $aloc['qtde'], true, 'FEFO', $ordem),
                $produto,
            );
            $ordem++;
        }

        $candidatos = [];
        foreach ($lotes as $lote) {
            if (isset($idsSugeridos[(int) $lote->id])) {
                continue;
            }
            $candidatos[] = $this->identificarProduto(
                $this->volumeToOut($lote, '0', false, 'DISPONIVEL', null),
                $produto,
            );
        }

        $alocado = '0';
        foreach ($sugeridas as $aloc) {
            $alocado = bcadd($alocado, (string) $aloc['qtde'], PadraoDecimal::SCALE_QTY);
        }
        $alocado = PadraoDecimal::roundHalfUp($alocado, PadraoDecimal::SCALE_QTY);
        $faltante = bccomp($alocado, $qtde, PadraoDecimal::SCALE_QTY) < 0
            ? PadraoDecimal::roundHalfUp(
                bcsub($qtde, $alocado, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            )
            : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);

        return [
            'controla_lote' => true,
            'politica' => 'FEFO_FIFO',
            'qtde' => $qtde,
            'unidade' => $unidade,
            'suficiente' => bccomp($faltante, '0', PadraoDecimal::SCALE_QTY) === 0 && $sugeridas !== [],
            'qtde_faltante' => $faltante,
            'volumes' => $this->ordenarCaminhada($volumes),
            'candidatos' => $this->ordenarCaminhada($candidatos),
        ];
    }

    /**
     * Volumes já baixados nesta OP para o SKU (inclui complementar).
     *
     * @return list<array<string, mixed>>
     */
    public function volumesBaixados(Empresa $empresa, OrdemProducao $op, int $produtoId): array
    {
        $itens = EstoqueMovimentoItem::query()
            ->with([
                'produto:id,codigo,descricao_fiscal,descricao_comercial',
                'lote.endereco:id,codigo',
                'movimento:id,codigo,tipo,ordem_producao_id,empresa_id,created_at,observacao',
            ])
            ->where('produto_id', $produtoId)
            ->whereHas('movimento', function ($q) use ($empresa, $op) {
                $q->where('empresa_id', $empresa->id)
                    ->where('ordem_producao_id', $op->id)
                    ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO);
            })
            ->orderBy('movimento_id')
            ->orderBy('ordem')
            ->get();

        $out = [];
        $ordem = 1;
        foreach ($itens as $item) {
            $lote = $item->lote;
            if ($lote) {
                $linha = $this->volumeToOut($lote, (string) $item->qtde, false, 'BAIXADO', $ordem);
            } else {
                $linha = [
                    'lote_id' => null,
                    'codigo' => null,
                    'qtde_volume' => null,
                    'qtde_retirar' => (string) $item->qtde,
                    'unidade' => $item->unidade,
                    'data_entrada' => null,
                    'data_validade' => null,
                    'status' => null,
                    'status_label' => null,
                    'largura_mm' => null,
                    'comprimento_m' => null,
                    'endereco' => null,
                    'sugerido' => false,
                    'motivo' => 'BAIXADO',
                    'ordem_politica' => $ordem,
                ];
            }
            $linha['movimento_id'] = $item->movimento_id;
            $linha['movimento_codigo'] = $item->movimento?->codigo;
            $linha['movimento_em'] = optional($item->movimento?->created_at)?->toIso8601String();
            $out[] = $this->identificarProduto($linha, $item->produto);
            $ordem++;
        }

        return $out;
    }

    /**
     * @param  list<array{lote_id?: int, qtde?: string}>  $volumes
     */
    public function validarOverride(
        Empresa $empresa,
        Produto $produto,
        string $qtde,
        array $volumes,
        ?string $motivo,
    ): void {
        if (! $produto->controla_lote) {
            if ($volumes !== []) {
                throw ValidationException::withMessages([
                    'volumes' => ['Este SKU não controla lote — não informe volumes.'],
                ]);
            }

            return;
        }

        $sugeridas = $this->saldos->sugerirAlocacaoSaida($empresa, $produto, $qtde);
        if ($this->saldos->alocacoesIguais($sugeridas, $volumes)) {
            return;
        }

        $motivo = trim((string) $motivo);
        if (mb_strlen($motivo) < 3) {
            throw ValidationException::withMessages([
                'volumes_motivo' => [
                    'Informe o motivo (mínimo 3 caracteres) para retirar um volume diferente da sugestão FEFO.',
                ],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function daLinha(
        Empresa $empresa,
        OrdemProducao $op,
        OrdemProducaoMaterial $mat,
        ?string $qtde = null,
    ): array {
        $produto = $mat->produto;
        if (! $produto) {
            throw ValidationException::withMessages([
                'material_id' => ['Material sem SKU.'],
            ]);
        }

        $pendente = $mat->saida_movimento_id === null
            || bccomp((string) $mat->qtde_requisitada, '0', PadraoDecimal::SCALE_QTY) <= 0;
        $qtdeAlvo = $qtde !== null && $qtde !== ''
            ? PadraoDecimal::roundHalfUp($qtde, PadraoDecimal::SCALE_QTY)
            : PadraoDecimal::roundHalfUp(
                $pendente ? (string) $mat->qtde_planejada : (string) $mat->qtde_requisitada,
                PadraoDecimal::SCALE_QTY
            );

        $out = $pendente || ($qtde !== null && $qtde !== '')
            ? $this->preview($empresa, $produto, $qtdeAlvo)
            : [
                'controla_lote' => (bool) $produto->controla_lote,
                'politica' => $produto->controla_lote ? 'FEFO_FIFO' : 'QTD',
                'qtde' => $qtdeAlvo,
                'unidade' => $produto->unidade_interna ?? $mat->unidade,
                'suficiente' => true,
                'qtde_faltante' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY),
                'volumes' => [],
                'candidatos' => [],
            ];

        $out['volumes_baixados'] = $this->volumesBaixados($empresa, $op, (int) $mat->produto_id);
        $out['volumes_a_devolver'] = $this->volumesADevolver($empresa, $op, (int) $mat->produto_id);

        return $out;
    }

    /**
     * Volumes ainda fora da prateleira nesta OP (SAIDA − ENTRADA_SOBRA), por lote.
     *
     * @return list<array<string, mixed>>
     */
    public function volumesADevolver(Empresa $empresa, OrdemProducao $op, int $produtoId): array
    {
        $agg = [];
        $meta = [];

        $aplicar = function (string $sinal, $itens) use (&$agg, &$meta): void {
            foreach ($itens as $item) {
                $loteId = $item->lote_id ? (int) $item->lote_id : 0;
                $key = $loteId > 0 ? 'L'.$loteId : 'S';
                $q = PadraoDecimal::roundHalfUp((string) $item->qtde, PadraoDecimal::SCALE_QTY);
                $agg[$key] = isset($agg[$key])
                    ? PadraoDecimal::roundHalfUp(
                        $sinal === '+'
                            ? bcadd($agg[$key], $q, PadraoDecimal::SCALE_QTY + 4)
                            : bcsub($agg[$key], $q, PadraoDecimal::SCALE_QTY + 4),
                        PadraoDecimal::SCALE_QTY
                    )
                    : ($sinal === '+' ? $q : PadraoDecimal::roundHalfUp(
                        bcmul($q, '-1', PadraoDecimal::SCALE_QTY + 4),
                        PadraoDecimal::SCALE_QTY
                    ));
                if (! isset($meta[$key])) {
                    $meta[$key] = $item;
                }
            }
        };

        $saidas = EstoqueMovimentoItem::query()
            ->with(['lote.endereco:id,codigo', 'produto:id,codigo,descricao_fiscal,descricao_comercial'])
            ->where('produto_id', $produtoId)
            ->whereHas('movimento', function ($q) use ($empresa, $op) {
                $q->where('empresa_id', $empresa->id)
                    ->where('ordem_producao_id', $op->id)
                    ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO);
            })
            ->get();
        $aplicar('+', $saidas);

        $sobras = EstoqueMovimentoItem::query()
            ->with(['lote.endereco:id,codigo', 'produto:id,codigo,descricao_fiscal,descricao_comercial'])
            ->where('produto_id', $produtoId)
            ->whereHas('movimento', function ($q) use ($empresa, $op) {
                $q->where('empresa_id', $empresa->id)
                    ->where('ordem_producao_id', $op->id)
                    ->where('tipo', EstoqueMovimento::TIPO_ENTRADA_SOBRA);
            })
            ->get();
        $aplicar('-', $sobras);

        $out = [];
        $ordem = 1;
        foreach ($agg as $key => $qtde) {
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }
            /** @var EstoqueMovimentoItem $item */
            $item = $meta[$key];
            $lote = $item->lote;
            if ($lote) {
                $linha = $this->volumeToOut($lote, $qtde, false, 'A_DEVOLVER', $ordem);
            } else {
                $linha = [
                    'lote_id' => null,
                    'codigo' => null,
                    'qtde_volume' => null,
                    'qtde_retirar' => $qtde,
                    'unidade' => $item->unidade,
                    'data_entrada' => null,
                    'data_validade' => null,
                    'status' => null,
                    'status_label' => null,
                    'largura_mm' => null,
                    'comprimento_m' => null,
                    'endereco' => null,
                    'sugerido' => false,
                    'motivo' => 'A_DEVOLVER',
                    'ordem_politica' => $ordem,
                ];
            }
            $out[] = $this->identificarProduto($linha, $item->produto);
            $ordem++;
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public function volumeToOut(
        EstoqueLote $lote,
        string $qtdeRetirar,
        bool $sugerido,
        string $motivo,
        ?int $ordemPolitica,
    ): array {
        $status = $lote->statusValidade();

        return [
            'lote_id' => (int) $lote->id,
            'codigo' => $lote->codigo,
            'nf_numero' => $lote->nf_numero !== null && $lote->nf_numero !== '' ? (string) $lote->nf_numero : null,
            'qtde_volume' => (string) $lote->qtde,
            'qtde_retirar' => PadraoDecimal::roundHalfUp($qtdeRetirar, PadraoDecimal::SCALE_QTY),
            'unidade' => $lote->unidade,
            'data_entrada' => optional($lote->data_entrada)?->format('Y-m-d'),
            'data_validade' => optional($lote->data_validade)?->format('Y-m-d'),
            'status' => $status,
            'status_label' => ProdutoLotePolitica::statusLabel($status),
            'largura_mm' => $lote->largura_mm !== null ? (string) $lote->largura_mm : null,
            'comprimento_m' => $lote->comprimento_m !== null ? (string) $lote->comprimento_m : null,
            'endereco' => $lote->relationLoaded('endereco') && $lote->endereco ? [
                'id' => $lote->endereco->id,
                'codigo' => $lote->endereco->codigo,
            ] : null,
            'sugerido' => $sugerido,
            'motivo' => $motivo,
            'ordem_politica' => $ordemPolitica,
        ];
    }

    /**
     * SKUs sem lote da mesma polegada (tubete) ou da mesma medida (caixa) que têm saldo.
     * Sem saldo, o SKU não entra: a tela não pré-seleciona produto.
     *
     * @return list<array<string, mixed>>
     */
    public function opcoesUnidade(Empresa $empresa, OrdemProducaoMaterial $mat): array
    {
        $comp = strtoupper(trim((string) $mat->componente));
        if (! in_array($comp, ['TUBETE', 'CAIXA'], true)) {
            return [];
        }
        $mat->loadMissing('produto:id,codigo,descricao_fiscal,descricao_comercial,familia,controla_lote,atributos');
        if ($mat->produto?->controla_lote) {
            return [];
        }

        $produtos = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('situacao', 'ATIVO')
            ->where('familia', 'EMB')
            ->where('controla_lote', false)
            ->when($comp === 'TUBETE', function ($q) {
                $q->where(function ($q) {
                    $q->where('codigo', 'like', 'EMB-TUB%')
                        ->orWhere('descricao_fiscal', 'like', '%TUBETE%');
                });
            })
            ->when($comp === 'CAIXA', function ($q) {
                $q->where(function ($q) {
                    $q->where('codigo', 'like', 'EMB-CX%')
                        ->orWhere('descricao_fiscal', 'like', '%CAIXA%');
                });
            })
            ->orderBy('codigo')
            ->get([
                'id',
                'codigo',
                'descricao_fiscal',
                'descricao_comercial',
                'atributos',
            ]);

        $escolhidos = [];
        foreach ($produtos as $produto) {
            if ((int) $produto->id === (int) $mat->produto_id || $this->produtoCabeNaLinha($mat, $produto)) {
                $escolhidos[(int) $produto->id] = $produto;
            }
        }
        if ($mat->produto && ! isset($escolhidos[(int) $mat->produto->id])) {
            $escolhidos[(int) $mat->produto->id] = $mat->produto;
        }
        if ($escolhidos === []) {
            return [];
        }

        $saldos = EstoqueSaldo::query()
            ->with('endereco:id,codigo,nome')
            ->where('empresa_id', $empresa->id)
            ->whereIn('produto_id', array_keys($escolhidos))
            ->get()
            ->groupBy('produto_id');

        $linhas = [];
        foreach ($escolhidos as $produto) {
            $rows = $saldos->get($produto->id);
            $qtde = '0';
            $local = null;
            $maior = '-1';
            if ($rows) {
                foreach ($rows as $saldo) {
                    $qtde = PadraoDecimal::roundHalfUp(
                        bcadd($qtde, (string) $saldo->qtde, PadraoDecimal::SCALE_QTY + 4),
                        PadraoDecimal::SCALE_QTY
                    );
                    if (bccomp((string) $saldo->qtde, $maior, PadraoDecimal::SCALE_QTY) > 0) {
                        $maior = (string) $saldo->qtde;
                        $local = $saldo->endereco?->resumo();
                    }
                }
            }
            $atual = (int) $produto->id === (int) $mat->produto_id;
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }
            $attrs = is_array($produto->atributos) ? $produto->atributos : [];
            $polegadaBruta = trim((string) ($attrs['diametro_pol'] ?? ''));
            if ($polegadaBruta === '') {
                $polegadaBruta = (string) ($mat->origem_texto ?? '');
            }
            $detalhe = $comp === 'TUBETE'
                ? InsumoEscolhaRelacao::rotuloPolegada($polegadaBruta)
                : InsumoEscolhaRelacao::rotuloMedidaCaixa(
                    (string) ($mat->origem_texto ?? ''),
                    trim($produto->codigo.' '.$produto->descricao_fiscal.' '.($produto->descricao_comercial ?? '')),
                );
            $linhas[] = [
                'produto_id' => (int) $produto->id,
                'codigo' => $produto->codigo,
                'descricao' => $this->nomeProduto($produto),
                'qtde_disponivel' => $qtde,
                'local' => $local,
                'detalhe' => $detalhe,
                'atual' => $atual,
            ];
        }

        usort($linhas, static function (array $a, array $b): int {
            if (($a['atual'] ?? false) !== ($b['atual'] ?? false)) {
                return ($a['atual'] ?? false) ? -1 : 1;
            }

            return strcmp((string) $a['codigo'], (string) $b['codigo']);
        });

        return array_map(static function (array $linha): array {
            unset($linha['atual']);

            return $linha;
        }, $linhas);
    }

    public function produtoAlternativoPermitido(Empresa $empresa, OrdemProducaoMaterial $mat, int $produtoId): bool
    {
        if ($produtoId <= 0) {
            return false;
        }
        if ((int) $mat->produto_id === $produtoId) {
            return true;
        }
        foreach ($this->opcoesUnidade($empresa, $mat) as $opcao) {
            if ((int) ($opcao['produto_id'] ?? 0) === $produtoId) {
                return true;
            }
        }

        return false;
    }

    /**
     * SKU ativo do grupo da linha, com saldo. A tela não pré-seleciona.
     *
     * @return list<array<string, mixed>>
     */
    public function opcoesGrupo(Empresa $empresa, OrdemProducaoMaterial $mat): array
    {
        $grupoId = (int) $mat->grupo_id;
        if ($grupoId <= 0) {
            return [];
        }

        $produtos = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('situacao', 'ATIVO')
            ->where('familia', 'MP')
            ->where('grupo_id', $grupoId)
            ->orderBy('codigo')
            ->get([
                'id',
                'codigo',
                'descricao_fiscal',
                'descricao_comercial',
                'controla_lote',
                'unidade_interna',
            ]);
        if ($produtos->isEmpty()) {
            return [];
        }

        $saldos = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('produto_id', $produtos->pluck('id'))
            ->get()
            ->groupBy('produto_id');

        $linhas = [];
        foreach ($produtos as $produto) {
            $rows = $saldos->get($produto->id);
            $qtde = '0';
            if ($rows) {
                foreach ($rows as $saldo) {
                    $qtde = PadraoDecimal::roundHalfUp(
                        bcadd($qtde, (string) $saldo->qtde, PadraoDecimal::SCALE_QTY + 4),
                        PadraoDecimal::SCALE_QTY
                    );
                }
            }
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }
            $linhas[] = [
                'produto_id' => (int) $produto->id,
                'codigo' => $produto->codigo,
                'descricao' => $this->nomeProduto($produto),
                'qtde_disponivel' => $qtde,
                'local' => null,
                'detalhe' => null,
                'controla_lote' => (bool) $produto->controla_lote,
                'unidade' => $produto->unidade_interna,
            ];
        }

        return $linhas;
    }

    public function produtoNoGrupo(Empresa $empresa, OrdemProducaoMaterial $mat, int $produtoId): bool
    {
        if ($produtoId <= 0 || (int) $mat->grupo_id <= 0) {
            return false;
        }

        return Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $produtoId)
            ->where('situacao', 'ATIVO')
            ->where('familia', 'MP')
            ->where('grupo_id', $mat->grupo_id)
            ->exists();
    }

    /**
     * Bobinas de matéria-prima com saldo. Papel e acabamento escolhem qualquer uma.
     * Se o catálogo aponta um grupo, as bobinas desse grupo ficam no topo.
     *
     * @return list<array<string, mixed>>
     */
    public function opcoesBobina(Empresa $empresa, OrdemProducaoMaterial $mat): array
    {
        $linhas = array_map(fn (array $linha): array => $linha, $this->bobinasDaEmpresa($empresa));
        $preferido = (int) $mat->grupo_id;
        usort($linhas, function (array $a, array $b) use ($preferido): int {
            if ($preferido > 0) {
                $pa = ((int) $a['grupo_id']) === $preferido ? 0 : 1;
                $pb = ((int) $b['grupo_id']) === $preferido ? 0 : 1;
                if ($pa !== $pb) {
                    return $pa <=> $pb;
                }
            }

            return strcmp((string) $a['codigo'], (string) $b['codigo']);
        });
        foreach ($linhas as &$linha) {
            unset($linha['grupo_id']);
        }
        unset($linha);

        return $linhas;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function bobinasDaEmpresa(Empresa $empresa): array
    {
        $empresaId = (int) $empresa->id;
        if (isset($this->bobinasPorEmpresa[$empresaId])) {
            return $this->bobinasPorEmpresa[$empresaId];
        }

        $produtos = Produto::query()
            ->with('grupoCatalogo:id,codigo,nome')
            ->where('empresa_id', $empresa->id)
            ->where('situacao', 'ATIVO')
            ->where('familia', 'MP')
            ->where(fn ($q) => $this->restringeBobinaMp($q))
            ->orderBy('codigo')
            ->get([
                'id',
                'codigo',
                'descricao_fiscal',
                'descricao_comercial',
                'controla_lote',
                'unidade_interna',
                'grupo_id',
            ]);
        if ($produtos->isEmpty()) {
            return [];
        }

        $ids = $produtos->pluck('id')->all();
        $saldos = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('produto_id', $ids)
            ->get()
            ->groupBy('produto_id');
        $lotes = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('produto_id', $ids)
            ->where('qtde', '>', 0)
            ->get(['produto_id', 'qtde'])
            ->groupBy('produto_id');

        $linhas = [];
        foreach ($produtos as $produto) {
            $qtde = '0';
            foreach ($saldos->get($produto->id) ?? [] as $saldo) {
                $qtde = PadraoDecimal::roundHalfUp(
                    bcadd($qtde, (string) $saldo->qtde, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
            }
            $qtdeLote = '0';
            foreach ($lotes->get($produto->id) ?? [] as $lote) {
                $qtdeLote = PadraoDecimal::roundHalfUp(
                    bcadd($qtdeLote, (string) $lote->qtde, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
            }
            if (bccomp($qtdeLote, $qtde, PadraoDecimal::SCALE_QTY) > 0) {
                $qtde = $qtdeLote;
            }
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }
            $linhas[] = [
                'produto_id' => (int) $produto->id,
                'codigo' => $produto->codigo,
                'descricao' => $this->nomeProduto($produto),
                'qtde_disponivel' => $qtde,
                'local' => null,
                'detalhe' => $produto->grupoCatalogo?->codigo,
                'controla_lote' => (bool) $produto->controla_lote || bccomp($qtdeLote, '0', PadraoDecimal::SCALE_QTY) > 0,
                'unidade' => $produto->unidade_interna,
                'grupo_id' => (int) ($produto->grupo_id ?? 0),
            ];
        }

        return $this->bobinasPorEmpresa[$empresaId] = $linhas;
    }

    public function produtoEscolhaPermitido(Empresa $empresa, OrdemProducaoMaterial $mat, int $produtoId): bool
    {
        $comp = strtoupper((string) $mat->componente);
        if (in_array($comp, ['PAPEL', 'ACABAMENTO'], true)) {
            return $this->ehBobinaMp($empresa, $produtoId);
        }

        return $this->produtoNoGrupo($empresa, $mat, $produtoId);
    }

    private function ehBobinaMp(Empresa $empresa, int $produtoId): bool
    {
        if ($produtoId <= 0) {
            return false;
        }

        return Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $produtoId)
            ->where('situacao', 'ATIVO')
            ->where('familia', 'MP')
            ->where(fn ($q) => $this->restringeBobinaMp($q))
            ->exists();
    }

    private function restringeBobinaMp($query): void
    {
        $query->where(function ($q) {
            $q->whereHas('grupoCatalogo', function ($g) {
                $g->whereIn('codigo', self::GRUPOS_BOBINA);
            });
            foreach (self::GRUPOS_BOBINA as $prefixo) {
                $q->orWhere('codigo', 'like', $prefixo.'-%');
            }
            $q->orWhere(function ($q) {
                $q->where('controla_lote', true)
                    ->whereIn('unidade_interna', ['M2', 'M', 'ML']);
            });
        });
    }

    /**
     * @param  array<string, mixed>  $linha
     * @return array<string, mixed>
     */
    private function identificarProduto(array $linha, ?Produto $produto): array
    {
        if ($produto === null) {
            return $linha;
        }
        $linha['sku'] = $produto->codigo;
        $linha['produto_id'] = (int) $produto->id;
        $linha['descricao'] = $this->nomeProduto($produto);

        return $linha;
    }

    private function nomeProduto(Produto $produto): string
    {
        $comercial = trim((string) ($produto->descricao_comercial ?? ''));
        if ($comercial !== '') {
            return $comercial;
        }

        return trim((string) ($produto->descricao_fiscal ?? ''));
    }

    private function produtoCabeNaLinha(OrdemProducaoMaterial $mat, Produto $produto): bool
    {
        $comp = strtoupper(trim((string) $mat->componente));
        if ($comp === 'TUBETE') {
            $attrsLinha = is_array($mat->produto?->atributos) ? $mat->produto->atributos : [];
            $aprovada = InsumoEscolhaRelacao::chavePolegada((string) ($mat->origem_texto ?? ''))
                ?? InsumoEscolhaRelacao::chavePolegada((string) ($attrsLinha['diametro_pol'] ?? ''))
                ?? InsumoEscolhaRelacao::chavePolegada((string) ($mat->produto?->descricao_fiscal ?? ''));
            if ($aprovada === null) {
                return false;
            }
            $attrs = is_array($produto->atributos) ? $produto->atributos : [];
            $doProduto = InsumoEscolhaRelacao::chavePolegada((string) ($attrs['diametro_pol'] ?? ''))
                ?? InsumoEscolhaRelacao::chavePolegada($produto->descricao_fiscal.' '.($produto->descricao_comercial ?? ''));

            return $doProduto === $aprovada;
        }
        if ($comp === 'CAIXA') {
            $medida = (string) ($mat->origem_texto ?? '');
            $attrs = is_array($produto->atributos) ? $produto->atributos : null;
            $porMedida = CaixaMedida::casaAtributos($attrs, $medida);
            if ($porMedida !== null) {
                return $porMedida;
            }
            $texto = trim($produto->codigo.' '.$produto->descricao_fiscal.' '.($produto->descricao_comercial ?? ''));

            return InsumoEscolhaRelacao::caixaCompativel($medida, $texto);
        }

        return false;
    }

    /**
     * Fila do chão: a retirar (empenho pendente) e a entregar (já baixado, sem handoff).
     *
     * @return array{a_retirar: list<array<string, mixed>>, a_entregar: list<array<string, mixed>>, resumo: array{a_retirar: int, a_entregar: int, total: int}}
     */
    public function fila(Empresa $empresa): array
    {
        $ops = OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
            ->with([
                'pedido:id,codigo,status,parceiro_id',
                'pedido.parceiro:id,codigo,razao_social',
                'materiais.produto:id,codigo,controla_lote,unidade_interna',
            ])
            ->orderBy('codigo')
            ->get();

        $aRetirar = [];
        $aEntregar = [];
        foreach ($ops as $op) {
            $pendentes = $op->materiais->filter(
                fn (OrdemProducaoMaterial $m) => $m->saida_movimento_id === null
                    && bccomp((string) $m->qtde_planejada, '0', PadraoDecimal::SCALE_QTY) > 0
            );
            $baixados = $op->materiais->filter(
                fn (OrdemProducaoMaterial $m) => $m->saida_movimento_id !== null
            );

            $card = $this->cardFila($op, $pendentes->count(), $baixados->count());
            if ($pendentes->isNotEmpty()) {
                $locais = [];
                foreach ($pendentes as $mat) {
                    if (! $mat->produto?->controla_lote) {
                        continue;
                    }
                    $prev = $this->preview(
                        $empresa,
                        $mat->produto,
                        PadraoDecimal::roundHalfUp((string) $mat->qtde_planejada, PadraoDecimal::SCALE_QTY),
                    );
                    foreach ($prev['volumes'] as $vol) {
                        $cod = $vol['endereco']['codigo'] ?? null;
                        if (is_string($cod) && $cod !== '') {
                            $locais[$cod] = true;
                        }
                    }
                }
                $card['primeiro_local'] = $locais === [] ? null : array_key_first($locais);
                $card['locais'] = array_keys($locais);
                $aRetirar[] = $card;
            }
            if ($baixados->isNotEmpty() && $op->insumos_entregues_em === null) {
                $aEntregar[] = $card;
            }
        }

        return [
            'a_retirar' => $aRetirar,
            'a_entregar' => $aEntregar,
            'resumo' => [
                'a_retirar' => count($aRetirar),
                'a_entregar' => count($aEntregar),
                'total' => count($aRetirar) + count($aEntregar),
            ],
        ];
    }

    public function contarFila(Empresa $empresa): int
    {
        return $this->contarARetirar($empresa) + $this->contarAEntregar($empresa);
    }

    /** Só o que ainda está na prateleira — fila do estoque. */
    public function contarARetirar(Empresa $empresa): int
    {
        return OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
            ->whereHas('materiais', function ($m) {
                $m->whereNull('saida_movimento_id')->where('qtde_planejada', '>', 0);
            })
            ->count();
    }

    public function contarAEntregar(Empresa $empresa): int
    {
        return OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
            ->whereNull('insumos_entregues_em')
            ->whereHas('materiais', function ($m) {
                $m->whereNotNull('saida_movimento_id');
            })
            ->count();
    }

    /**
     * @return array<string, mixed>
     */
    public function handoffToOut(OrdemProducao $op): array
    {
        $op->loadMissing('insumosEntreguesPorUser:id,name,codigo');

        return [
            'entregue' => $op->insumos_entregues_em !== null,
            'entregues_em' => optional($op->insumos_entregues_em)?->toIso8601String(),
            'entregues_por' => $op->insumosEntreguesPorUser ? [
                'id' => $op->insumosEntreguesPorUser->id,
                'nome' => $op->insumosEntreguesPorUser->name,
                'codigo' => $op->insumosEntreguesPorUser->codigo,
            ] : null,
            'recebidos_nome' => $op->insumos_recebidos_nome,
        ];
    }

    /**
     * Ficha de confrontação (sistema × físico) anexada à OP — leitura dos MOV.
     *
     * @param  list<array<string, mixed>>  $materiais
     * @return array{linhas: list<array<string, mixed>>, ciclos: list<array<string, mixed>>}
     */
    public function fichaDe(Empresa $empresa, OrdemProducao $op, array $materiais): array
    {
        $linhas = [];
        foreach ($materiais as $m) {
            if (! is_array($m)) {
                continue;
            }
            $planejado = PadraoDecimal::roundHalfUp((string) ($m['qtde_planejada'] ?? '0'), PadraoDecimal::SCALE_QTY);
            $requisitado = PadraoDecimal::roundHalfUp((string) ($m['qtde_requisitada'] ?? '0'), PadraoDecimal::SCALE_QTY);
            $avaria = PadraoDecimal::roundHalfUp((string) ($m['qtde_avaria'] ?? '0'), PadraoDecimal::SCALE_QTY);
            $pendente = (bool) ($m['pendente'] ?? false);
            $delta = PadraoDecimal::roundHalfUp(
                bcsub($requisitado, $planejado, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );
            $aRetirar = $pendente
                ? $planejado
                : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);

            $produto = is_array($m['produto'] ?? null) ? $m['produto'] : [];
            $retirada = is_array($m['retirada'] ?? null) ? $m['retirada'] : [];

            $linhas[] = [
                'material_id' => (int) ($m['id'] ?? 0),
                'sku' => $produto['codigo'] ?? null,
                'descricao' => $produto['descricao_fiscal'] ?? ($m['componente'] ?? null),
                'unidade' => $m['unidade'] ?? ($produto['unidade_interna'] ?? 'UN'),
                'controla_lote' => (bool) ($produto['controla_lote'] ?? $retirada['controla_lote'] ?? false),
                'planejado' => $planejado,
                'requisitado' => $requisitado,
                'avaria' => $avaria,
                'motivo_avaria' => $m['motivo_avaria'] ?? null,
                'a_retirar' => $aRetirar,
                'delta' => $delta,
                'pendente' => $pendente,
                'aguardando_material' => (bool) ($m['aguardando_material'] ?? false),
                'suficiente' => (bool) ($retirada['suficiente'] ?? true),
                'qtde_faltante' => $retirada['qtde_faltante'] ?? PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY),
            ];
        }

        $movs = EstoqueMovimento::query()
            ->with(['itens.produto:id,codigo', 'itens.lote.endereco:id,codigo'])
            ->where('empresa_id', $empresa->id)
            ->where('ordem_producao_id', $op->id)
            ->where('tipo', EstoqueMovimento::TIPO_SAIDA_PRODUCAO)
            ->orderBy('id')
            ->get();

        $ciclos = [];
        $n = 1;
        foreach ($movs as $mov) {
            $obs = (string) ($mov->observacao ?? '');
            $itens = [];
            foreach ($mov->itens as $item) {
                $lote = $item->lote;
                $itens[] = [
                    'produto_id' => (int) $item->produto_id,
                    'sku' => $item->produto?->codigo,
                    'lote_id' => $item->lote_id ? (int) $item->lote_id : null,
                    'codigo' => $lote?->codigo,
                    'qtde' => PadraoDecimal::roundHalfUp((string) $item->qtde, PadraoDecimal::SCALE_QTY),
                    'unidade' => $item->unidade,
                    'endereco' => $lote?->endereco ? [
                        'id' => $lote->endereco->id,
                        'codigo' => $lote->endereco->codigo,
                    ] : null,
                ];
            }
            $ciclos[] = [
                'n' => $n,
                'movimento_id' => (int) $mov->id,
                'movimento_codigo' => $mov->codigo,
                'em' => optional($mov->created_at)?->toIso8601String(),
                'complementar' => str_contains(mb_strtolower($obs), 'complemento'),
                'observacao' => $obs !== '' ? $obs : null,
                'itens' => $itens,
            ];
            $n++;
        }

        return [
            'linhas' => $linhas,
            'ciclos' => $ciclos,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function cardFila(OrdemProducao $op, int $pendentes, int $baixados): array
    {
        return [
            'id' => $op->id,
            'codigo' => $op->codigo,
            'status' => $op->status,
            'pedido' => $op->pedido ? [
                'id' => $op->pedido->id,
                'codigo' => $op->pedido->codigo,
            ] : null,
            'parceiro' => $op->pedido?->parceiro ? [
                'id' => $op->pedido->parceiro->id,
                'codigo' => $op->pedido->parceiro->codigo,
                'razao_social' => $op->pedido->parceiro->razao_social,
            ] : null,
            'linhas_pendentes' => $pendentes,
            'linhas_baixadas' => $baixados,
            'handoff' => $this->handoffToOut($op),
        ];
    }

    /**
     * Volumes com saldo para escolher na linha. Não trava no SKU casado:
     * entra todo lote da empresa, o produto da linha primeiro e os parecidos em seguida.
     *
     * @return list<array<string, mixed>>
     */
    public function volumesParaEscolha(Empresa $empresa, OrdemProducao $op, int $materialId, ?int $produtoEscolhido = null): array
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }

        $mat = OrdemProducaoMaterial::query()
            ->with('produto:id,codigo,descricao_fiscal,descricao_comercial,familia,unidade_interna,controla_lote')
            ->where('ordem_producao_id', $op->id)
            ->where('empresa_id', $empresa->id)
            ->where('id', $materialId)
            ->first();
        if (! $mat) {
            throw ValidationException::withMessages([
                'material_id' => ['Material não pertence a esta ordem.'],
            ]);
        }

        $produtoLinha = $mat->produto;
        $comp = strtoupper((string) $mat->componente);
        if ((int) $mat->produto_id <= 0 && $comp === 'ACABAMENTO' && (int) $produtoEscolhido <= 0) {
            return $this->volumesDasBobinas($empresa, $mat);
        }
        if ((int) $mat->produto_id <= 0 && in_array($comp, ['PAPEL', 'ACABAMENTO'], true)) {
            $produtoEscolhido = (int) $produtoEscolhido;
            if ($produtoEscolhido <= 0 || ! $this->produtoEscolhaPermitido($empresa, $mat, $produtoEscolhido)) {
                return [];
            }

            return $this->volumesDoProduto($empresa, $produtoEscolhido);
        }

        $texto = trim(implode(' ', array_filter([
            (string) ($mat->origem_texto ?? ''),
            (string) ($produtoLinha->descricao_fiscal ?? ''),
            (string) ($produtoLinha->descricao_comercial ?? ''),
            (string) ($produtoLinha->codigo ?? ''),
        ])));
        $tokens = $this->tokensProximidade($texto);

        $sugeridos = [];
        if ($produtoLinha && $produtoLinha->controla_lote) {
            $qtde = PadraoDecimal::roundHalfUp((string) $mat->qtde_planejada, PadraoDecimal::SCALE_QTY);
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) > 0) {
                $prev = $this->preview($empresa, $produtoLinha, $qtde);
                foreach ($prev['volumes'] as $vol) {
                    $loteId = (int) ($vol['lote_id'] ?? 0);
                    if ($loteId > 0) {
                        $sugeridos[$loteId] = $vol;
                    }
                }
            }
        }

        $lotes = EstoqueLote::query()
            ->with([
                'endereco:id,codigo',
                'produto:id,codigo,descricao_fiscal,descricao_comercial,familia,unidade_interna,controla_lote,empresa_id',
            ])
            ->where('empresa_id', $empresa->id)
            ->where('qtde', '>', 0)
            ->whereHas('produto', function ($q) use ($empresa) {
                $q->where('empresa_id', $empresa->id)
                    ->where('controla_lote', true);
            })
            ->orderBy('id')
            ->get();

        $linhas = [];
        foreach ($lotes as $lote) {
            $produto = $lote->produto;
            if (! $produto || (int) $produto->empresa_id !== (int) $empresa->id) {
                continue;
            }
            $loteId = (int) $lote->id;
            if (isset($sugeridos[$loteId])) {
                $row = $sugeridos[$loteId];
            } else {
                $row = $this->volumeToOut($lote, '0', false, 'ESTOQUE', null);
            }
            $hay = trim(implode(' ', array_filter([
                (string) $produto->codigo,
                (string) $produto->descricao_fiscal,
                (string) ($produto->descricao_comercial ?? ''),
            ])));
            $mesmo = $produtoLinha && (int) $produto->id === (int) $produtoLinha->id;
            $row['sku'] = $produto->codigo;
            $row['produto_id'] = (int) $produto->id;
            $row['descricao'] = $produto->descricao_fiscal;
            $row['proximidade'] = $mesmo ? 1000 : $this->scoreProximidade($hay, $tokens);
            $linhas[] = $row;
        }

        usort($linhas, static function (array $a, array $b): int {
            $pa = (int) ($a['proximidade'] ?? 0);
            $pb = (int) ($b['proximidade'] ?? 0);
            if ($pa !== $pb) {
                return $pb <=> $pa;
            }
            $sa = ! empty($a['sugerido']) ? 0 : 1;
            $sb = ! empty($b['sugerido']) ? 0 : 1;
            if ($sa !== $sb) {
                return $sa <=> $sb;
            }

            return strcmp((string) ($a['sku'] ?? ''), (string) ($b['sku'] ?? ''));
        });

        return $linhas;
    }

    /**
     * Volumes de todas as bobinas com saldo. O grupo do catálogo vem primeiro.
     *
     * @return list<array<string, mixed>>
     */
    private function volumesDasBobinas(Empresa $empresa, OrdemProducaoMaterial $mat): array
    {
        $ids = array_map('intval', array_column($this->opcoesBobina($empresa, $mat), 'produto_id'));
        if ($ids === []) {
            return [];
        }

        $ordem = array_flip($ids);
        $lotes = EstoqueLote::query()
            ->with([
                'endereco:id,codigo',
                'produto:id,codigo,descricao_fiscal,descricao_comercial,familia,unidade_interna,controla_lote,empresa_id',
            ])
            ->where('empresa_id', $empresa->id)
            ->whereIn('produto_id', $ids)
            ->where('qtde', '>', 0)
            ->get()
            ->sort(function (EstoqueLote $a, EstoqueLote $b) use ($ordem): int {
                $oa = $ordem[(int) $a->produto_id] ?? 9999;
                $ob = $ordem[(int) $b->produto_id] ?? 9999;
                if ($oa !== $ob) {
                    return $oa <=> $ob;
                }
                $va = $a->data_validade?->getTimestamp();
                $vb = $b->data_validade?->getTimestamp();
                if ($va === null && $vb !== null) {
                    return 1;
                }
                if ($vb === null && $va !== null) {
                    return -1;
                }
                if ($va !== $vb) {
                    return ($va ?? 0) <=> ($vb ?? 0);
                }

                return $a->id <=> $b->id;
            })
            ->values();

        $linhas = [];
        foreach ($lotes as $lote) {
            $row = $this->volumeToOut($lote, '0', false, 'ESTOQUE', null);
            $linhas[] = $this->identificarProduto($row, $lote->produto);
        }

        return $linhas;
    }

    /**
     * Bobinas de um SKU já escolhido no grupo. Sem sugerir outro produto.
     *
     * @return list<array<string, mixed>>
     */
    private function volumesDoProduto(Empresa $empresa, int $produtoId): array
    {
        $lotes = EstoqueLote::query()
            ->with([
                'endereco:id,codigo',
                'produto:id,codigo,descricao_fiscal,descricao_comercial,familia,unidade_interna,controla_lote,empresa_id',
            ])
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produtoId)
            ->where('qtde', '>', 0)
            ->orderByRaw('data_validade is null')
            ->orderBy('data_validade')
            ->orderBy('id')
            ->get();

        $linhas = [];
        foreach ($lotes as $lote) {
            $row = $this->volumeToOut($lote, '0', false, 'ESTOQUE', null);
            $linhas[] = $this->identificarProduto($row, $lote->produto);
        }

        return $linhas;
    }

    /**
     * Um produto só. Volumes de SKUs diferentes não saem na mesma linha.
     *
     * @param  list<array<string, mixed>>  $volumes
     */
    public function produtoIdDosVolumes(Empresa $empresa, array $volumes): ?int
    {
        $ids = [];
        foreach ($volumes as $vol) {
            $id = (int) ($vol['lote_id'] ?? 0);
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        if ($ids === []) {
            return null;
        }

        $produtos = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('id', $ids)
            ->pluck('produto_id')
            ->unique()
            ->values();
        if ($produtos->count() !== 1) {
            throw ValidationException::withMessages([
                'volumes' => ['Escolha bobinas de um mesmo produto.'],
            ]);
        }

        return (int) $produtos->first();
    }

    /**
     * @param  list<string>  $tokens
     */
    private function scoreProximidade(string $hay, array $tokens): int
    {
        if ($tokens === []) {
            return 0;
        }
        $norm = $this->normalizarBusca($hay);
        $score = 0;
        foreach ($tokens as $token) {
            if ($token !== '' && str_contains($norm, $token)) {
                $score += strlen($token) >= 4 ? 3 : 1;
            }
        }

        return $score;
    }

    /**
     * @return list<string>
     */
    private function tokensProximidade(string $text): array
    {
        $stop = [
            'AUTOADESIVO', 'AUTO', 'ADESIVO', 'PAPEL', 'FILME', 'DE', 'DA', 'DO', 'COM', 'PARA', 'G',
        ];
        $parts = preg_split('/[^A-Z0-9]+/', $this->normalizarBusca($text)) ?: [];
        $out = [];
        foreach ($parts as $p) {
            if ($p === '' || strlen($p) < 2 || in_array($p, $stop, true)) {
                continue;
            }
            $out[$p] = true;
        }

        return array_keys($out);
    }

    private function normalizarBusca(string $text): string
    {
        $t = mb_strtoupper(trim($text), 'UTF-8');
        $t = strtr($t, [
            'Á' => 'A', 'À' => 'A', 'Â' => 'A', 'Ã' => 'A',
            'É' => 'E', 'Ê' => 'E',
            'Í' => 'I',
            'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O',
            'Ú' => 'U',
            'Ç' => 'C',
        ]);

        return $t;
    }

    /**
     * @param  list<array<string, mixed>>  $volumes
     * @return list<array<string, mixed>>
     */
    private function ordenarCaminhada(array $volumes): array
    {
        usort($volumes, static function (array $a, array $b): int {
            $ea = $a['endereco']['codigo'] ?? '';
            $eb = $b['endereco']['codigo'] ?? '';
            if ($ea === '' && $eb !== '') {
                return 1;
            }
            if ($ea !== '' && $eb === '') {
                return -1;
            }
            $loc = strcmp($ea, $eb);
            if ($loc !== 0) {
                return $loc;
            }

            return ((int) ($a['ordem_politica'] ?? 99)) <=> ((int) ($b['ordem_politica'] ?? 99));
        });

        return $volumes;
    }
}
