<?php

namespace App\Http\Controllers;

use App\Domain\Empresa\CadastroService;
use App\Domain\Empresa\DadosReceita;
use App\Suporte\Documento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CadastroController extends Controller
{
    public function cnpj()
    {
        return view('cadastro.cnpj');
    }

    public function consultar(Request $request, CadastroService $cadastro)
    {
        $request->validate(['cnpj' => ['required', 'string', 'max:18']]);
        $dados = $cadastro->consultar($request->string('cnpj')->toString());
        $request->session()->put('cadastro_cnpj', [
            'cnpj' => $dados->cnpj,
            'razao_social' => $dados->razaoSocial,
            'nome_fantasia' => $dados->nomeFantasia,
            'situacao' => $dados->situacao,
            'ativa' => $dados->ativa,
            'bruto' => $dados->bruto,
        ]);

        return redirect()->route('cadastro.responsavel');
    }

    public function responsavel(Request $request)
    {
        $dados = $request->session()->get('cadastro_cnpj');
        if (! is_array($dados)) {
            return redirect()->route('cadastro.cnpj');
        }

        return view('cadastro.responsavel', ['receita' => $dados]);
    }

    public function concluir(Request $request, CadastroService $cadastro)
    {
        $bruto = $request->session()->get('cadastro_cnpj');
        if (! is_array($bruto)) {
            return redirect()->route('cadastro.cnpj');
        }
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:160'],
            'cpf' => ['required', 'string', 'max:14'],
            'email' => ['required', 'email', 'max:160'],
            'telefone' => ['required', 'string', 'max:20'],
            'senha' => ['required', 'string', 'min:10', 'confirmed'],
            'responsavel_legal' => ['accepted'],
            'aceite_termos' => ['accepted'],
        ]);
        $telefone = Documento::soDigitos($dados['telefone']);
        if (strlen($telefone) < 10) {
            return back()->withInput()->with('erro', 'Informe um telefone com DDD.');
        }
        $receita = new DadosReceita(
            $bruto['cnpj'],
            $bruto['razao_social'],
            $bruto['nome_fantasia'],
            $bruto['situacao'],
            (bool) $bruto['ativa'],
            $bruto['bruto'],
        );
        $resultado = $cadastro->concluir($receita, [
            'nome' => $dados['nome'],
            'cpf' => Documento::soDigitos($dados['cpf']),
            'email' => $dados['email'],
            'telefone' => $telefone,
            'senha' => $dados['senha'],
        ], (string) $request->ip());

        Auth::guard('web')->login($resultado['usuario']);
        $request->session()->regenerate();
        $request->session()->forget('cadastro_cnpj');
        $request->session()->put('empresa_id', $resultado['empresa']->id);
        $request->session()->put('papel', 'TITULAR');
        $request->session()->put('autenticado_em_web', now()->timestamp);

        return redirect()->route('pix.mostrar', $resultado['cobranca']->txid);
    }
}
