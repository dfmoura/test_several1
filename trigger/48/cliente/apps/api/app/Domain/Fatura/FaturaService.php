<?php

declare(strict_types=1);

namespace App\Domain\Fatura;

use App\Domain\Auditoria\AuditoriaService;
use App\Domain\Carteira\CarteiraService;
use App\Domain\Cobranca\CobrancaService;
use App\Domain\Demanda\DemandaTransicao;
use App\Domain\Notificacao\NotificacaoService;
use App\Domain\RegraNegocio;
use App\Models\CobrancaPix;
use App\Models\Demanda;
use App\Models\Empresa;
use App\Models\Fatura;
use App\Models\MovimentoSaldo;
use App\Models\NfseDocumento;
use App\Models\Parametro;
use App\Models\Usuario;
use App\Models\Vinculo;
use Illuminate\Support\Facades\DB;

class FaturaService
{
    public function __construct(
        private CarteiraService $carteira,
        private CobrancaService $cobrancas,
        private DemandaTransicao $transicao,
        private NotificacaoService $notificacoes,
        private AuditoriaService $auditoria,
    ) {}

    public function cobertura(Demanda $demanda): int
    {
        $carteira = $this->carteira->garantir($demanda->empresa_id);

        return $this->carteira->reservaAberta($demanda->id) + (int) $carteira->disponivel_centavos;
    }

    public function tentarLiquidarDaEmpresa(int $empresaId): void
    {
        $fatura = Fatura::query()
            ->where('empresa_id', $empresaId)
            ->where('status', 'ABERTA')
            ->first();
        if ($fatura) {
            $this->liquidar($fatura);
        }
    }

    public function liquidar(Fatura $fatura): bool
    {
        return DB::transaction(function () use ($fatura) {
            $fatura = Fatura::query()->whereKey($fatura->id)->lockForUpdate()->firstOrFail();
            if ($fatura->status === 'LIQUIDADA') {
                return true;
            }

            $this->carteira->travar($fatura->empresa_id);
            $jaReserva = $this->jaMovimentado('consumo:fatura:'.$fatura->id.':reserva');
            $jaDisponivel = $this->jaMovimentado('consumo:fatura:'.$fatura->id.':disponivel');
            $restante = $fatura->valor_centavos - $jaReserva - $jaDisponivel;
            if ($restante < 0) {
                throw new RegraNegocio('A fatura já consumiu mais do que o valor aprovado.');
            }

            $reserva = $this->carteira->reservaAberta($fatura->demanda_id);
            $carteira = $this->carteira->travar($fatura->empresa_id);
            $disponivel = (int) $carteira->disponivel_centavos;
            if ($restante > 0 && ($reserva + $disponivel) < $restante) {
                return false;
            }

            $doReservado = min($reserva, $restante);
            $doDisponivel = $restante - $doReservado;
            $refs = [
                'demanda_id' => $fatura->demanda_id,
                'fatura_id' => $fatura->id,
                'ator_tipo' => 'SISTEMA',
                'observacao' => 'LIQUIDACAO',
            ];
            if ($doReservado > 0) {
                $this->carteira->movimentar(
                    $fatura->empresa_id,
                    'CONSUMO',
                    'reservado',
                    $doReservado,
                    'consumo:fatura:'.$fatura->id.':reserva',
                    $refs,
                );
            }
            if ($doDisponivel > 0) {
                $this->carteira->movimentar(
                    $fatura->empresa_id,
                    'CONSUMO',
                    'disponivel',
                    $doDisponivel,
                    'consumo:fatura:'.$fatura->id.':disponivel',
                    $refs,
                );
            }
            $sobra = $this->carteira->reservaAberta($fatura->demanda_id);
            if ($sobra > 0) {
                $this->carteira->movimentar(
                    $fatura->empresa_id,
                    'ESTORNO_RESERVA',
                    'reservado',
                    $sobra,
                    'estorno:fatura:'.$fatura->id.':sobra',
                    $refs,
                );
            }

            $fatura->abatido_reservado_centavos = $jaReserva + $doReservado;
            $fatura->abatido_disponivel_centavos = $jaDisponivel + $doDisponivel;
            $fatura->status = 'LIQUIDADA';
            $fatura->liquidada_em = now();
            $fatura->save();

            $demanda = Demanda::query()->lockForUpdate()->findOrFail($fatura->demanda_id);
            if ($demanda->status !== 'CONCLUIDA') {
                $this->transicao->ir($demanda, 'CONCLUIDA', 'SISTEMA', null, 'Fatura liquidada');
            }

            $empresa = Empresa::query()->lockForUpdate()->findOrFail($fatura->empresa_id);
            $aindaAberta = Fatura::query()
                ->where('empresa_id', $empresa->id)
                ->where('status', 'ABERTA')
                ->exists();
            if ($empresa->status === 'BLOQUEADA' && ! $aindaAberta) {
                $empresa->status = 'ATIVA';
                $empresa->motivo = null;
                $empresa->save();
            }

            $this->auditoria->registrar(
                'fatura_liquidada',
                'faturas',
                $fatura->id,
                $fatura->empresa_id,
                null,
                ['valor_centavos' => $fatura->valor_centavos],
                'SISTEMA',
                null,
            );
            $this->avisar(
                $fatura->empresa_id,
                'demanda_concluida',
                'Demanda concluída',
                'A fatura de '.$demanda->codigo.' foi liquidada. A demanda está concluída.',
            );

            return true;
        });
    }

    public function complementarSePrecisar(Fatura $fatura): ?CobrancaPix
    {
        $demanda = $fatura->demanda;
        $falta = $fatura->valor_centavos - $this->cobertura($demanda);
        if ($falta <= 0) {
            return null;
        }
        $fatura->complemento_centavos = $falta;
        $fatura->save();

        return $this->cobrancas->emitir($fatura->empresa_id, 'COMPLEMENTO_FATURA', $falta, $fatura->id);
    }

    public function cancelarComplementoAberto(Fatura $fatura): void
    {
        $pix = CobrancaPix::query()
            ->where('fatura_id', $fatura->id)
            ->where('status', 'ATIVA')
            ->first();
        if ($pix) {
            $this->cobrancas->cancelar($pix);
        }
    }

    private function jaMovimentado(string $chave): int
    {
        return (int) MovimentoSaldo::query()->where('chave_idempotencia', $chave)->value('valor_centavos');
    }

    private function avisar(int $empresaId, string $tipo, string $titulo, string $corpo): void
    {
        $vinculo = Vinculo::query()
            ->where('empresa_id', $empresaId)
            ->where('papel', 'TITULAR')
            ->where('status', 'ATIVO')
            ->first();
        if (! $vinculo) {
            return;
        }
        $usuario = Usuario::query()->find($vinculo->usuario_id);
        if ($usuario) {
            $this->notificacoes->cliente($usuario, $empresaId, $tipo, $titulo, $corpo);
        }
    }
}
