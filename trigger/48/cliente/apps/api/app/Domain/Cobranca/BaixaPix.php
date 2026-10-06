<?php

declare(strict_types=1);

namespace App\Domain\Cobranca;

use App\Domain\Auditoria\AuditoriaService;
use App\Domain\Carteira\CarteiraService;
use App\Domain\Fatura\FaturaService;
use App\Domain\Notificacao\NotificacaoService;
use App\Domain\RegraNegocio;
use App\Models\CobrancaPix;
use App\Models\Empresa;
use App\Models\Usuario;
use App\Models\Vinculo;
use Illuminate\Support\Facades\DB;

class BaixaPix
{
    public function __construct(
        private CarteiraService $carteira,
        private AuditoriaService $auditoria,
        private NotificacaoService $notificacoes,
        private FaturaService $faturas,
    ) {}

    public function confirmar(string $txid, string $endToEndId, int $valorCentavos): CobrancaPix
    {
        return DB::transaction(function () use ($txid, $endToEndId, $valorCentavos) {
            $cobranca = CobrancaPix::query()->where('txid', $txid)->lockForUpdate()->first();
            if (! $cobranca) {
                throw new RegraNegocio('Cobrança PIX não encontrada.');
            }
            if ($cobranca->status === 'PAGA') {
                return $cobranca;
            }
            if ($cobranca->valor_centavos !== $valorCentavos) {
                $this->auditoria->registrar(
                    'pix_valor_divergente',
                    'cobrancas_pix',
                    $cobranca->id,
                    $cobranca->empresa_id,
                    null,
                    ['esperado' => $cobranca->valor_centavos, 'recebido' => $valorCentavos],
                    'SISTEMA',
                    null,
                );
                throw new RegraNegocio('O valor pago não confere com a cobrança.');
            }

            $cobranca->status = 'PAGA';
            $cobranca->end_to_end_id = $endToEndId;
            $cobranca->save();

            $tipo = $cobranca->finalidade === 'COMPLEMENTO_FATURA' ? 'CREDITO_COMPLEMENTO' : 'CREDITO_PIX';
            $this->carteira->movimentar(
                $cobranca->empresa_id,
                $tipo,
                'credito',
                $cobranca->valor_centavos,
                'pix:'.$cobranca->txid.':'.$endToEndId,
                [
                    'cobranca_id' => $cobranca->id,
                    'fatura_id' => $cobranca->fatura_id,
                    'observacao' => $cobranca->finalidade,
                    'ator_tipo' => 'SISTEMA',
                ],
            );

            $empresa = Empresa::query()->lockForUpdate()->findOrFail($cobranca->empresa_id);
            if ($cobranca->finalidade === 'ATIVACAO' && $empresa->status === 'AGUARDA_PIX') {
                $empresa->status = 'ATIVA';
                $empresa->save();
                $this->avisarTitular($empresa, 'conta_ativada', 'Conta ativada', 'O PIX de ativação foi confirmado. A empresa já pode abrir uma demanda.');
            }

            $this->auditoria->registrar(
                'pix_confirmado',
                'cobrancas_pix',
                $cobranca->id,
                $cobranca->empresa_id,
                null,
                ['finalidade' => $cobranca->finalidade, 'valor_centavos' => $cobranca->valor_centavos],
                'SISTEMA',
                null,
            );

            if ($cobranca->fatura_id) {
                $fatura = $cobranca->fatura()->lockForUpdate()->first();
                if ($fatura && $fatura->status === 'ABERTA') {
                    $this->faturas->liquidar($fatura);
                }
            } else {
                $this->faturas->tentarLiquidarDaEmpresa($cobranca->empresa_id);
            }

            return $cobranca;
        });
    }

    private function avisarTitular(Empresa $empresa, string $tipo, string $titulo, string $corpo): void
    {
        $vinculo = Vinculo::query()
            ->where('empresa_id', $empresa->id)
            ->where('papel', 'TITULAR')
            ->where('status', 'ATIVO')
            ->first();
        if (! $vinculo) {
            return;
        }
        $usuario = Usuario::query()->find($vinculo->usuario_id);
        if ($usuario) {
            $this->notificacoes->cliente($usuario, $empresa->id, $tipo, $titulo, $corpo);
        }
    }
}
