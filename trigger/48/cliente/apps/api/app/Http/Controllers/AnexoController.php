<?php

namespace App\Http\Controllers;

use App\Domain\Empresa\EmpresaAtual;
use App\Models\Demanda;
use App\Models\DemandaAnexo;
use Illuminate\Support\Facades\Storage;

class AnexoController extends Controller
{
    public function baixar(Demanda $demanda, DemandaAnexo $anexo, EmpresaAtual $atual)
    {
        abort_unless($anexo->demanda_id === $demanda->id, 404);
        abort_unless($demanda->empresa_id === $atual->empresa()->id, 404);
        if ($anexo->pacote && optional($demanda->fatura)->status !== 'LIQUIDADA') {
            abort(403, 'O pacote libera quando a fatura estiver liquidada.');
        }

        return Storage::disk('anexos')->download($anexo->caminho_interno, $anexo->nome_original);
    }
}
