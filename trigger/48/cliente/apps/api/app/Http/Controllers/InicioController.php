<?php

namespace App\Http\Controllers;

use App\Domain\Empresa\EmpresaAtual;
use App\Models\Demanda;
use App\Models\MovimentoSaldo;
use App\Models\Notificacao;
use App\Models\Parametro;

class InicioController extends Controller
{
    public function __invoke(EmpresaAtual $atual)
    {
        $empresa = $atual->empresa();
        $carteira = $empresa->carteira;
        $demanda = Demanda::query()
            ->where('empresa_id', $empresa->id)
            ->whereNotIn('status', Demanda::TERMINAIS)
            ->latest('id')
            ->first();
        $ticket = Parametro::inteiro('TICKET_ABERTURA');
        $motivo = null;
        if ($empresa->status !== 'ATIVA') {
            $motivo = match ($empresa->status) {
                'AGUARDA_PIX' => 'Falta o PIX de ativação.',
                'BLOQUEADA' => 'Conta bloqueada por liquidação em atraso.',
                default => 'A conta não está ativa.',
            };
        } elseif ($demanda) {
            $motivo = 'Há uma demanda em andamento.';
        } elseif ((int) $carteira->disponivel_centavos < $ticket) {
            $motivo = 'Falta saldo para abrir uma demanda.';
        }

        return view('inicio', [
            'empresa' => $empresa,
            'carteira' => $carteira,
            'demanda' => $demanda,
            'motivoNova' => $motivo,
            'movimentos' => MovimentoSaldo::query()->where('empresa_id', $empresa->id)->latest('id')->limit(5)->get(),
            'avisos' => Notificacao::query()
                ->where('destinatario_tipo', 'CLIENTE')
                ->where('destinatario_id', auth('web')->id())
                ->latest('id')
                ->limit(5)
                ->get(),
            'saldoMinimo' => Parametro::inteiro('SALDO_MINIMO_CENTAVOS'),
        ]);
    }

    public function lerAvisos()
    {
        Notificacao::query()
            ->where('destinatario_tipo', 'CLIENTE')
            ->where('destinatario_id', auth('web')->id())
            ->whereNull('lida_em')
            ->update(['lida_em' => now()]);

        return back();
    }
}
