<?php

namespace App\Services\Producao;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\OrdemProducao;
use App\Models\PaEmbalagem;
use App\Models\PaEmbalagemBobina;
use App\Models\PaEmbalagemCaixa;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Estoque\CaixaExpedicao;
use App\Services\Fiscal\NfePesoExpedicao;
use App\Services\Fiscal\NfeVolumeNumeracao;
use App\Support\CaixaMedida;
use App\Support\ModelosComposicao;
use App\Support\PadraoDecimal;
use App\Support\RoloCaixaEncaixe;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Embalagem física do PA (bobina → caixa) — ADR_PA_EMBALAGEM_BOBINA_CAIXA.
 * Não mexe em estoque / Writer / ENTRADA_PA.
 */
class PaEmbalagemService
{
    private const MODELOS_FACE_MAX = 4;

    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return array<string, mixed>
     */
    public function sugerir(Empresa $empresa, OrdemProducao $op): array
    {
        $this->assertOpEmpresa($empresa, $op);
        $op->loadMissing(['pedido', 'pedidoItem']);

        if ($op->status !== OrdemProducao::STATUS_CONCLUIDA) {
            throw ValidationException::withMessages([
                'ordem_producao' => ['Embalagem só após a OP concluída.'],
            ]);
        }

        $qtdeBoa = (string) ($op->qtde_boa ?? '0');
        if (bccomp($qtdeBoa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_boa' => ['OP sem quantidade boa.'],
            ]);
        }

        $plano = $this->montarPlano($op, $qtdeBoa, null);
        $vigente = $this->vigenteDaOp($empresa, $op);

        return [
            'ordem_producao' => [
                'id' => $op->id,
                'codigo' => $op->codigo,
                'qtde_boa' => $qtdeBoa,
            ],
            'pedido' => $op->pedido ? [
                'id' => $op->pedido->id,
                'codigo' => $op->pedido->codigo,
            ] : null,
            'sugerido' => true,
            'plano' => $plano,
            'embalagem' => $vigente
                ? $this->toOut($vigente->load(['bobinas', 'caixas']))
                : null,
        ];
    }

    /**
     * Confirma (ou substitui) a embalagem real.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function confirmar(Empresa $empresa, OrdemProducao $op, array $data = []): array
    {
        $this->assertOpEmpresa($empresa, $op);
        $op->loadMissing(['pedido', 'pedidoItem']);

        if ($op->status !== OrdemProducao::STATUS_CONCLUIDA) {
            throw ValidationException::withMessages([
                'ordem_producao' => ['Embalagem só após a OP concluída.'],
            ]);
        }

        $qtdeBoa = (string) ($op->qtde_boa ?? '0');
        if (bccomp($qtdeBoa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_boa' => ['OP sem quantidade boa.'],
            ]);
        }

        $existente = $this->vigenteDaOp($empresa, $op);
        if ($existente && $this->nfAutorizadaDoPedido($empresa, (int) $op->pedido_id)) {
            throw ValidationException::withMessages([
                'embalagem' => ['NF já autorizada — embalagem não pode ser alterada.'],
            ]);
        }

        $bobinasIn = isset($data['bobinas']) && is_array($data['bobinas']) ? $data['bobinas'] : null;
        $nRolos = isset($data['qtde_bobinas']) ? (int) $data['qtde_bobinas'] : null;
        $nCaixas = isset($data['qtde_caixas']) ? (int) $data['qtde_caixas'] : null;
        if ($nCaixas === null && $this->capacidadeCaixaDoSnapshot($op) === null) {
            throw ValidationException::withMessages([
                'qtde_caixas' => ['Informe quantas caixas saíram.'],
            ]);
        }
        $caixaProduto = (new CaixaExpedicao())->opcional($empresa, $data['caixa_produto_id'] ?? null);
        $medidaCaixa = $caixaProduto !== null
            ? CaixaMedida::rotulo(is_array($caixaProduto->atributos) ? $caixaProduto->atributos : null)
            : null;
        $plano = $this->montarPlano($op, $qtdeBoa, $bobinasIn, $nRolos, $nCaixas, $medidaCaixa);
        $origem = ($bobinasIn !== null || $nRolos !== null || $nCaixas !== null)
            ? PaEmbalagem::ORIGEM_MANUAL
            : PaEmbalagem::ORIGEM_SUGERIDA;
        $obs = isset($data['observacao']) ? trim((string) $data['observacao']) : null;

        $emb = DB::transaction(function () use ($empresa, $op, $plano, $origem, $obs, $existente, $caixaProduto) {
            if ($existente) {
                $existente->bobinas()->delete();
                $existente->caixas()->delete();
                $existente->delete();
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'EMBPA-'.$ano, 5);

            $emb = PaEmbalagem::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'pedido_id' => $op->pedido_id,
                'pedido_item_id' => $op->pedido_item_id,
                'ordem_producao_id' => $op->id,
                'status' => PaEmbalagem::STATUS_CONFIRMADA,
                'qtde_etiquetas' => $plano['qtde_etiquetas'],
                'qtde_bobinas' => $plano['qtde_bobinas'],
                'qtde_caixas' => $plano['qtde_caixas'],
                'etiq_por_rolo' => $plano['etiq_por_rolo'],
                'rolos_por_caixa' => $plano['rolos_por_caixa'],
                'tubete' => $plano['tubete'],
                'caixa_medida' => $plano['caixa_medida'],
                'caixa_produto_id' => $caixaProduto?->id,
                'saida_etiqueta' => $plano['saida_etiqueta'],
                'origem' => $origem,
                'observacao' => $obs !== '' ? $obs : null,
                'confirmada_em' => now(),
                'confirmada_por' => Auth::id(),
            ]);

            /** @var list<PaEmbalagemCaixa> $caixas */
            $caixas = [];
            foreach ($plano['caixas'] as $cx) {
                $caixas[] = PaEmbalagemCaixa::query()->create([
                    'empresa_id' => $empresa->id,
                    'embalagem_id' => $emb->id,
                    'sequencia' => $cx['sequencia'],
                    'codigo' => sprintf('%s-CX%02d', $emb->codigo, $cx['sequencia']),
                    'qtde_bobinas' => $cx['qtde_bobinas'],
                    'qtde_etiquetas' => $cx['qtde_etiquetas'],
                ]);
            }

            foreach ($plano['bobinas'] as $bob) {
                $caixa = $caixas[$bob['caixa_idx']] ?? null;
                PaEmbalagemBobina::query()->create([
                    'empresa_id' => $empresa->id,
                    'embalagem_id' => $emb->id,
                    'caixa_id' => $caixa?->id,
                    'sequencia' => $bob['sequencia'],
                    'codigo' => sprintf('%s-B%03d', $emb->codigo, $bob['sequencia']),
                    'qtde_etiquetas' => $bob['qtde_etiquetas'],
                    'tubete' => $plano['tubete'],
                    'modelo_ordem' => $bob['modelo_ordem'] ?? null,
                    'modelo_nome' => $bob['modelo_nome'] ?? null,
                ]);
            }

            return $emb->fresh(['bobinas', 'caixas']);
        });

        return $this->toOut($emb);
    }

    public function vigenteDaOp(Empresa $empresa, OrdemProducao $op): ?PaEmbalagem
    {
        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('ordem_producao_id', $op->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->first();
    }

    public function vigenteDoPedido(Empresa $empresa, Pedido $pedido): ?PaEmbalagem
    {
        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Embalagens confirmadas do PED (1 por OP/item), mais recente primeiro.
     *
     * @return \Illuminate\Support\Collection<int, PaEmbalagem>
     */
    public function confirmadasDoPedido(Empresa $empresa, Pedido $pedido)
    {
        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->with(['bobinas', 'pedidoItem:id,pedido_id,ordem,descricao,especificacao'])
            ->orderByDesc('id')
            ->get();
    }

    public function vigenteDoPedidoItem(Empresa $empresa, int $pedidoId, ?int $pedidoItemId): ?PaEmbalagem
    {
        if ($pedidoItemId === null || $pedidoItemId < 1) {
            return null;
        }

        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedidoId)
            ->where('pedido_item_id', $pedidoItemId)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->with('bobinas')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Resumo operacional do PED para FAT/ENT/kit de saída.
     * Sempre inclui `embalagens[]` com id imprimível (BOB/CX por pa_embalagens/:id).
     * N>1: agregado `multipla` + totais; sem `id` no topo (não há embalagem única).
     *
     * @return array<string, mixed>|null
     */
    public function resumoPedido(Empresa $empresa, Pedido $pedido): ?array
    {
        $todos = $this->confirmadasDoPedido($empresa, $pedido);
        if ($todos->isEmpty()) {
            return null;
        }

        $imprimiveis = $todos
            ->sortBy('id')
            ->values()
            ->map(fn (PaEmbalagem $e) => $this->resumoImprimivel($e))
            ->all();

        if ($todos->count() === 1) {
            $emb = $todos->first();
            $emb->loadMissing(['bobinas', 'caixas']);
            $out = $this->toOut($emb, false);
            $out['embalagens'] = $imprimiveis;

            return $out;
        }

        $bobinas = (int) $todos->sum('qtde_bobinas');
        $caixas = (int) $todos->sum('qtde_caixas');
        $etiquetas = '0';
        foreach ($todos as $e) {
            $etiquetas = bcadd($etiquetas, (string) $e->qtde_etiquetas, PadraoDecimal::SCALE_QTY);
        }

        return [
            'multipla' => true,
            'qtde_etiquetas' => $etiquetas,
            'qtde_bobinas' => $bobinas,
            'qtde_caixas' => $caixas,
            'resumo' => $todos->count().' itens · '
                .number_format((float) $etiquetas, 0, ',', '.').' etiquetas · '
                .$bobinas.' bobina'.($bobinas === 1 ? '' : 's').' · '
                .$caixas.' caixa'.($caixas === 1 ? '' : 's'),
            'pedido_id' => $pedido->id,
            'embalagens' => $imprimiveis,
        ];
    }

    /**
     * Entrada mínima do kit de etiquetas BOB/CX (ADR_ENTREGA_EXPEDICAO).
     *
     * @return array{id: int, codigo: string, resumo: string, ordem_producao_id: int|null, pedido_item_id: int|null, qtde_bobinas: int, qtde_caixas: int}
     */
    private function resumoImprimivel(PaEmbalagem $e): array
    {
        return [
            'id' => (int) $e->id,
            'codigo' => (string) $e->codigo,
            'resumo' => $e->resumoTexto(),
            'ordem_producao_id' => $e->ordem_producao_id !== null ? (int) $e->ordem_producao_id : null,
            'pedido_item_id' => $e->pedido_item_id !== null ? (int) $e->pedido_item_id : null,
            'qtde_bobinas' => (int) $e->qtde_bobinas,
            'qtde_caixas' => (int) $e->qtde_caixas,
        ];
    }

    /**
     * Faces BOB/CX para impressão Elgin 50×40.
     * Bobina: `modelo`/`modelo_nome` = arte do rolo (UI: linha Mod.); produto à parte.
     * Caixa: conteúdo por modelo (pura/mista).
     *
     * @return array<string, mixed>
     */
    public function etiquetas(Empresa $empresa, PaEmbalagem $embalagem, bool $pedMultiItem = false): array
    {
        if ($embalagem->empresa_id !== $empresa->id) {
            abort(404);
        }

        $embalagem->loadMissing([
            'bobinas.caixa',
            'caixas',
            'pedido:id,codigo',
            'ordemProducao:id,codigo,resultado_modelos,qtde_boa,empresa_id',
            'pedidoItem:id,ordem,descricao,especificacao',
        ]);

        $base = $this->rotulosFaceEtiqueta($embalagem, $pedMultiItem);
        $totalBobinas = (int) $embalagem->qtde_bobinas;
        $totalCaixas = (int) $embalagem->qtde_caixas;
        $caixaSeqPorId = [];
        foreach ($embalagem->caixas as $cx) {
            $caixaSeqPorId[(int) $cx->id] = (int) $cx->sequencia;
        }

        $bobinasSorted = $embalagem->bobinas
            ->sortBy(fn (PaEmbalagemBobina $b) => sprintf(
                '%05d-%05d',
                $b->modelo_ordem ?? 9999,
                $b->sequencia
            ))
            ->values();

        // Legado sem modelo_nome: deriva na leitura (não regrava) para a face indicar a arte.
        $modelosFace = $this->modelosFaceBobinas($embalagem, $bobinasSorted);

        $bobinas = $bobinasSorted->values()->map(function (PaEmbalagemBobina $b, int $i) use (
            $embalagem,
            $base,
            $totalBobinas,
            $totalCaixas,
            $caixaSeqPorId,
            $modelosFace
        ) {
            $modeloOrdem = $b->modelo_ordem ?? ($modelosFace[$i]['modelo_ordem'] ?? null);
            $modeloNome = $b->modelo_nome ?? ($modelosFace[$i]['modelo_nome'] ?? null);
            if (is_string($modeloNome)) {
                $modeloNome = trim($modeloNome);
                if ($modeloNome === '') {
                    $modeloNome = null;
                }
            }
            $caixaSeq = $b->caixa_id ? ($caixaSeqPorId[(int) $b->caixa_id] ?? null) : null;

            return [
                'id' => $b->id,
                'tipo' => 'BOBINA',
                'codigo' => $b->codigo,
                'sequencia' => $b->sequencia,
                'qtde_etiquetas' => (string) $b->qtde_etiquetas,
                'tubete' => $b->tubete,
                'caixa_id' => $b->caixa_id,
                'caixa_seq' => $caixaSeq,
                'total_bobinas' => $totalBobinas,
                'total_caixas' => $totalCaixas > 0 ? $totalCaixas : null,
                'modelo_ordem' => $modeloOrdem,
                'modelo_nome' => $modeloNome,
                'qr_payload' => $b->qrPayload(),
                'pedido' => $embalagem->pedido?->codigo,
                'op' => $embalagem->ordemProducao?->codigo,
                'descricao' => $base['descricao'],
                // Só a arte — nunca produto/descrição (UI usa Mod. + hero de produto).
                'modelo' => $modeloNome,
                'modelos_item' => $base['modelos_item'],
                'produto' => $base['produto'],
                'item' => $base['item'],
            ];
        })->all();

        // Conteúdo da caixa a partir do payload (já enriquecido), não só do DB cru.
        $bobinasPorCaixa = [];
        foreach ($bobinas as $bOut) {
            $cid = $bOut['caixa_id'] ?? null;
            if ($cid === null) {
                continue;
            }
            $bobinasPorCaixa[(int) $cid][] = [
                'modelo_ordem' => $bOut['modelo_ordem'] ?? null,
                'modelo_nome' => $bOut['modelo_nome'] ?? null,
                'qtde_etiquetas' => $bOut['qtde_etiquetas'],
            ];
        }

        $caixas = $embalagem->caixas->sortBy('sequencia')->values()->map(
            function (PaEmbalagemCaixa $c) use ($embalagem, $base, $totalCaixas, $bobinasPorCaixa, $totalBobinas) {
                $conteudo = $this->conteudoCaixaPayload($bobinasPorCaixa[(int) $c->id] ?? []);
                $mista = count($conteudo) > 1;
                $modeloPuro = count($conteudo) === 1 ? ($conteudo[0]['modelo'] ?? null) : null;
                $hero = $this->heroCaixa($conteudo, $base);

                return [
                    'id' => $c->id,
                    'tipo' => 'CAIXA',
                    'codigo' => $c->codigo,
                    'sequencia' => $c->sequencia,
                    'qtde_bobinas' => $c->qtde_bobinas,
                    'qtde_etiquetas' => (string) $c->qtde_etiquetas,
                    'qr_payload' => $c->qrPayload(),
                    'pedido' => $embalagem->pedido?->codigo,
                    'op' => $embalagem->ordemProducao?->codigo,
                    'descricao' => $base['descricao'],
                    'modelo' => $modeloPuro,
                    'modelo_nome' => $modeloPuro,
                    'modelos_item' => $base['modelos_item'],
                    'produto' => $base['produto'],
                    'tubete' => $embalagem->tubete,
                    'caixa_medida' => $embalagem->caixa_medida,
                    'total_caixas' => $totalCaixas,
                    'total_bobinas' => $totalBobinas,
                    'conteudo' => $conteudo,
                    'mista' => $mista,
                    'hero' => $hero,
                    'item' => $base['item'],
                ];
            }
        )->all();

        $faces = $this->facesManuseio($caixas, $bobinas);

        return [
            'embalagem' => $this->toOut($embalagem, false),
            'bobinas' => $bobinas,
            'caixas' => $caixas,
            'faces' => $faces,
        ];
    }

    /**
     * Lote BOB/CX do PED (kit de saída): item → modelo → caixa → bobina.
     *
     * @return array<string, mixed>
     */
    public function etiquetasDoPedido(Empresa $empresa, Pedido $pedido): array
    {
        if ($pedido->empresa_id !== $empresa->id) {
            abort(404);
        }

        $todos = $this->confirmadasDoPedido($empresa, $pedido)
            ->sortBy(fn (PaEmbalagem $e) => [
                (int) ($e->pedidoItem?->ordem ?? 9999),
                (int) $e->id,
            ])
            ->values();
        $multi = $todos->count() > 1;
        $bobinas = [];
        $caixas = [];
        $faces = [];
        $embsOut = [];

        foreach ($todos as $emb) {
            if (! $emb instanceof PaEmbalagem) {
                continue;
            }
            $chunk = $this->etiquetas($empresa, $emb, $multi);
            if (isset($chunk['embalagem']) && is_array($chunk['embalagem'])) {
                $embsOut[] = $chunk['embalagem'];
            }
            foreach ($chunk['caixas'] ?? [] as $c) {
                if (is_array($c)) {
                    $caixas[] = $c;
                }
            }
            foreach ($chunk['bobinas'] ?? [] as $b) {
                if (is_array($b)) {
                    $bobinas[] = $b;
                }
            }
            foreach ($chunk['faces'] ?? [] as $f) {
                if (is_array($f)) {
                    $faces[] = $f;
                }
            }
        }

        return [
            'pedido' => [
                'id' => $pedido->id,
                'codigo' => $pedido->codigo,
            ],
            'embalagens' => $embsOut,
            'embalagem' => count($embsOut) === 1 ? $embsOut[0] : null,
            'bobinas' => $bobinas,
            'caixas' => $caixas,
            'faces' => $faces,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $caixas
     * @param  list<array<string, mixed>>  $bobinas
     * @return list<array<string, mixed>>
     */
    private function facesManuseio(array $caixas, array $bobinas): array
    {
        $porCaixa = [];
        $orfas = [];
        foreach ($bobinas as $b) {
            $cid = $b['caixa_id'] ?? null;
            if ($cid === null) {
                $orfas[] = $b;
                continue;
            }
            $porCaixa[(int) $cid][] = $b;
        }

        $faces = [];
        foreach ($caixas as $c) {
            $faces[] = $c;
            foreach ($porCaixa[(int) ($c['id'] ?? 0)] ?? [] as $b) {
                $faces[] = $b;
            }
        }
        foreach ($orfas as $b) {
            $faces[] = $b;
        }

        return $faces;
    }

    /**
     * Deriva modelo por bobina na leitura quando a embalagem legado não persistiu.
     *
     * @param  \Illuminate\Support\Collection<int, PaEmbalagemBobina>  $bobinasSorted
     * @return list<array{modelo_ordem: int|null, modelo_nome: string|null}>
     */
    private function modelosFaceBobinas(PaEmbalagem $embalagem, $bobinasSorted): array
    {
        $n = $bobinasSorted->count();
        if ($n === 0) {
            return [];
        }

        $todasComModelo = $bobinasSorted->every(
            static fn (PaEmbalagemBobina $b) => $b->modelo_nome !== null && trim((string) $b->modelo_nome) !== ''
        );
        if ($todasComModelo) {
            return $bobinasSorted->map(static fn (PaEmbalagemBobina $b) => [
                'modelo_ordem' => $b->modelo_ordem,
                'modelo_nome' => $b->modelo_nome,
            ])->values()->all();
        }

        $op = $embalagem->ordemProducao;
        if ($op === null) {
            return array_fill(0, $n, ['modelo_ordem' => null, 'modelo_nome' => null]);
        }

        $qtdeBoa = (string) ($op->qtde_boa ?? $embalagem->qtde_etiquetas ?? '0');
        $modelos = $this->quantidadesPorModelo($op, $qtdeBoa);
        if ($modelos === []) {
            return array_fill(0, $n, ['modelo_ordem' => null, 'modelo_nome' => null]);
        }

        $linhas = $bobinasSorted->map(static fn (PaEmbalagemBobina $b) => [
            'qtde_etiquetas' => (string) $b->qtde_etiquetas,
            'modelo_ordem' => $b->modelo_ordem,
            'modelo_nome' => $b->modelo_nome,
        ])->values()->all();

        return array_map(
            static fn (array $l) => [
                'modelo_ordem' => $l['modelo_ordem'],
                'modelo_nome' => $l['modelo_nome'],
            ],
            $this->completarModelosNasLinhas($linhas, $modelos)
        );
    }

    /**
     * @param  list<PaEmbalagemBobina>  $bobinas
     * @return list<array{modelo: string, modelo_ordem: int|null, bobinas: int, etiquetas: string}>
     */
    private function conteudoCaixa(array $bobinas): array
    {
        $rows = [];
        foreach ($bobinas as $b) {
            $rows[] = [
                'modelo_ordem' => $b->modelo_ordem,
                'modelo_nome' => $b->modelo_nome,
                'qtde_etiquetas' => (string) $b->qtde_etiquetas,
            ];
        }

        return $this->conteudoCaixaPayload($rows);
    }

    /**
     * @param  list<array{modelo_ordem?: int|null, modelo_nome?: string|null, qtde_etiquetas: string}>  $bobinas
     * @return list<array{modelo: string, modelo_ordem: int|null, bobinas: int, etiquetas: string}>
     */
    private function conteudoCaixaPayload(array $bobinas): array
    {
        $acc = [];
        foreach ($bobinas as $b) {
            $ordem = $b['modelo_ordem'] ?? null;
            $nome = trim((string) ($b['modelo_nome'] ?? ''));
            $key = $ordem !== null ? 'o:'.$ordem : ('n:'.($nome !== '' ? $nome : '_'));
            if (! isset($acc[$key])) {
                $acc[$key] = [
                    'modelo' => $nome !== '' ? $nome : ($ordem !== null ? 'Modelo '.$ordem : '—'),
                    'modelo_ordem' => $ordem,
                    'bobinas' => 0,
                    'etiquetas' => '0',
                ];
            }
            $acc[$key]['bobinas']++;
            $acc[$key]['etiquetas'] = bcadd(
                $acc[$key]['etiquetas'],
                (string) $b['qtde_etiquetas'],
                PadraoDecimal::SCALE_QTY
            );
        }

        $out = array_values($acc);
        usort($out, static function (array $a, array $b) {
            $oa = $a['modelo_ordem'] ?? 9999;
            $ob = $b['modelo_ordem'] ?? 9999;
            if ($oa !== $ob) {
                return $oa <=> $ob;
            }

            return strcmp((string) $a['modelo'], (string) $b['modelo']);
        });

        return $out;
    }

    /**
     * @param  list<array{modelo: string, bobinas: int, etiquetas: string}>  $conteudo
     * @param  array{produto: ?string, descricao: ?string, modelos_item: ?string}  $base
     */
    private function heroCaixa(array $conteudo, array $base): ?string
    {
        if (count($conteudo) === 0) {
            return $base['produto'] ?: $base['descricao'];
        }
        if (count($conteudo) === 1) {
            return $conteudo[0]['modelo'] ?: ($base['produto'] ?: $base['descricao']);
        }
        $nomes = array_values(array_filter(array_map(
            static fn (array $c) => trim((string) ($c['modelo'] ?? '')),
            $conteudo
        )));
        if ($nomes === []) {
            return count($conteudo).' modelos';
        }
        $joined = implode(' + ', array_slice($nomes, 0, 2));
        if (count($nomes) > 2) {
            return $joined.' +'.(count($nomes) - 2);
        }
        if (mb_strlen($joined) <= 42) {
            return $joined;
        }

        return count($nomes).' modelos';
    }

    /**
     * Hierarquia da face: modelo do volume (topo) → produto (coluna).
     *
     * @return array{modelo: string|null, produto: string|null, descricao: string|null, modelos_item: string|null, item: array{ordem: int|null, descricao: string|null, total_itens: int|null}|null}
     */
    private function rotulosFaceEtiqueta(PaEmbalagem $embalagem, bool $pedMultiItem = false): array
    {
        $item = $embalagem->pedidoItem;
        $desc = $item?->descricao !== null && trim((string) $item->descricao) !== ''
            ? trim((string) $item->descricao)
            : null;
        $spec = is_array($item?->especificacao) ? $item->especificacao : [];

        $nomes = [];
        $mods = $spec['modelos_composicao'] ?? null;
        if (is_array($mods)) {
            foreach ($mods as $m) {
                if (! is_array($m)) {
                    continue;
                }
                $n = trim((string) ($m['nome'] ?? ''));
                if ($n !== '') {
                    $nomes[] = $n;
                }
            }
        }
        $modelosItem = null;
        if ($nomes !== []) {
            $visiveis = array_slice($nomes, 0, self::MODELOS_FACE_MAX);
            $modelosItem = implode(' / ', $visiveis);
            $extra = count($nomes) - count($visiveis);
            if ($extra > 0) {
                $modelosItem .= ' +'.$extra;
            }
        }

        $produtoParts = [];
        $medida = trim((string) ($spec['medida'] ?? ''));
        if ($medida !== '') {
            $produtoParts[] = $medida;
        }
        $papel = trim((string) ($spec['papel'] ?? ''));
        if ($papel !== '') {
            $produtoParts[] = $papel;
        }
        if (isset($spec['cores']) && $spec['cores'] !== '' && $spec['cores'] !== null) {
            $produtoParts[] = $spec['cores'].' cor(es)';
        }
        $acab = trim((string) ($spec['acabamento'] ?? ''));
        if ($acab !== '') {
            $produtoParts[] = $acab;
        }
        $produto = $produtoParts !== [] ? implode(' · ', $produtoParts) : $desc;

        $itemOut = null;
        if ($pedMultiItem || ($item?->ordem !== null)) {
            $totalItens = null;
            if ($embalagem->pedido_id) {
                $totalItens = (int) PedidoItem::query()
                    ->where('pedido_id', $embalagem->pedido_id)
                    ->where('empresa_id', $embalagem->empresa_id)
                    ->count();
            }
            if ($pedMultiItem || ($totalItens !== null && $totalItens > 1)) {
                $itemOut = [
                    'ordem' => $item?->ordem !== null ? (int) $item->ordem : null,
                    'descricao' => $desc,
                    'total_itens' => $totalItens,
                ];
            }
        }

        return [
            'modelo' => $modelosItem,
            'produto' => $produto,
            'descricao' => $desc,
            'modelos_item' => $modelosItem,
            'item' => $itemOut,
        ];
    }

    /**
     * Texto para NF-e item (infAdProd) — bobinas + detalhe; ≤500 chars.
     * Default = modo ETIQUETA (compat). Preferir textoFiscalModo na emissão.
     */
    public function textoFiscal(?PaEmbalagem $emb): ?string
    {
        return $this->textoFiscalModo($emb, 'ETIQUETA');
    }

    /**
     * @param  array<string, mixed>|null  $especOverride
     */
    public function textoFiscalModo(?PaEmbalagem $emb, string $modo, ?array $especOverride = null): ?string
    {
        if (! $emb) {
            return null;
        }

        $emb->loadMissing(['bobinas', 'pedidoItem']);

        return mb_substr($emb->textoFiscalModo($modo, $especOverride), 0, 500);
    }

    /**
     * Eco do infCpl: uma frase por embalagem, com o item do pedido.
     * Vários itens não viram um único “N BOB · M CX”.
     *
     * @param  \Illuminate\Support\Collection<int, PaEmbalagem>|iterable<int, PaEmbalagem>  $embs
     */
    public function textoFiscalEco(iterable $embs): ?string
    {
        $partes = [];
        foreach ($embs as $e) {
            if (! $e instanceof PaEmbalagem) {
                continue;
            }
            if ((int) $e->qtde_bobinas < 1 && (int) $e->qtde_caixas < 1) {
                continue;
            }
            $e->loadMissing('pedidoItem');
            $nome = trim((string) ($e->pedidoItem?->descricao ?? ''));
            $fisico = (int) $e->qtde_bobinas.' BOB · '.(int) $e->qtde_caixas.' CX';
            $partes[] = $nome !== '' ? $nome.' - '.$fisico : $fisico;
        }
        if ($partes === []) {
            return null;
        }

        return implode(' | ', $partes);
    }

    /**
     * Resolve embalagem do item fiscal (pedido_item_id); fallback 1 embalagem no PED.
     *
     * @param  \Illuminate\Support\Collection<int, PaEmbalagem>  $embs
     */
    public function resolverParaItem($embs, ?int $pedidoItemId): ?PaEmbalagem
    {
        if ($embs->isEmpty()) {
            return null;
        }
        if ($pedidoItemId !== null && $pedidoItemId > 0) {
            $hit = $embs->first(
                fn (PaEmbalagem $e) => (int) $e->pedido_item_id === $pedidoItemId
            );
            // Item explícito sem embalagem própria (ex.: REV no PED misto) — não herdar a do PA.
            return $hit instanceof PaEmbalagem ? $hit : null;
        }
        // Legado: linha sem pedido_item_id e uma única embalagem no PED.
        if ($embs->count() === 1) {
            return $embs->first();
        }

        return null;
    }

    /**
     * @return array{quantidade: int, especie: string}|null
     */
    public function volumesTransporte(?PaEmbalagem $emb): ?array
    {
        if (! $emb || $emb->qtde_caixas < 1) {
            return null;
        }

        return [
            'quantidade' => (int) $emb->qtde_caixas,
            'especie' => 'CAIXA',
        ];
    }

    /**
     * Volume da NF-e. Quantidade/espécie só com caixa confirmada.
     * Marca = nome do emitente. Numeração = faixa CX (nVol, até 60).
     * Peso (kg, 3 casas) = área travada × 160 g/m², mais tubete e caixa.
     * Sem m² (e sem peso de revenda), o peso fica vazio. Sem placa nem ANTT.
     *
     * @return array{
     *     quantidade: ?int,
     *     especie: ?string,
     *     marca: ?string,
     *     numeracao: string,
     *     peso_liquido: ?string,
     *     peso_bruto: ?string
     * }
     */
    public function volumesTransportePedido(Empresa $empresa, Pedido $pedido): array
    {
        $confirmadas = $this->confirmadasDoPedido($empresa, $pedido);
        $caixasRev = 0;
        foreach ((new CaixaExpedicao())->linhas($empresa, $pedido) as $linha) {
            $caixasRev += (int) $linha['qtde'];
        }
        $caixas = (int) $confirmadas->sum('qtde_caixas') + $caixasRev;
        $peso = (new NfePesoExpedicao())->doPedido($empresa, $pedido, $confirmadas);

        return [
            'quantidade' => $caixas >= 1 ? $caixas : null,
            'especie' => $caixas >= 1 ? 'CAIXA' : null,
            'marca' => $this->marcaVolume($empresa),
            'numeracao' => $this->numeracaoVolumes($confirmadas, $caixas, $caixasRev),
            'peso_liquido' => $peso['peso_liquido'],
            'peso_bruto' => $peso['peso_bruto'],
        ];
    }

    private function marcaVolume(Empresa $empresa): ?string
    {
        $marca = trim((string) ($empresa->nome_fantasia ?: $empresa->razao_social));
        if ($marca === '') {
            return null;
        }

        return mb_substr($marca, 0, 60);
    }

    /**
     * Faixa CX da etiqueta quando ela cobre todas as caixas.
     * Revenda no mesmo pedido soma quantidade e a numeração vira 1–N, sem fingir código de bobina.
     *
     * @param  \Illuminate\Support\Collection<int, PaEmbalagem>  $confirmadas
     */
    private function numeracaoVolumes($confirmadas, int $caixas, int $caixasRev = 0): string
    {
        $sequencias = [];
        foreach ($confirmadas as $e) {
            $e->loadMissing('caixas');
            foreach ($e->caixas as $c) {
                $sequencias[] = (int) $c->sequencia;
            }
        }
        $unicas = array_values(array_unique(array_filter(
            $sequencias,
            fn (int $n) => $n >= 1
        )));
        if ($caixasRev > 0 || count($unicas) !== $caixas) {
            return NfeVolumeNumeracao::nVol([], $caixas);
        }

        return NfeVolumeNumeracao::nVol($sequencias, $caixas);
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(PaEmbalagem $e, bool $detalhe = true): array
    {
        $e->loadMissing('caixaProduto');
        $out = [
            'id' => $e->id,
            'codigo' => $e->codigo,
            'status' => $e->status,
            'qtde_etiquetas' => (string) $e->qtde_etiquetas,
            'qtde_bobinas' => $e->qtde_bobinas,
            'qtde_caixas' => $e->qtde_caixas,
            'etiq_por_rolo' => $e->etiq_por_rolo,
            'rolos_por_caixa' => $e->rolos_por_caixa,
            'tubete' => $e->tubete,
            'caixa_medida' => $e->caixa_medida,
            'caixa_produto_id' => $e->caixa_produto_id,
            'caixa_produto_codigo' => $e->caixaProduto?->codigo,
            'caixa_produto_descricao' => $e->caixaProduto
                ? trim((string) ($e->caixaProduto->descricao_comercial ?: $e->caixaProduto->descricao_fiscal))
                : null,
            'saida_etiqueta' => $e->saida_etiqueta,
            'origem' => $e->origem,
            'resumo' => $e->resumoTexto(),
            'confirmada_em' => optional($e->confirmada_em)?->toIso8601String(),
            'ordem_producao_id' => $e->ordem_producao_id,
            'pedido_id' => $e->pedido_id,
        ];

        if ($detalhe) {
            $e->loadMissing(['bobinas', 'caixas']);
            $out['observacao'] = $e->observacao;
            $out['bobinas'] = $e->bobinas->map(fn (PaEmbalagemBobina $b) => [
                'id' => $b->id,
                'codigo' => $b->codigo,
                'sequencia' => $b->sequencia,
                'qtde_etiquetas' => (string) $b->qtde_etiquetas,
                'tubete' => $b->tubete,
                'caixa_id' => $b->caixa_id,
                'modelo_ordem' => $b->modelo_ordem,
                'modelo_nome' => $b->modelo_nome,
                'qr_payload' => $b->qrPayload(),
            ])->all();
            $out['caixas'] = $e->caixas->map(fn (PaEmbalagemCaixa $c) => [
                'id' => $c->id,
                'codigo' => $c->codigo,
                'sequencia' => $c->sequencia,
                'qtde_bobinas' => $c->qtde_bobinas,
                'qtde_etiquetas' => (string) $c->qtde_etiquetas,
                'qr_payload' => $c->qrPayload(),
            ])->all();
            $out['modelos_resumo'] = $this->modelosResumoDeLinhas(
                array_map(
                    static fn (PaEmbalagemBobina $b) => [
                        'qtde_etiquetas' => (string) $b->qtde_etiquetas,
                        'modelo_ordem' => $b->modelo_ordem,
                        'modelo_nome' => $b->modelo_nome,
                    ],
                    $e->bobinas->all()
                )
            );
        }

        return $out;
    }

    /**
     * @param  list<array{qtde_etiquetas?: mixed, modelo_ordem?: mixed, modelo_nome?: mixed}>|null  $bobinasIn
     * @return array<string, mixed>
     */
    private function montarPlano(
        OrdemProducao $op,
        string $qtdeBoa,
        ?array $bobinasIn,
        ?int $nRolos = null,
        ?int $nCaixasPedidas = null,
        ?string $medidaCaixaEscolhida = null,
    ): array
    {
        $pedido = $op->pedido;
        $snap = is_array($pedido?->snapshot) ? $pedido->snapshot : [];
        $input = is_array($snap['input'] ?? null) ? $snap['input'] : [];
        $faixa = is_array($snap['faixa'] ?? null) ? $snap['faixa'] : [];
        $espec = is_array($op->pedidoItem?->especificacao) ? $op->pedidoItem->especificacao : [];

        $etiqPorRolo = (int) ($espec['etiq_por_rolo'] ?? $input['etiq_por_rolo'] ?? 1000);
        if ($etiqPorRolo < 1) {
            $etiqPorRolo = 1000;
        }

        $capLegada = (int) ($faixa['rolos_por_caixa'] ?? 0);
        $capLegada = $capLegada > 0 ? $capLegada : null;

        $tubete = trim((string) ($espec['tubete'] ?? $input['tubete'] ?? ''));
        $medidaEscolhida = trim((string) $medidaCaixaEscolhida);
        $caixaMedida = $medidaEscolhida !== ''
            ? $medidaEscolhida
            : trim((string) ($faixa['caixa_medida'] ?? ''));
        $saidaRaw = $espec['saida_etiqueta'] ?? $input['saida_etiqueta'] ?? null;
        $saida = $saidaRaw !== null ? trim((string) $saidaRaw) : null;
        if ($saida === '') {
            $saida = null;
        }

        $linhasBobina = $this->montarLinhasBobina($op, $qtdeBoa, $etiqPorRolo, $bobinasIn, $nRolos);

        $soma = '0';
        foreach ($linhasBobina as $linha) {
            $soma = bcadd($soma, $linha['qtde_etiquetas'], PadraoDecimal::SCALE_QTY);
        }
        if (bccomp($soma, $qtdeBoa, PadraoDecimal::SCALE_QTY) !== 0) {
            throw ValidationException::withMessages([
                'bobinas' => ["Soma das bobinas ({$soma}) deve igualar a quantidade boa ({$qtdeBoa})."],
            ]);
        }

        $nBobinas = count($linhasBobina);
        if ($nCaixasPedidas === null && $capLegada === null) {
            $bobinas = [];
            foreach ($linhasBobina as $i => $linha) {
                $bobinas[] = [
                    'sequencia' => $i + 1,
                    'qtde_etiquetas' => $linha['qtde_etiquetas'],
                    'caixa_idx' => 0,
                    'modelo_ordem' => $linha['modelo_ordem'],
                    'modelo_nome' => $linha['modelo_nome'],
                ];
            }
            $caixa = $this->caixaDoEncaixe((int) $op->empresa_id, $caixaMedida);
            $largura = $espec['largura_cm'] ?? $input['largura_cm'] ?? null;
            $encaixe = RoloCaixaEncaixe::avaliar(
                $largura !== null && $largura !== '' ? (string) $largura : null,
                $caixa['lados'],
                $caixa['rotulo'],
            );

            return [
                'qtde_etiquetas' => $qtdeBoa,
                'qtde_bobinas' => $nBobinas,
                'qtde_caixas' => 0,
                'etiq_por_rolo' => $etiqPorRolo,
                'rolos_por_caixa' => null,
                'caixa_planejada_no_orcamento' => false,
                'tubete' => $tubete !== '' ? $tubete : null,
                'caixa_medida' => $caixaMedida !== '' ? $caixaMedida : null,
                'saida_etiqueta' => $saida,
                'encaixe' => $encaixe,
                'bobinas' => $bobinas,
                'caixas' => [],
                'modelos_resumo' => $this->modelosResumoDeLinhas($bobinas),
                'resumo' => number_format((float) $qtdeBoa, 0, ',', '.').' etiquetas · '
                    .$nBobinas.' bobina'.($nBobinas === 1 ? '' : 's'),
            ];
        }

        $rolosPorCaixa = $capLegada ?? $nBobinas;
        $caixasNaturais = (int) ceil($nBobinas / max(1, $rolosPorCaixa));
        $nCaixas = $nCaixasPedidas ?? $caixasNaturais;
        if ($nCaixas < 1 || $nCaixas > $nBobinas) {
            throw ValidationException::withMessages([
                'qtde_caixas' => ['As caixas ficam entre 1 e a quantidade de rolos.'],
            ]);
        }
        $mapaCaixas = ($nCaixasPedidas !== null && $nCaixasPedidas !== $caixasNaturais)
            ? $this->indiceCaixaEquilibrada($nBobinas, $nCaixas)
            : null;

        $bobinas = [];
        $caixasAcc = [];
        for ($c = 0; $c < $nCaixas; $c++) {
            $caixasAcc[$c] = [
                'sequencia' => $c + 1,
                'qtde_bobinas' => 0,
                'qtde_etiquetas' => '0',
            ];
        }

        foreach ($linhasBobina as $i => $linha) {
            $caixaIdx = $mapaCaixas[$i] ?? (int) floor($i / $rolosPorCaixa);
            $bobinas[] = [
                'sequencia' => $i + 1,
                'qtde_etiquetas' => $linha['qtde_etiquetas'],
                'caixa_idx' => $caixaIdx,
                'modelo_ordem' => $linha['modelo_ordem'],
                'modelo_nome' => $linha['modelo_nome'],
            ];
            $caixasAcc[$caixaIdx]['qtde_bobinas']++;
            $caixasAcc[$caixaIdx]['qtde_etiquetas'] = bcadd(
                $caixasAcc[$caixaIdx]['qtde_etiquetas'],
                $linha['qtde_etiquetas'],
                PadraoDecimal::SCALE_QTY
            );
        }

        $caixa = $this->caixaDoEncaixe((int) $op->empresa_id, $caixaMedida);
        $largura = $espec['largura_cm'] ?? $input['largura_cm'] ?? null;
        $encaixe = RoloCaixaEncaixe::avaliar(
            $largura !== null && $largura !== '' ? (string) $largura : null,
            $caixa['lados'],
            $caixa['rotulo'],
        );

        return [
            'qtde_etiquetas' => $qtdeBoa,
            'qtde_bobinas' => $nBobinas,
            'qtde_caixas' => $nCaixas,
            'etiq_por_rolo' => $etiqPorRolo,
            'rolos_por_caixa' => $capLegada,
            'caixa_planejada_no_orcamento' => $capLegada !== null,
            'tubete' => $tubete !== '' ? $tubete : null,
            'caixa_medida' => $caixaMedida !== '' ? $caixaMedida : null,
            'saida_etiqueta' => $saida,
            'encaixe' => $encaixe,
            'bobinas' => $bobinas,
            'caixas' => array_values($caixasAcc),
            'modelos_resumo' => $this->modelosResumoDeLinhas($bobinas),
            'resumo' => number_format((float) $qtdeBoa, 0, ',', '.').' etiquetas · '
                .$nBobinas.' bobina'.($nBobinas === 1 ? '' : 's').' · '
                .$nCaixas.' caixa'.($nCaixas === 1 ? '' : 's'),
        ];
    }

    /**
     * @param  list<array{qtde_etiquetas: string, modelo_ordem?: int|null, modelo_nome?: string|null}>  $linhas
     * @return list<array{ordem: int|null, nome: string, bobinas: int, etiquetas: string}>
     */
    private function modelosResumoDeLinhas(array $linhas): array
    {
        $acc = [];
        foreach ($linhas as $l) {
            $nome = trim((string) ($l['modelo_nome'] ?? ''));
            $ordem = $l['modelo_ordem'] ?? null;
            if ($nome === '' && $ordem === null) {
                continue;
            }
            $key = $ordem !== null ? 'o:'.$ordem : 'n:'.$nome;
            if (! isset($acc[$key])) {
                $acc[$key] = [
                    'ordem' => $ordem !== null ? (int) $ordem : null,
                    'nome' => $nome !== '' ? $nome : ('Modelo '.(string) $ordem),
                    'bobinas' => 0,
                    'etiquetas' => '0',
                ];
            }
            $acc[$key]['bobinas']++;
            $acc[$key]['etiquetas'] = bcadd(
                $acc[$key]['etiquetas'],
                (string) $l['qtde_etiquetas'],
                PadraoDecimal::SCALE_QTY
            );
        }

        $out = array_values($acc);
        usort($out, static function (array $a, array $b) {
            $oa = $a['ordem'] ?? 9999;
            $ob = $b['ordem'] ?? 9999;
            if ($oa !== $ob) {
                return $oa <=> $ob;
            }

            return strcmp((string) $a['nome'], (string) $b['nome']);
        });

        return $out;
    }

    /**
     * 1 bobina = 1 modelo. Fonte: resultado_modelos → matriz/% → sem modelo.
     *
     * @param  list<array{qtde_etiquetas?: mixed, modelo_ordem?: mixed, modelo_nome?: mixed}>|null  $bobinasIn
     * @return list<array{qtde_etiquetas: string, modelo_ordem: int|null, modelo_nome: string|null}>
     */
    private function montarLinhasBobina(
        OrdemProducao $op,
        string $qtdeBoa,
        int $etiqPorRolo,
        ?array $bobinasIn,
        ?int $nRolos,
    ): array {
        $modelos = $this->quantidadesPorModelo($op, $qtdeBoa);

        if ($bobinasIn !== null) {
            $linhas = [];
            foreach ($bobinasIn as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }
                $q = PadraoDecimal::parseStrict((string) ($row['qtde_etiquetas'] ?? ''), PadraoDecimal::SCALE_QTY);
                if ($q === null || bccomp($q, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                    throw ValidationException::withMessages([
                        "bobinas.{$i}.qtde_etiquetas" => ['Quantidade da bobina inválida.'],
                    ]);
                }
                $ord = isset($row['modelo_ordem']) ? (int) $row['modelo_ordem'] : null;
                $nome = isset($row['modelo_nome']) ? trim((string) $row['modelo_nome']) : null;
                $linhas[] = [
                    'qtde_etiquetas' => $q,
                    'modelo_ordem' => $ord !== null && $ord > 0 ? $ord : null,
                    'modelo_nome' => $nome !== null && $nome !== '' ? $nome : null,
                ];
            }
            if ($linhas === []) {
                throw ValidationException::withMessages([
                    'bobinas' => ['Informe ao menos uma bobina.'],
                ]);
            }

            return $this->completarModelosNasLinhas($linhas, $modelos);
        }

        if ($modelos === []) {
            $qtysSugeridas = $this->distribuirEtiquetas($qtdeBoa, $etiqPorRolo);
            if ($nRolos !== null && $nRolos !== count($qtysSugeridas)) {
                if ($nRolos < 1 || $nRolos > 500) {
                    throw ValidationException::withMessages([
                        'qtde_bobinas' => ['Informe entre 1 e 500 rolos.'],
                    ]);
                }
                $qtys = $this->distribuirEmN($qtdeBoa, $nRolos);
            } else {
                $qtys = $qtysSugeridas;
            }

            return array_map(
                static fn (string $q) => [
                    'qtde_etiquetas' => $q,
                    'modelo_ordem' => null,
                    'modelo_nome' => null,
                ],
                $qtys
            );
        }

        $naturais = [];
        foreach ($modelos as $m) {
            foreach ($this->distribuirEtiquetas($m['qtde'], $etiqPorRolo) as $q) {
                $naturais[] = [
                    'qtde_etiquetas' => $q,
                    'modelo_ordem' => $m['ordem'],
                    'modelo_nome' => $m['nome'],
                ];
            }
        }

        if ($nRolos === null || $nRolos === count($naturais)) {
            return $naturais;
        }
        if ($nRolos < 1 || $nRolos > 500) {
            throw ValidationException::withMessages([
                'qtde_bobinas' => ['Informe entre 1 e 500 rolos.'],
            ]);
        }
        $nMod = count($modelos);
        if ($nRolos < $nMod) {
            throw ValidationException::withMessages([
                'qtde_bobinas' => ["Com {$nMod} modelos, informe ao menos {$nMod} rolos (1 por arte)."],
            ]);
        }

        $contagens = $this->contagemRolosPorModelo($modelos, $nRolos);
        $out = [];
        foreach ($modelos as $i => $m) {
            $n = $contagens[$i] ?? 0;
            if ($n < 1) {
                continue;
            }
            foreach ($this->distribuirEmN($m['qtde'], $n) as $q) {
                $out[] = [
                    'qtde_etiquetas' => $q,
                    'modelo_ordem' => $m['ordem'],
                    'modelo_nome' => $m['nome'],
                ];
            }
        }

        return $out;
    }

    /**
     * @param  list<array{qtde_etiquetas: string, modelo_ordem: int|null, modelo_nome: string|null}>  $linhas
     * @param  list<array{ordem: int, nome: string, qtde: string}>  $modelos
     * @return list<array{qtde_etiquetas: string, modelo_ordem: int|null, modelo_nome: string|null}>
     */
    private function completarModelosNasLinhas(array $linhas, array $modelos): array
    {
        if ($modelos === []) {
            return $linhas;
        }

        $porOrdem = [];
        foreach ($modelos as $m) {
            $porOrdem[$m['ordem']] = $m;
        }

        $todasTemModelo = true;
        foreach ($linhas as $l) {
            if ($l['modelo_ordem'] === null) {
                $todasTemModelo = false;
                break;
            }
        }
        if ($todasTemModelo) {
            return array_map(function (array $l) use ($porOrdem) {
                $m = $porOrdem[$l['modelo_ordem']] ?? null;
                if ($m !== null && ($l['modelo_nome'] === null || $l['modelo_nome'] === '')) {
                    $l['modelo_nome'] = $m['nome'];
                }

                return $l;
            }, $linhas);
        }

        $idx = 0;
        $restante = $modelos[0]['qtde'] ?? '0';
        $out = [];
        foreach ($linhas as $l) {
            if ($l['modelo_ordem'] !== null) {
                $m = $porOrdem[$l['modelo_ordem']] ?? null;
                $out[] = [
                    'qtde_etiquetas' => $l['qtde_etiquetas'],
                    'modelo_ordem' => $l['modelo_ordem'],
                    'modelo_nome' => $l['modelo_nome'] ?? $m['nome'] ?? null,
                ];
                continue;
            }
            while ($idx < count($modelos) - 1 && bccomp($restante, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                $idx++;
                $restante = $modelos[$idx]['qtde'];
            }
            $m = $modelos[$idx];
            $out[] = [
                'qtde_etiquetas' => $l['qtde_etiquetas'],
                'modelo_ordem' => $m['ordem'],
                'modelo_nome' => $m['nome'],
            ];
            $restante = bcsub($restante, $l['qtde_etiquetas'], PadraoDecimal::SCALE_QTY);
        }

        return $out;
    }

    /**
     * @param  list<array{ordem: int, nome: string, qtde: string}>  $modelos
     * @return list<int>
     */
    private function contagemRolosPorModelo(array $modelos, int $nRolos): array
    {
        $n = count($modelos);
        $base = array_fill(0, $n, 1);
        $restante = $nRolos - $n;
        if ($restante <= 0) {
            return $base;
        }

        $total = '0';
        foreach ($modelos as $m) {
            $total = bcadd($total, $m['qtde'], PadraoDecimal::SCALE_QTY);
        }
        if (bccomp($total, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            return $base;
        }

        $extras = array_fill(0, $n, 0);
        $alocado = 0;
        $fracs = [];
        for ($i = 0; $i < $n; $i++) {
            $share = (float) bcmul(
                bcdiv($modelos[$i]['qtde'], $total, 8),
                (string) $restante,
                8
            );
            $floor = (int) floor($share);
            $extras[$i] = $floor;
            $alocado += $floor;
            $fracs[$i] = $share - $floor;
        }
        $sobra = $restante - $alocado;
        arsort($fracs);
        foreach (array_keys($fracs) as $i) {
            if ($sobra <= 0) {
                break;
            }
            $extras[$i]++;
            $sobra--;
        }

        $out = [];
        for ($i = 0; $i < $n; $i++) {
            $out[] = $base[$i] + $extras[$i];
        }

        return $out;
    }

    /**
     * @return list<array{ordem: int, nome: string, qtde: string}>
     */
    private function quantidadesPorModelo(OrdemProducao $op, string $qtdeBoa): array
    {
        $resultado = is_array($op->resultado_modelos) ? $op->resultado_modelos : null;
        if (is_array($resultado) && $resultado !== []) {
            $out = [];
            foreach ($resultado as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $boa = PadraoDecimal::parseStrict((string) ($row['qtde_boa'] ?? ''), PadraoDecimal::SCALE_QTY);
                if ($boa === null || bccomp($boa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                    continue;
                }
                $ordem = (int) ($row['ordem'] ?? (count($out) + 1));
                $nome = trim((string) ($row['nome'] ?? ''));
                if ($nome === '') {
                    $nome = 'Modelo '.$ordem;
                }
                $out[] = [
                    'ordem' => $ordem > 0 ? $ordem : count($out) + 1,
                    'nome' => $nome,
                    'qtde' => PadraoDecimal::roundHalfUp($boa, PadraoDecimal::SCALE_QTY),
                ];
            }
            if ($out !== []) {
                return $out;
            }
        }

        $espec = is_array($op->pedidoItem?->especificacao) ? $op->pedidoItem->especificacao : [];
        $comp = $espec['modelos_composicao'] ?? null;
        if (! is_array($comp) || $comp === []) {
            return [];
        }
        $compNorm = [];
        foreach (array_values($comp) as $i => $row) {
            if (! is_array($row)) {
                continue;
            }
            $nome = trim((string) ($row['nome'] ?? ''));
            if ($nome === '') {
                continue;
            }
            $compNorm[] = [
                'ordem' => (int) ($row['ordem'] ?? $i + 1),
                'nome' => $nome,
                'percentual' => (float) ($row['percentual'] ?? 0),
                'valor_arte' => (float) ($row['valor_arte'] ?? 0),
                'arte_url' => $row['arte_url'] ?? null,
                'tintas' => is_array($row['tintas'] ?? null) ? $row['tintas'] : [],
            ];
        }
        if ($compNorm === []) {
            return [];
        }
        if (count($compNorm) === 1 && bccomp($qtdeBoa, '0', PadraoDecimal::SCALE_QTY) > 0) {
            return [[
                'ordem' => $compNorm[0]['ordem'],
                'nome' => $compNorm[0]['nome'],
                'qtde' => $qtdeBoa,
            ]];
        }

        // Sem % explícito: equal-split (legado dos testes / artes só com nome).
        $semPct = true;
        foreach ($compNorm as $row) {
            if (($row['percentual'] ?? 0) > 0) {
                $semPct = false;
                break;
            }
        }
        if ($semPct) {
            $n = count($compNorm);
            foreach ($compNorm as $i => $_) {
                $compNorm[$i]['percentual'] = round(100.0 / $n, 4);
            }
            $compNorm[$n - 1]['percentual'] = round(
                100.0 - array_sum(array_column(array_slice($compNorm, 0, $n - 1), 'percentual')),
                4
            );
        }

        $totalInt = (int) floor((float) $qtdeBoa);
        $faixaIdx = array_key_exists('faixa_index', $espec) && $espec['faixa_index'] !== null
            ? (int) $espec['faixa_index']
            : 0;
        $matriz = is_array($espec['modelos_composicao_quantidades'] ?? null)
            ? $espec['modelos_composicao_quantidades']
            : null;
        $aloc = ModelosComposicao::alocarQuantidadesFaixa($totalInt, $compNorm, $matriz, $faixaIdx);
        $out = [];
        $soma = '0';
        foreach ($aloc as $i => $row) {
            $qi = (string) max(0, (int) ($row['quantidade'] ?? 0));
            if ($i === count($aloc) - 1) {
                $qi = bcsub($qtdeBoa, $soma, PadraoDecimal::SCALE_QTY);
                if (bccomp($qi, '0', PadraoDecimal::SCALE_QTY) < 0) {
                    $qi = '0';
                }
            } else {
                $soma = bcadd($soma, PadraoDecimal::roundHalfUp($qi, PadraoDecimal::SCALE_QTY), PadraoDecimal::SCALE_QTY);
                $qi = PadraoDecimal::roundHalfUp($qi, PadraoDecimal::SCALE_QTY);
            }
            if (bccomp($qi, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                continue;
            }
            $out[] = [
                'ordem' => (int) ($row['ordem'] ?? $i + 1),
                'nome' => trim((string) ($row['nome'] ?? 'Modelo '.($i + 1))),
                'qtde' => $qi,
            ];
        }

        return $out;
    }

    private function capacidadeCaixaDoSnapshot(OrdemProducao $op): ?int
    {
        $snap = is_array($op->pedido?->snapshot) ? $op->pedido->snapshot : [];
        $faixa = is_array($snap['faixa'] ?? null) ? $snap['faixa'] : [];
        $cap = (int) ($faixa['rolos_por_caixa'] ?? 0);

        return $cap > 0 ? $cap : null;
    }

    /**
     * @return array{lados: list<string>|null, rotulo: ?string}
     */
    private function caixaDoEncaixe(int $empresaId, string $medida): array
    {
        $vazio = ['lados' => null, 'rotulo' => null];
        if ($medida === '' || $empresaId < 1) {
            return $vazio;
        }

        $produtos = Produto::query()
            ->where('empresa_id', $empresaId)
            ->where('situacao', 'ATIVO')
            ->where('familia', 'EMB')
            ->where(function ($q) {
                $q->where('codigo', 'like', 'EMB-CX%')
                    ->orWhere('descricao_fiscal', 'like', '%CAIXA%');
            })
            ->orderBy('codigo')
            ->get(['codigo', 'atributos']);

        foreach ($produtos as $produto) {
            $attrs = is_array($produto->atributos) ? $produto->atributos : null;
            if (CaixaMedida::casaAtributos($attrs, $medida) !== true) {
                continue;
            }
            $m = CaixaMedida::fromAtributos($attrs);
            if ($m === null) {
                continue;
            }

            return [
                'lados' => [$m[CaixaMedida::COMP], $m[CaixaMedida::LARG], $m[CaixaMedida::ALT]],
                'rotulo' => $produto->codigo.' · '.CaixaMedida::rotulo($attrs),
            ];
        }

        return $vazio;
    }

    /**
     * @return list<string>
     */
    /**
     * Reparte a quantidade boa em N rolos. Os primeiros levam a parte inteira; o último absorve o resto.
     *
     * @return list<string>
     */
    private function distribuirEmN(string $qtdeBoa, int $n): array
    {
        if ($n === 1) {
            return [$qtdeBoa];
        }

        $cada = bcdiv($qtdeBoa, (string) $n, PadraoDecimal::SCALE_QTY);
        if (bccomp($cada, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_bobinas' => ['A quantidade boa não cobre essa quantidade de rolos.'],
            ]);
        }

        $out = [];
        $soma = '0';
        for ($i = 0; $i < $n - 1; $i++) {
            $out[] = $cada;
            $soma = bcadd($soma, $cada, PadraoDecimal::SCALE_QTY);
        }
        $ultima = bcsub($qtdeBoa, $soma, PadraoDecimal::SCALE_QTY);
        if (bccomp($ultima, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_bobinas' => ['A quantidade boa não cobre essa quantidade de rolos.'],
            ]);
        }
        $out[] = $ultima;

        return $out;
    }

    /**
     * @return list<int> índice da caixa de cada rolo
     */
    private function indiceCaixaEquilibrada(int $nBobinas, int $nCaixas): array
    {
        $base = intdiv($nBobinas, $nCaixas);
        $extra = $nBobinas % $nCaixas;
        $map = [];
        $caixa = 0;
        $naCaixa = 0;
        $capacidade = $base + ($extra > 0 ? 1 : 0);
        for ($i = 0; $i < $nBobinas; $i++) {
            if ($naCaixa >= $capacidade) {
                $caixa++;
                $naCaixa = 0;
                $capacidade = $base + ($caixa < $extra ? 1 : 0);
            }
            $map[$i] = $caixa;
            $naCaixa++;
        }

        return $map;
    }

    /**
     * @return list<string>
     */
    private function distribuirEtiquetas(string $qtdeBoa, int $etiqPorRolo): array
    {
        $porRolo = (string) $etiqPorRolo;
        if (bccomp($qtdeBoa, $porRolo, PadraoDecimal::SCALE_QTY) <= 0) {
            return [$qtdeBoa];
        }

        $nCheias = (int) floor((float) bcdiv($qtdeBoa, $porRolo, 8));
        $consumido = bcmul((string) $nCheias, $porRolo, PadraoDecimal::SCALE_QTY);
        $resto = PadraoDecimal::roundHalfUp(
            bcsub($qtdeBoa, $consumido, PadraoDecimal::SCALE_QTY + 2),
            PadraoDecimal::SCALE_QTY
        );

        $out = [];
        for ($i = 0; $i < $nCheias; $i++) {
            $out[] = PadraoDecimal::roundHalfUp($porRolo, PadraoDecimal::SCALE_QTY);
        }
        if (bccomp($resto, '0', PadraoDecimal::SCALE_QTY) > 0) {
            $out[] = $resto;
        }

        return $out;
    }

    private function nfAutorizadaDoPedido(Empresa $empresa, int $pedidoId): bool
    {
        $fat = Faturamento::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedidoId)
            ->where('status', Faturamento::STATUS_CONFIRMADO)
            ->first();
        if (! $fat) {
            return false;
        }

        return DocumentoFiscalSaida::query()
            ->where('faturamento_id', $fat->id)
            ->where('status', DocumentoFiscalSaida::STATUS_AUTORIZADO)
            ->exists();
    }

    private function assertOpEmpresa(Empresa $empresa, OrdemProducao $op): void
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }
    }
}
