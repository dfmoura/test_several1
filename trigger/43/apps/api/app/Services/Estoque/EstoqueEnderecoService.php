<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Locais do almoxarifado — ADR_CADASTRO_INSUMO_VOLUME F4.
 * Gabarito 6×4×3 é o padrão da planta. Cadastro estende a mesma malha.
 * Código canônico Pxx-Cxx-Lxx; legado Pxx-Cxx-Vxx resolve no mesmo id.
 */
class EstoqueEnderecoService
{
    /**
     * Semear o gabarito e alinhar código legado.
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
                        $codigo = EstoqueEndereco::codigoDe($p, $c, $v);
                        $legado = EstoqueEndereco::codigoLegadoDe($p, $c, $v);

                        $rowNovo = EstoqueEndereco::query()
                            ->where('empresa_id', $empresa->id)
                            ->where('codigo', $codigo)
                            ->first();
                        $rowLegado = EstoqueEndereco::query()
                            ->where('empresa_id', $empresa->id)
                            ->where('codigo', $legado)
                            ->first();

                        if ($rowNovo !== null && $rowLegado !== null && $rowNovo->id !== $rowLegado->id) {
                            EstoqueLote::query()
                                ->where('empresa_id', $empresa->id)
                                ->where('endereco_id', $rowLegado->id)
                                ->update(['endereco_id' => $rowNovo->id]);
                            $rowLegado->ativo = false;
                            $rowLegado->save();
                            if (! $rowNovo->ativo) {
                                $rowNovo->ativo = true;
                                $rowNovo->save();
                            }
                            $renomeados++;
                            $existentes++;

                            continue;
                        }

                        if ($rowLegado !== null && $rowNovo === null) {
                            $rowLegado->codigo = $codigo;
                            $rowLegado->prateleira = $p;
                            $rowLegado->coluna = $c;
                            $rowLegado->vao = $v;
                            $rowLegado->ativo = true;
                            $rowLegado->save();
                            $renomeados++;

                            continue;
                        }

                        if ($rowNovo !== null) {
                            if (! $rowNovo->ativo) {
                                $rowNovo->ativo = true;
                                $rowNovo->save();
                            }
                            $existentes++;

                            continue;
                        }

                        EstoqueEndereco::query()->create([
                            'empresa_id' => $empresa->id,
                            'codigo' => $codigo,
                            'prateleira' => $p,
                            'coluna' => $c,
                            'vao' => $v,
                            'largura_m' => EstoqueEndereco::LARGURA_M,
                            'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
                            'altura_m' => EstoqueEndereco::ALTURA_M,
                            'ativo' => true,
                        ]);
                        $criados++;
                    }
                }
            }

            $alinhados = $this->alinharLegadoForaDoGabarito($empresa);
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
     * Novo local na malha Pxx-Cxx-Lxx. Sem `vao`, usa o primeiro número sem local ativo.
     * Posição inativa volta no mesmo id (etiqueta já impressa continua válida).
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

            $codigo = EstoqueEndereco::codigoDe($p, $c, $v);

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
                $row->codigo = $codigo;
                $row->ativo = true;
                $row->fill($dims);
                $row->save();

                return $row;
            }

            return EstoqueEndereco::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'prateleira' => $p,
                'coluna' => $c,
                'vao' => $v,
                'ativo' => true,
                ...$dims,
            ]);
        });
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
     * Vxx fora do gabarito vira Lxx no mesmo id. Duplicata legado+canônico funde o volume e inativa o legado.
     *
     * @return array{renomeados: int, desativados: int}
     */
    private function alinharLegadoForaDoGabarito(Empresa $empresa): array
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
            $canon = EstoqueEndereco::codigoDe($row->prateleira, $row->coluna, $row->vao);
            $legado = EstoqueEndereco::codigoLegadoDe($row->prateleira, $row->coluna, $row->vao);
            if (strcasecmp((string) $row->codigo, $legado) !== 0) {
                continue;
            }

            $rowNovo = EstoqueEndereco::query()
                ->where('empresa_id', $empresa->id)
                ->where('codigo', $canon)
                ->first();

            if ($rowNovo !== null && $rowNovo->id !== $row->id) {
                EstoqueLote::query()
                    ->where('empresa_id', $empresa->id)
                    ->where('endereco_id', $row->id)
                    ->update(['endereco_id' => $rowNovo->id]);
                $row->ativo = false;
                $row->save();
                $desativados++;

                continue;
            }

            $row->codigo = $canon;
            $row->save();
            $renomeados++;
        }

        return [
            'renomeados' => $renomeados,
            'desativados' => $desativados,
        ];
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

        $out = [];
        $ocupados = 0;
        $volumesGuardados = 0;

        foreach ($locais as $end) {
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
        return [
            'id' => $e->id,
            'codigo' => $e->codigo,
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
     * Aceita código legado Pxx-Cxx-Vxx se o registro canônico for o Lxx do mesmo slot.
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
        if (strcasecmp($end->codigo, $codigo) === 0) {
            return true;
        }

        $canon = EstoqueEndereco::codigoDe($end->prateleira, $end->coluna, $end->vao);
        $legado = EstoqueEndereco::codigoLegadoDe($end->prateleira, $end->coluna, $end->vao);

        return strcasecmp($end->codigo, $canon) === 0
            && strcasecmp($codigo, $legado) === 0;
    }
}
