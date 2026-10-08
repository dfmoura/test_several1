<?php

namespace App\Services\Estoque;

use App\Models\CodigoSequence;
use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Locais do almoxarifado — ADR_CADASTRO_INSUMO_VOLUME F4.
 * Gabarito 6×4×3 é o padrão da planta. Cadastro estende a mesma malha.
 * Malha = prateleira/coluna/vao; rótulo impresso = P00000001 (seq. por EMP).
 * QR legado Pxx-Cxx-Lxx / Vxx ainda resolve no mesmo id.
 */
class EstoqueEnderecoService
{
    /**
     * Semear o gabarito, alinhar rótulo sequencial e legado de malha.
     * Reativa só os 72 do gabarito. Extensão (L04, P07, …) permanece como está.
     *
     * @return array{criados: int, existentes: int, renomeados: int, desativados: int, total: int}
     */
    public function seedGabarito(Empresa $empresa): array
    {
        $criados = 0;
        $existentes = 0;
        $renomeados = 0;
        $desativados = 0;

        DB::transaction(function () use ($empresa, &$criados, &$existentes, &$renomeados, &$desativados) {
            for ($p = 1; $p <= EstoqueEndereco::PRATELEIRAS; $p++) {
                for ($c = 1; $c <= EstoqueEndereco::COLUNAS; $c++) {
                    for ($v = 1; $v <= EstoqueEndereco::VAOS; $v++) {
                        $r = $this->garantirSlot($empresa, $p, $c, $v);
                        $criados += $r['criados'];
                        $existentes += $r['existentes'];
                        $renomeados += $r['renomeados'];
                        $desativados += $r['desativados'];
                    }
                }
            }

            $alinhados = $this->alinharRotulosForaDoGabarito($empresa);
            $renomeados += $alinhados['renomeados'];
            $desativados += $alinhados['desativados'];
        });

        $total = EstoqueEndereco::PRATELEIRAS * EstoqueEndereco::COLUNAS * EstoqueEndereco::VAOS;

        return [
            'criados' => $criados,
            'existentes' => $existentes,
            'renomeados' => $renomeados,
            'desativados' => $desativados,
            'total' => $total,
        ];
    }

    /**
     * Novo local na malha. Sem `vao`, usa o primeiro número sem local ativo.
     * Posição inativa volta no mesmo id (rótulo já impresso continua válido).
     *
     * @param  array{prateleira: int|string, coluna: int|string, vao?: int|string|null, largura_m?: string|null, profundidade_m?: string|null, altura_m?: string|null}  $input
     */
    public function cadastrar(Empresa $empresa, array $input): EstoqueEndereco
    {
        $p = (int) $input['prateleira'];
        $c = (int) $input['coluna'];

        return DB::transaction(function () use ($empresa, $input, $p, $c) {
            $v = isset($input['vao']) && $input['vao'] !== null && $input['vao'] !== ''
                ? (int) $input['vao']
                : $this->proximoVao($empresa, $p, $c);

            $row = EstoqueEndereco::query()
                ->where('empresa_id', $empresa->id)
                ->where('prateleira', $p)
                ->where('coluna', $c)
                ->where('vao', $v)
                ->lockForUpdate()
                ->first();

            if ($row !== null && $row->ativo) {
                throw ValidationException::withMessages([
                    'vao' => ["Local {$row->codigo} já está cadastrado."],
                ]);
            }

            $dims = [
                'largura_m' => $this->medida($input['largura_m'] ?? null, EstoqueEndereco::LARGURA_M),
                'profundidade_m' => $this->medida($input['profundidade_m'] ?? null, EstoqueEndereco::PROFUNDIDADE_M),
                'altura_m' => $this->medida($input['altura_m'] ?? null, EstoqueEndereco::ALTURA_M),
            ];

            if ($row !== null) {
                if (! EstoqueEndereco::isCodigoSequencial((string) $row->codigo)) {
                    $row->codigo = $this->proximoCodigoRotulo($empresa);
                }
                $row->ativo = true;
                $row->fill($dims);
                $row->save();

                return $row;
            }

            return EstoqueEndereco::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $this->proximoCodigoRotulo($empresa),
                'prateleira' => $p,
                'coluna' => $c,
                'vao' => $v,
                'ativo' => true,
                ...$dims,
            ]);
        });
    }

    /**
     * Lugar fora da malha (Garagem, em cima das estantes). Reusa o mesmo nome na EMP.
     */
    public function garantirNome(Empresa $empresa, string $nome): EstoqueEndereco
    {
        $nome = trim((string) preg_replace('/\s+/u', ' ', $nome));
        if (mb_strlen($nome) < 2) {
            throw ValidationException::withMessages([
                'nome' => ['Dê um nome ao local (mínimo 2 caracteres).'],
            ]);
        }
        if (mb_strlen($nome) > 80) {
            throw ValidationException::withMessages([
                'nome' => ['Nome do local até 80 caracteres.'],
            ]);
        }

        return DB::transaction(function () use ($empresa, $nome) {
            $existente = EstoqueEndereco::query()
                ->where('empresa_id', $empresa->id)
                ->whereRaw('LOWER(nome) = ?', [mb_strtolower($nome)])
                ->lockForUpdate()
                ->first();

            if ($existente !== null) {
                if (! $existente->ativo) {
                    $existente->ativo = true;
                    $existente->save();
                }

                return $existente;
            }

            return EstoqueEndereco::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $this->proximoCodigoRotulo($empresa),
                'nome' => $nome,
                'prateleira' => null,
                'coluna' => null,
                'vao' => null,
                'largura_m' => EstoqueEndereco::LARGURA_M,
                'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
                'altura_m' => EstoqueEndereco::ALTURA_M,
                'ativo' => true,
            ]);
        });
    }

    /**
     * Um local para a quantidade inteira do SKU sem volume. Não gera MOV.
     *
     * @return array{produto_id: int, local: ?array{id: int, codigo: string, nome: ?string}}
     */
    public function colocarSaldo(Empresa $empresa, int $produtoId, ?int $enderecoId, ?string $nome): array
    {
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($produtoId)
            ->first();
        if ($produto === null) {
            throw ValidationException::withMessages([
                'produto_id' => ['Produto não encontrado nesta empresa.'],
            ]);
        }
        if ($produto->controla_lote) {
            throw ValidationException::withMessages([
                'produto_id' => ['Este item tem volume. O local de cada volume fica em Guardar.'],
            ]);
        }

        $endereco = $this->resolverLocalDoSaldo($empresa, $enderecoId, $nome);

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->first();

        if ($saldo === null) {
            throw ValidationException::withMessages([
                'produto_id' => ['Este item ainda não tem saldo. Receba antes de marcar o local.'],
            ]);
        }

        $saldo->endereco_id = $endereco?->id;
        $saldo->save();

        $saldo->load('endereco:id,codigo,nome');

        return [
            'produto_id' => (int) $produto->id,
            'local' => $saldo->endereco?->resumo(),
        ];
    }

    private function resolverLocalDoSaldo(Empresa $empresa, ?int $enderecoId, ?string $nome): ?EstoqueEndereco
    {
        if ($enderecoId !== null && $enderecoId > 0) {
            $end = EstoqueEndereco::query()
                ->where('empresa_id', $empresa->id)
                ->where('ativo', true)
                ->whereKey($enderecoId)
                ->first();
            if ($end === null) {
                throw ValidationException::withMessages([
                    'endereco_id' => ['Local inválido ou inativo nesta empresa.'],
                ]);
            }

            return $end;
        }

        $texto = trim((string) $nome);
        if ($texto === '') {
            return null;
        }

        $porCodigo = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativo', true)
            ->where('codigo', $texto)
            ->first();
        if ($porCodigo !== null) {
            return $porCodigo;
        }

        return $this->garantirNome($empresa, $texto);
    }

    /**
     * Medidas e ativo. Posição e código não mudam — a etiqueta colada continua válida.
     *
     * @param  array{ativo?: bool, largura_m?: string|null, profundidade_m?: string|null, altura_m?: string|null}  $input
     */
    public function atualizar(Empresa $empresa, int $id, array $input): EstoqueEndereco
    {
        $row = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($id)
            ->first();

        if ($row === null) {
            abort(404);
        }

        if (array_key_exists('ativo', $input)) {
            $row->ativo = (bool) $input['ativo'];
        }

        foreach (['largura_m', 'profundidade_m', 'altura_m'] as $campo) {
            if (! array_key_exists($campo, $input) || $input[$campo] === null || $input[$campo] === '') {
                continue;
            }
            $row->{$campo} = $this->medida($input[$campo], (string) $row->{$campo});
        }

        $row->save();

        return $row;
    }

    /**
     * @return array{criados: int, existentes: int, renomeados: int, desativados: int}
     */
    private function garantirSlot(Empresa $empresa, int $p, int $c, int $v): array
    {
        $malha = EstoqueEndereco::codigoMalhaDe($p, $c, $v);
        $legado = EstoqueEndereco::codigoLegadoDe($p, $c, $v);

        $rowPos = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('prateleira', $p)
            ->where('coluna', $c)
            ->where('vao', $v)
            ->first();
        $rowMalha = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', $malha)
            ->first();
        $rowLegado = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', $legado)
            ->first();

        if ($rowMalha !== null && $rowLegado !== null && $rowMalha->id !== $rowLegado->id) {
            $this->fundirVolumes($empresa, (int) $rowLegado->id, (int) $rowMalha->id);
            $rowLegado->ativo = false;
            $rowLegado->save();
            $survivor = $rowPos ?? $rowMalha;
            $r = $this->ativarEAlinharRotulo($empresa, $survivor);
            $r['desativados'] = 1;

            return $r;
        }

        if ($rowLegado !== null && $rowPos === null && $rowMalha === null) {
            $rowLegado->prateleira = $p;
            $rowLegado->coluna = $c;
            $rowLegado->vao = $v;
            $r = $this->ativarEAlinharRotulo($empresa, $rowLegado);
            $r['renomeados'] = max(1, $r['renomeados']);

            return $r;
        }

        if ($rowMalha !== null && $rowPos === null) {
            $rowMalha->prateleira = $p;
            $rowMalha->coluna = $c;
            $rowMalha->vao = $v;

            return $this->ativarEAlinharRotulo($empresa, $rowMalha);
        }

        if ($rowPos !== null) {
            if ($rowLegado !== null && $rowLegado->id !== $rowPos->id) {
                $this->fundirVolumes($empresa, (int) $rowLegado->id, (int) $rowPos->id);
                $rowLegado->ativo = false;
                $rowLegado->save();
                $r = $this->ativarEAlinharRotulo($empresa, $rowPos);
                $r['desativados'] = 1;

                return $r;
            }

            return $this->ativarEAlinharRotulo($empresa, $rowPos);
        }

        EstoqueEndereco::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $this->proximoCodigoRotulo($empresa),
            'prateleira' => $p,
            'coluna' => $c,
            'vao' => $v,
            'largura_m' => EstoqueEndereco::LARGURA_M,
            'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
            'altura_m' => EstoqueEndereco::ALTURA_M,
            'ativo' => true,
        ]);

        return ['criados' => 1, 'existentes' => 0, 'renomeados' => 0, 'desativados' => 0];
    }

    /**
     * @return array{criados: int, existentes: int, renomeados: int, desativados: int}
     */
    private function ativarEAlinharRotulo(Empresa $empresa, EstoqueEndereco $row): array
    {
        $renomeados = 0;
        $existentes = 0;

        if (! EstoqueEndereco::isCodigoSequencial((string) $row->codigo)) {
            $row->codigo = $this->proximoCodigoRotulo($empresa);
            $renomeados = 1;
        } else {
            $existentes = 1;
        }

        if (! $row->ativo) {
            $row->ativo = true;
        }

        $row->save();

        return [
            'criados' => 0,
            'existentes' => $existentes,
            'renomeados' => $renomeados,
            'desativados' => 0,
        ];
    }

    private function fundirVolumes(Empresa $empresa, int $deEnderecoId, int $paraEnderecoId): void
    {
        EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('endereco_id', $deEnderecoId)
            ->update(['endereco_id' => $paraEnderecoId]);
    }

    /**
     * Fora do gabarito: malha L/V vira rótulo sequencial no mesmo id.
     * Duplicata malha+legado funde o volume e inativa o legado.
     *
     * @return array{renomeados: int, desativados: int}
     */
    private function alinharRotulosForaDoGabarito(Empresa $empresa): array
    {
        $renomeados = 0;
        $desativados = 0;

        $fora = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where(function ($q) {
                $q->where('prateleira', '>', EstoqueEndereco::PRATELEIRAS)
                    ->orWhere('coluna', '>', EstoqueEndereco::COLUNAS)
                    ->orWhere('vao', '>', EstoqueEndereco::VAOS);
            })
            ->orderBy('id')
            ->get();

        foreach ($fora as $row) {
            if (EstoqueEndereco::isCodigoSequencial((string) $row->codigo)) {
                continue;
            }

            $malha = EstoqueEndereco::codigoMalhaDe($row->prateleira, $row->coluna, $row->vao);
            $legado = EstoqueEndereco::codigoLegadoDe($row->prateleira, $row->coluna, $row->vao);
            $codigoAtual = (string) $row->codigo;

            if (strcasecmp($codigoAtual, $legado) !== 0 && strcasecmp($codigoAtual, $malha) !== 0
                && ! EstoqueEndereco::isCodigoMalha($codigoAtual)) {
                continue;
            }

            $outro = EstoqueEndereco::query()
                ->where('empresa_id', $empresa->id)
                ->where('prateleira', $row->prateleira)
                ->where('coluna', $row->coluna)
                ->where('vao', $row->vao)
                ->where('id', '!=', $row->id)
                ->first();

            if ($outro !== null) {
                $this->fundirVolumes($empresa, (int) $row->id, (int) $outro->id);
                $row->ativo = false;
                $row->save();
                $desativados++;
                if (! EstoqueEndereco::isCodigoSequencial((string) $outro->codigo)) {
                    $outro->codigo = $this->proximoCodigoRotulo($empresa);
                    $outro->save();
                    $renomeados++;
                }

                continue;
            }

            $row->codigo = $this->proximoCodigoRotulo($empresa);
            $row->save();
            $renomeados++;
        }

        return [
            'renomeados' => $renomeados,
            'desativados' => $desativados,
        ];
    }

    private function proximoCodigoRotulo(Empresa $empresa): string
    {
        $n = DB::transaction(function () use ($empresa) {
            $row = CodigoSequence::query()
                ->where('empresa_id', $empresa->id)
                ->where('prefixo', EstoqueEndereco::SEQ_PREFIXO)
                ->lockForUpdate()
                ->first();

            $floor = $this->maxCodigoSequencialExistente($empresa) + 1;

            if ($row === null) {
                $current = max(1, $floor);
                CodigoSequence::query()->create([
                    'empresa_id' => $empresa->id,
                    'prefixo' => EstoqueEndereco::SEQ_PREFIXO,
                    'proximo' => $current + 1,
                ]);

                return $current;
            }

            $current = max((int) $row->proximo, $floor);
            $row->update(['proximo' => $current + 1]);

            return $current;
        });

        return EstoqueEndereco::codigoSequencialDe($n);
    }

    private function maxCodigoSequencialExistente(Empresa $empresa): int
    {
        $prefix = EstoqueEndereco::PREFIXO_ROTULO;
        $pad = EstoqueEndereco::PAD_ROTULO;
        $codes = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', 'like', $prefix.'%')
            ->pluck('codigo');

        $max = 0;
        foreach ($codes as $codigo) {
            if (! EstoqueEndereco::isCodigoSequencial((string) $codigo)) {
                continue;
            }
            $n = (int) substr((string) $codigo, strlen($prefix), $pad);
            if ($n > $max) {
                $max = $n;
            }
        }

        return $max;
    }

    private function proximoVao(Empresa $empresa, int $prateleira, int $coluna): int
    {
        $ativos = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('prateleira', $prateleira)
            ->where('coluna', $coluna)
            ->where('ativo', true)
            ->lockForUpdate()
            ->pluck('vao')
            ->map(fn ($vao) => (int) $vao)
            ->all();

        $ocupados = array_fill_keys($ativos, true);
        for ($vao = 1; $vao <= EstoqueEndereco::EIXO_MAX; $vao++) {
            if (! isset($ocupados[$vao])) {
                return $vao;
            }
        }

        throw ValidationException::withMessages([
            'vao' => ['Esta prateleira e coluna já têm o local 255.'],
        ]);
    }

    private function medida(mixed $valor, string $padrao): string
    {
        if ($valor === null || $valor === '') {
            return $padrao;
        }

        $texto = is_string($valor) ? trim($valor) : (string) $valor;
        if (! is_numeric($texto)) {
            throw ValidationException::withMessages([
                'largura_m' => ['Medida do local inválida.'],
            ]);
        }

        return number_format((float) $texto, 3, '.', '');
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, bool $somenteAtivos = true): array
    {
        $q = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->orderBy('prateleira')
            ->orderBy('coluna')
            ->orderBy('vao');

        if ($somenteAtivos) {
            $q->where('ativo', true);
        }

        return $q->get()->map(fn (EstoqueEndereco $e) => $this->toOut($e))->all();
    }

    /**
     * Mapa de ocupação dos locais (WMS leve) — só leitura agregada.
     * Célula = endereço; volumes com qtde > 0. Não altera saldo/MOV.
     *
     * @return array{
     *   locais: list<array<string, mixed>>,
     *   resumo: array{total_locais: int, ocupados: int, vazios: int, volumes_guardados: int, volumes_sem_local: int, skus_distintos: int}
     * }
     */
    public function mapaOcupacao(Empresa $empresa, ?int $produtoId = null): array
    {
        $locais = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativo', true)
            ->orderBy('prateleira')
            ->orderBy('coluna')
            ->orderBy('vao')
            ->get();

        $aggQuery = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->whereNotNull('endereco_id')
            ->where('qtde', '>', 0);

        if ($produtoId !== null && $produtoId > 0) {
            $aggQuery->where('produto_id', $produtoId);
        }

        /** @var array<int, object{endereco_id: int, volumes_count: int|string, skus_count: int|string}> $porEndereco */
        $porEndereco = $aggQuery
            ->selectRaw('endereco_id, COUNT(*) as volumes_count, COUNT(DISTINCT produto_id) as skus_count')
            ->groupBy('endereco_id')
            ->get()
            ->keyBy(fn ($row) => (int) $row->endereco_id)
            ->all();

        $semLocalQuery = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->whereNull('endereco_id')
            ->where('qtde', '>', 0);

        if ($produtoId !== null && $produtoId > 0) {
            $semLocalQuery->where('produto_id', $produtoId);
        }

        $volumesSemLocal = (int) $semLocalQuery->count();

        $idsNomeados = $locais
            ->filter(fn (EstoqueEndereco $end) => $end->prateleira === null)
            ->map(fn (EstoqueEndereco $end) => (int) $end->id)
            ->all();
        $saldosNomeados = EstoqueSaldo::query()
            ->with('produto:id,codigo,descricao_comercial,descricao_fiscal,controla_lote')
            ->where('empresa_id', $empresa->id)
            ->whereIn('endereco_id', $idsNomeados === [] ? [0] : $idsNomeados)
            ->where('qtde', '>', 0);
        if ($produtoId !== null && $produtoId > 0) {
            $saldosNomeados->where('produto_id', $produtoId);
        }
        $saldosPorLocal = $idsNomeados === []
            ? collect()
            : $saldosNomeados->get()->groupBy(fn (EstoqueSaldo $s) => (int) $s->endereco_id);

        $out = [];
        $nomeados = [];
        $ocupados = 0;
        $volumesGuardados = 0;

        foreach ($locais as $end) {
            if ($end->prateleira === null) {
                $volumes = isset($porEndereco[(int) $end->id]) ? (int) $porEndereco[(int) $end->id]->volumes_count : 0;
                $pilhas = [];
                foreach ($saldosPorLocal->get((int) $end->id, collect()) as $saldo) {
                    if ($saldo->produto?->controla_lote) {
                        continue;
                    }
                    $pilhas[] = [
                        'produto_id' => (int) $saldo->produto_id,
                        'codigo' => (string) ($saldo->produto?->codigo ?? ''),
                        'descricao' => (string) ($saldo->produto?->descricao_comercial ?: $saldo->produto?->descricao_fiscal ?: ''),
                        'qtde' => (string) $saldo->qtde,
                        'unidade' => (string) $saldo->unidade,
                    ];
                }
                if ($produtoId !== null && $produtoId > 0 && $volumes === 0 && $pilhas === []) {
                    continue;
                }
                $cell = $this->toOut($end);
                $cell['volumes_count'] = $volumes;
                $cell['itens'] = $pilhas;
                $nomeados[] = $cell;

                continue;
            }
            $row = $porEndereco[(int) $end->id] ?? null;
            $volumes = $row !== null ? (int) $row->volumes_count : 0;
            $skus = $row !== null ? (int) $row->skus_count : 0;
            if ($volumes > 0) {
                $ocupados++;
                $volumesGuardados += $volumes;
            }
            $cell = $this->toOut($end);
            $cell['volumes_count'] = $volumes;
            $cell['skus_count'] = $skus;
            $out[] = $cell;
        }

        if ($produtoId !== null && $produtoId > 0) {
            $skusDistintos = $volumesGuardados > 0 || $volumesSemLocal > 0 ? 1 : 0;
        } else {
            $skusDistintos = (int) EstoqueLote::query()
                ->where('empresa_id', $empresa->id)
                ->whereNotNull('endereco_id')
                ->where('qtde', '>', 0)
                ->distinct()
                ->count('produto_id');
        }

        return [
            'locais' => $out,
            'nomeados' => $nomeados,
            'resumo' => [
                'total_locais' => count($out),
                'ocupados' => $ocupados,
                'vazios' => count($out) - $ocupados,
                'volumes_guardados' => $volumesGuardados,
                'volumes_sem_local' => $volumesSemLocal,
                'skus_distintos' => $skusDistintos,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(EstoqueEndereco $e): array
    {
        $temMalha = $e->prateleira !== null && $e->coluna !== null && $e->vao !== null;

        return [
            'id' => $e->id,
            'codigo' => $e->codigo,
            'nome' => $e->nome,
            'codigo_malha' => $temMalha
                ? EstoqueEndereco::codigoMalhaDe((int) $e->prateleira, (int) $e->coluna, (int) $e->vao)
                : null,
            'prateleira' => $e->prateleira,
            'coluna' => $e->coluna,
            'vao' => $e->vao,
            'largura_m' => (string) $e->largura_m,
            'profundidade_m' => (string) $e->profundidade_m,
            'altura_m' => (string) $e->altura_m,
            'ativo' => (bool) $e->ativo,
            'qr_payload' => $e->qrPayload(),
        ];
    }

    /**
     * Resolve payload END:{empresa_id}:{id}:{codigo} — valida EMP e código.
     * Aceita rótulo sequencial atual e malha legada Pxx-Cxx-Lxx / Vxx do mesmo slot.
     */
    public function resolverPorQr(Empresa $empresa, string $payload): EstoqueEndereco
    {
        $payload = trim($payload);
        if (! preg_match('/^END:(\d+):(\d+):([A-Za-z0-9\-]+)$/', $payload, $m)) {
            throw ValidationException::withMessages([
                'endereco_qr' => ['QR de local inválido. Esperado END:{empresa}:{id}:{codigo}.'],
            ]);
        }

        $empId = (int) $m[1];
        $endId = (int) $m[2];
        $codigo = $m[3];

        if ($empId !== (int) $empresa->id) {
            throw ValidationException::withMessages([
                'endereco_qr' => ['QR de local de outra empresa.'],
            ]);
        }

        $end = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $endId)
            ->where('ativo', true)
            ->first();

        if ($end === null || ! $this->codigoCompativel($end, $codigo)) {
            throw ValidationException::withMessages([
                'endereco_qr' => ['Local não encontrado ou QR adulterado.'],
            ]);
        }

        return $end;
    }

    private function codigoCompativel(EstoqueEndereco $end, string $codigo): bool
    {
        if (strcasecmp((string) $end->codigo, $codigo) === 0) {
            return true;
        }

        if ($end->prateleira === null || $end->coluna === null || $end->vao === null) {
            return false;
        }

        $malha = EstoqueEndereco::codigoMalhaDe(
            (int) $end->prateleira,
            (int) $end->coluna,
            (int) $end->vao
        );
        $legado = EstoqueEndereco::codigoLegadoDe(
            (int) $end->prateleira,
            (int) $end->coluna,
            (int) $end->vao
        );

        return strcasecmp($codigo, $malha) === 0
            || strcasecmp($codigo, $legado) === 0;
    }
}
