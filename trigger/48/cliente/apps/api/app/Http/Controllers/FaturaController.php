<?php

namespace App\Http\Controllers;

use App\Domain\Empresa\EmpresaAtual;
use App\Models\Fatura;
use Barryvdh\DomPDF\Facade\Pdf;

class FaturaController extends Controller
{
    public function pdf(Fatura $fatura, EmpresaAtual $atual)
    {
        abort_unless($fatura->empresa_id === $atual->empresa()->id, 404);
        $fatura->load(['demanda', 'proposta', 'empresa']);

        return Pdf::loadView('pdf.fatura', ['fatura' => $fatura])->download($fatura->demanda->codigo.'-fatura.pdf');
    }
}
