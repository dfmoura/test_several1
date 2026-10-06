<?php

declare(strict_types=1);

namespace App\Domain\Cobranca;

use App\Domain\RegraNegocio;
use App\Models\CobrancaPix;
use App\Models\Parametro;
use Illuminate\Support\Str;

class CobrancaService
{
    public function __construct(private ProvedorPix $provedor) {}

    public function emitir(int $empresaId, string $finalidade, int $centavos, ?int $faturaId = null): CobrancaPix
    {
        if ($centavos <= 0) {
            throw new RegraNegocio('O PIX precisa ter valor positivo.');
        }

        $ativa = CobrancaPix::query()
            ->where('empresa_id', $empresaId)
            ->where('finalidade', $finalidade)
            ->where('status', 'ATIVA')
            ->when(
                $faturaId,
                fn ($q) => $q->where('fatura_id', $faturaId),
                fn ($q) => $q->whereNull('fatura_id'),
            )
            ->first();

        if ($ativa && $ativa->expira_em->isFuture()) {
            return $ativa;
        }
        if ($ativa) {
            $ativa->status = 'EXPIRADA';
            $ativa->save();
        }

        $cobranca = CobrancaPix::query()->create([
            'empresa_id' => $empresaId,
            'finalidade' => $finalidade,
            'txid' => Str::lower(Str::ulid()->toString()),
            'valor_centavos' => $centavos,
            'status' => 'CRIADA',
            'expira_em' => now()->addMinutes(Parametro::inteiro('EXPIRACAO_PIX_MINUTOS')),
            'payload_copia_cola' => '',
            'fatura_id' => $faturaId,
            'criada_em' => now(),
        ]);

        $cobranca->payload_copia_cola = $this->provedor->criar($cobranca);
        $cobranca->status = 'ATIVA';
        $cobranca->save();

        return $cobranca;
    }

    public function cancelar(CobrancaPix $cobranca): void
    {
        if ($cobranca->status !== 'ATIVA') {
            return;
        }
        $this->provedor->cancelar($cobranca);
        $cobranca->status = 'CANCELADA';
        $cobranca->save();
    }
}
