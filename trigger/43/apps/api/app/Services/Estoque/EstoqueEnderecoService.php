<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Semear gabarito de locais — ADR_CADASTRO_INSUMO_VOLUME F4.
 * Código canônico Pxx-Cxx-Lxx; migra legado Pxx-Cxx-Vxx sem duplicar slot.
 */
class EstoqueEnderecoService
{
    /**
     * Semear e alinhar gabarito (cria/renomeia L01–L{VAOS}; desativa slot > VAOS).
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

            $desativados = EstoqueEndereco::query()
                ->where('empresa_id', $empresa->id)
                ->where('vao', '>', EstoqueEndereco::VAOS)
                ->where('ativo', true)
                ->update(['ativo' => false]);
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
