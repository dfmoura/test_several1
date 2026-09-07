<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Semear gabarito de vãos — ADR_CADASTRO_INSUMO_VOLUME F4.
 */
class EstoqueEnderecoService
{
    /**
     * @return array{criados: int, existentes: int, total: int}
     */
    public function seedGabarito(Empresa $empresa): array
    {
        $criados = 0;
        $existentes = 0;

        DB::transaction(function () use ($empresa, &$criados, &$existentes) {
            for ($p = 1; $p <= EstoqueEndereco::PRATELEIRAS; $p++) {
                for ($c = 1; $c <= EstoqueEndereco::COLUNAS; $c++) {
                    for ($v = 1; $v <= EstoqueEndereco::VAOS; $v++) {
                        $codigo = EstoqueEndereco::codigoDe($p, $c, $v);
                        $row = EstoqueEndereco::query()->firstOrCreate(
                            [
                                'empresa_id' => $empresa->id,
                                'codigo' => $codigo,
                            ],
                            [
                                'prateleira' => $p,
                                'coluna' => $c,
                                'vao' => $v,
                                'largura_m' => EstoqueEndereco::LARGURA_M,
                                'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
                                'altura_m' => EstoqueEndereco::ALTURA_M,
                                'ativo' => true,
                            ]
                        );
                        if ($row->wasRecentlyCreated) {
                            $criados++;
                        } else {
                            $existentes++;
                        }
                    }
                }
            }
        });

        $total = EstoqueEndereco::PRATELEIRAS * EstoqueEndereco::COLUNAS * EstoqueEndereco::VAOS;

        return [
            'criados' => $criados,
            'existentes' => $existentes,
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
     */
    public function resolverPorQr(Empresa $empresa, string $payload): EstoqueEndereco
    {
        $payload = trim($payload);
        if (! preg_match('/^END:(\d+):(\d+):([A-Za-z0-9\-]+)$/', $payload, $m)) {
            throw ValidationException::withMessages([
                'endereco_qr' => ['QR de vão inválido. Esperado END:{empresa}:{id}:{codigo}.'],
            ]);
        }

        $empId = (int) $m[1];
        $endId = (int) $m[2];
        $codigo = $m[3];

        if ($empId !== (int) $empresa->id) {
            throw ValidationException::withMessages([
                'endereco_qr' => ['QR de vão de outra empresa.'],
            ]);
        }

        $end = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $endId)
            ->where('ativo', true)
            ->first();

        if ($end === null || strcasecmp($end->codigo, $codigo) !== 0) {
            throw ValidationException::withMessages([
                'endereco_qr' => ['Vão não encontrado ou QR adulterado.'],
            ]);
        }

        return $end;
    }
}
