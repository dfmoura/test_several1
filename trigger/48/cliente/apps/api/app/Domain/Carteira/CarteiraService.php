<?php

declare(strict_types=1);

namespace App\Domain\Carteira;

use App\Domain\RegraNegocio;
use App\Models\Carteira;
use App\Models\MovimentoSaldo;
use Illuminate\Support\Facades\DB;

class CarteiraService
{
    public function garantir(int $empresaId): Carteira
    {
        return Carteira::query()->firstOrCreate(
            ['empresa_id' => $empresaId],
            [
                'creditado_centavos' => 0,
                'reservado_centavos' => 0,
                'consumido_centavos' => 0,
                'disponivel_centavos' => 0,
            ],
        );
    }

    public function travar(int $empresaId): Carteira
    {
        $this->garantir($empresaId);
        $carteira = Carteira::query()->where('empresa_id', $empresaId)->lockForUpdate()->first();
        if (! $carteira) {
            throw new RegraNegocio('Carteira da empresa não encontrada.');
        }

        return $carteira;
    }

    public function reservaAberta(int $demandaId): int
    {
        $reservas = (int) MovimentoSaldo::query()
            ->where('demanda_id', $demandaId)
            ->where('tipo', 'RESERVA')
            ->sum('valor_centavos');
        $estornos = (int) MovimentoSaldo::query()
            ->where('demanda_id', $demandaId)
            ->where('tipo', 'ESTORNO_RESERVA')
            ->sum('valor_centavos');
        $consumos = (int) MovimentoSaldo::query()
            ->where('demanda_id', $demandaId)
            ->where('tipo', 'CONSUMO')
            ->where('origem', 'reservado')
            ->sum('valor_centavos');

        return $reservas - $estornos - $consumos;
    }

    /**
     * @param  array<string, mixed>  $refs
     */
    public function movimentar(
        int $empresaId,
        string $tipo,
        string $origem,
        int $centavos,
        string $chave,
        array $refs = [],
    ): MovimentoSaldo {
        if ($centavos <= 0) {
            throw new RegraNegocio('O valor do movimento precisa ser positivo.');
        }

        return DB::transaction(function () use ($empresaId, $tipo, $origem, $centavos, $chave, $refs) {
            $existente = MovimentoSaldo::query()->where('chave_idempotencia', $chave)->first();
            if ($existente) {
                return $existente;
            }

            $carteira = $this->travar($empresaId);
            $antes = (int) $carteira->disponivel_centavos;
            $this->aplicar($carteira, $tipo, $origem, $centavos);
            $carteira->save();

            return MovimentoSaldo::query()->create([
                'empresa_id' => $empresaId,
                'tipo' => $tipo,
                'origem' => $origem,
                'valor_centavos' => $centavos,
                'saldo_disponivel_antes' => $antes,
                'saldo_disponivel_depois' => (int) $carteira->disponivel_centavos,
                'cobranca_id' => $refs['cobranca_id'] ?? null,
                'demanda_id' => $refs['demanda_id'] ?? null,
                'fatura_id' => $refs['fatura_id'] ?? null,
                'ator_tipo' => $refs['ator_tipo'] ?? 'SISTEMA',
                'ator_id' => $refs['ator_id'] ?? null,
                'observacao' => $refs['observacao'] ?? null,
                'chave_idempotencia' => $chave,
                'criado_em' => now(),
            ]);
        });
    }

    private function aplicar(Carteira $carteira, string $tipo, string $origem, int $centavos): void
    {
        $creditado = (int) $carteira->creditado_centavos;
        $reservado = (int) $carteira->reservado_centavos;
        $consumido = (int) $carteira->consumido_centavos;
        $disponivel = (int) $carteira->disponivel_centavos;

        switch ($tipo) {
            case 'CREDITO_PIX':
            case 'CREDITO_COMPLEMENTO':
                $creditado += $centavos;
                $disponivel += $centavos;
                break;
            case 'RESERVA':
                if ($disponivel < $centavos) {
                    throw new RegraNegocio('Saldo disponível insuficiente para esta reserva.');
                }
                $reservado += $centavos;
                $disponivel -= $centavos;
                break;
            case 'ESTORNO_RESERVA':
                if ($reservado < $centavos) {
                    throw new RegraNegocio('Não há reserva suficiente para devolver.');
                }
                $reservado -= $centavos;
                $disponivel += $centavos;
                break;
            case 'CONSUMO':
                if ($origem === 'reservado') {
                    if ($reservado < $centavos) {
                        throw new RegraNegocio('Não há reserva suficiente para consumir.');
                    }
                    $reservado -= $centavos;
                    $consumido += $centavos;
                } elseif ($origem === 'disponivel') {
                    if ($disponivel < $centavos) {
                        throw new RegraNegocio('Saldo disponível insuficiente para consumir.');
                    }
                    $disponivel -= $centavos;
                    $consumido += $centavos;
                } else {
                    throw new RegraNegocio('Origem do consumo inválida.');
                }
                break;
            case 'ESTORNO_CONSUMO':
                if ($consumido < $centavos) {
                    throw new RegraNegocio('Não há consumo suficiente para estornar.');
                }
                $consumido -= $centavos;
                $disponivel += $centavos;
                break;
            case 'AJUSTE':
                if ($origem === 'credito') {
                    $creditado += $centavos;
                    $disponivel += $centavos;
                } elseif ($origem === 'debito') {
                    if ($disponivel < $centavos) {
                        throw new RegraNegocio('Saldo disponível insuficiente para o ajuste.');
                    }
                    $creditado -= $centavos;
                    $disponivel -= $centavos;
                } else {
                    throw new RegraNegocio('Ajuste sem direção.');
                }
                break;
            default:
                throw new RegraNegocio('Tipo de movimento desconhecido.');
        }

        if ($disponivel !== $creditado - $reservado - $consumido) {
            throw new RegraNegocio('O saldo disponível ficou inconsistente com o livro.');
        }

        $carteira->creditado_centavos = $creditado;
        $carteira->reservado_centavos = $reservado;
        $carteira->consumido_centavos = $consumido;
        $carteira->disponivel_centavos = $disponivel;
    }
}
