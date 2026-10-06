<?php

declare(strict_types=1);

namespace App\Domain\Rotina;

use App\Domain\Cobranca\BaixaPix;
use App\Domain\Cobranca\ProvedorPix;
use App\Domain\Demanda\DemandaService;
use App\Domain\Fatura\FaturaService;
use App\Models\CobrancaPix;
use App\Models\Demanda;
use App\Models\Empresa;
use App\Models\Fatura;
use App\Models\Parametro;
use App\Models\Proposta;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RotinaDiaria
{
    public function __construct(
        private ProvedorPix $provedor,
        private BaixaPix $baixa,
        private DemandaService $demandas,
        private FaturaService $faturas,
    ) {}

    public function executar(): void
    {
        $this->expirarPix();
        $this->expirarPropostas();
        $this->expirarContas();
        $this->bloquearAtraso();
        $this->conciliarPix();
        $this->tentarLiquidarAbertas();
    }

    private function expirarPix(): void
    {
        CobrancaPix::query()
            ->where('status', 'ATIVA')
            ->where('expira_em', '<', now())
            ->each(function (CobrancaPix $cobranca) {
                $cobranca->status = 'EXPIRADA';
                $cobranca->save();
            });
    }

    private function expirarPropostas(): void
    {
        $ids = Proposta::query()
            ->where('status', 'VIGENTE')
            ->where('valida_ate', '<', now())
            ->pluck('demanda_id');
        Demanda::query()->whereIn('id', $ids)->each(fn (Demanda $demanda) => $this->demandas->expirar($demanda));
    }

    private function expirarContas(): void
    {
        $limite = now()->subDays(Parametro::inteiro('RASCUNHO_CONTA_DIAS'));
        Empresa::query()
            ->where('status', 'AGUARDA_PIX')
            ->where('criada_em', '<', $limite)
            ->each(function (Empresa $empresa) {
                if (CobrancaPix::query()->where('empresa_id', $empresa->id)->where('status', 'PAGA')->exists()) {
                    return;
                }
                $empresa->status = 'EXPIRADA';
                $empresa->motivo = 'Cadastro sem pagamento';
                $empresa->save();
                $empresa->vinculos()->update(['status' => 'BLOQUEADO']);
                Usuario::query()
                    ->whereIn('id', $empresa->vinculos()->pluck('usuario_id'))
                    ->each(function (Usuario $usuario) {
                        $usuario->email = 'expirado-'.$usuario->id.'@contas.invalid';
                        $usuario->cpf_cifrado = null;
                        $usuario->cpf_hash = null;
                        $usuario->nome = 'Cadastro expirado';
                        $usuario->telefone = '0000000000';
                        $usuario->senha_hash = Hash::make(Str::random(40));
                        $usuario->save();
                    });
            });
    }

    private function bloquearAtraso(): void
    {
        $limite = now()->subDays(Parametro::inteiro('DIAS_PARA_BLOQUEIO'));
        $empresas = Fatura::query()
            ->where('status', 'ABERTA')
            ->where('criada_em', '<=', $limite)
            ->pluck('empresa_id')
            ->unique();
        Empresa::query()
            ->whereIn('id', $empresas)
            ->where('status', 'ATIVA')
            ->each(function (Empresa $empresa) {
                $empresa->status = 'BLOQUEADA';
                $empresa->motivo = 'PIX complementar em atraso';
                $empresa->save();
            });
    }

    private function conciliarPix(): void
    {
        CobrancaPix::query()->where('status', 'ATIVA')->each(function (CobrancaPix $cobranca) {
            $resultado = $this->provedor->consultar($cobranca);
            if ($resultado->status === 'PAGA' && $resultado->endToEndId && $resultado->valorCentavos) {
                $this->baixa->confirmar($cobranca->txid, $resultado->endToEndId, $resultado->valorCentavos);
            }
        });
    }

    private function tentarLiquidarAbertas(): void
    {
        Fatura::query()->where('status', 'ABERTA')->each(function (Fatura $fatura) {
            $demanda = $fatura->demanda;
            if (! $demanda) {
                return;
            }
            if ($this->faturas->cobertura($demanda) < $fatura->valor_centavos) {
                return;
            }
            $this->faturas->cancelarComplementoAberto($fatura);
            $this->faturas->liquidar($fatura);
        });
    }
}
