<?php

namespace App\Http\Controllers\Operacao;

use App\Domain\Auditoria\AuditoriaService;
use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\MovimentoSaldo;
use Illuminate\Http\Request;

class EmpresaController extends Controller
{
    public function index()
    {
        return view('operacao.empresas', [
            'empresas' => Empresa::query()->with('carteira')->latest('id')->paginate(30),
        ]);
    }

    public function mostrar(Empresa $empresa)
    {
        return view('operacao.empresa', [
            'empresa' => $empresa->load('carteira'),
            'movimentos' => MovimentoSaldo::query()->where('empresa_id', $empresa->id)->latest('id')->limit(20)->get(),
        ]);
    }

    public function bloquear(Request $request, Empresa $empresa, AuditoriaService $auditoria)
    {
        $dados = $request->validate(['motivo' => ['required', 'string', 'min:5', 'max:500']]);
        $antes = $empresa->status;
        $empresa->status = 'BLOQUEADA';
        $empresa->motivo = $dados['motivo'];
        $empresa->save();
        $auditoria->registrar('empresa_bloqueada', 'empresas', $empresa->id, $empresa->id, ['status' => $antes], ['status' => 'BLOQUEADA'], 'TRIGGER', auth('operacao')->id());

        return back()->with('ok', 'Empresa bloqueada.');
    }

    public function reativar(Empresa $empresa, AuditoriaService $auditoria)
    {
        if ($empresa->status !== 'BLOQUEADA') {
            return back()->with('erro', 'Só uma conta bloqueada pode ser reativada por aqui.');
        }
        $empresa->status = 'ATIVA';
        $empresa->motivo = null;
        $empresa->save();
        $auditoria->registrar('empresa_reativada', 'empresas', $empresa->id, $empresa->id, null, ['status' => 'ATIVA'], 'TRIGGER', auth('operacao')->id());

        return back()->with('ok', 'Empresa reativada.');
    }

    public function cancelar(Request $request, Empresa $empresa, AuditoriaService $auditoria)
    {
        $dados = $request->validate(['motivo' => ['required', 'string', 'min:10', 'max:500']]);
        $antes = $empresa->status;
        $empresa->status = 'CANCELADA';
        $empresa->motivo = $dados['motivo'];
        $empresa->save();
        $auditoria->registrar('empresa_cancelada', 'empresas', $empresa->id, $empresa->id, ['status' => $antes], ['status' => 'CANCELADA'], 'TRIGGER', auth('operacao')->id());

        return back()->with('ok', 'Empresa cancelada. O livro de saldo permanece.');
    }
}
