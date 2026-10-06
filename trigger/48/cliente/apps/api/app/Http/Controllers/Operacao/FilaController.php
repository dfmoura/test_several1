<?php

namespace App\Http\Controllers\Operacao;

use App\Http\Controllers\Controller;
use App\Models\Auditoria;
use App\Models\Demanda;
use App\Models\Empresa;
use App\Models\Fatura;
use Illuminate\Http\Request;

class FilaController extends Controller
{
    public function __invoke(Request $request)
    {
        $status = $request->string('status')->toString();
        $consulta = Demanda::query()->with('empresa')->latest('id');
        if ($status !== '') {
            $consulta->where('status', $status);
        }

        return view('operacao.fila', [
            'demandas' => $consulta->paginate(30)->withQueryString(),
            'status' => $status,
            'abertas' => Fatura::query()->where('status', 'ABERTA')->count(),
            'ativas' => Empresa::query()->where('status', 'ATIVA')->count(),
        ]);
    }

    public function auditoria()
    {
        return view('operacao.auditoria', [
            'registros' => Auditoria::query()->latest('id')->limit(100)->get(),
        ]);
    }
}
