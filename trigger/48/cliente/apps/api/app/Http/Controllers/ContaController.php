<?php

namespace App\Http\Controllers;

use App\Domain\Cobranca\CobrancaService;
use App\Domain\Empresa\AtualizarReceitaEmpresa;
use App\Domain\Empresa\EmpresaAtual;
use App\Domain\Empresa\ReceitaEmpresaLeitura;
use App\Models\Parametro;
use App\Suporte\CpfProtegido;
use App\Suporte\Dinheiro;
use App\Suporte\Documento;
use Illuminate\Http\Request;

class ContaController extends Controller
{
    public function mostrar(EmpresaAtual $atual, AtualizarReceitaEmpresa $atualizar, CobrancaService $cobrancas)
    {
        $usuario = auth('web')->user();
        $cpf = CpfProtegido::ler($usuario->cpf_cifrado);
        $empresa = $atual->empresa();
        $proxima = $atualizar->proximaLiberacao($empresa);
        $pixAtivacao = null;
        if ($empresa->status === 'AGUARDA_PIX') {
            $pixAtivacao = $cobrancas->emitir(
                $empresa->id,
                'ATIVACAO',
                Parametro::inteiro('ATIVACAO_CENTAVOS'),
            );
        }

        return view('conta.mostrar', [
            'empresa' => $empresa,
            'cpfMascarado' => $cpf ? Documento::mascararCpf($cpf) : 'indisponível',
            'receita' => ReceitaEmpresaLeitura::de($empresa, $cpf),
            'podeAtualizarReceita' => $proxima === null,
            'proximaAtualizacaoReceita' => $proxima,
            'podeGerirConta' => $atual->pode('usuario.gerir'),
            'pixAtivacao' => $pixAtivacao,
        ]);
    }

    public function atualizarReceita(EmpresaAtual $atual, AtualizarReceitaEmpresa $atualizar)
    {
        $atual->exigir('usuario.gerir');
        $usuario = auth('web')->user();
        $resultado = $atualizar->atualizar($atual->empresa(), (int) $usuario->id);

        $redirect = redirect()->route('conta')->with('ok', 'Dados da Receita atualizados.');
        if ($resultado['aviso_situacao'] !== null) {
            $redirect = $redirect->with('aviso', $resultado['aviso_situacao']);
        }

        return $redirect;
    }

    public function recarga(EmpresaAtual $atual)
    {
        $atual->exigir('saldo.ver');

        return view('conta.recarga', [
            'piso' => Parametro::inteiro('ATIVACAO_CENTAVOS'),
        ]);
    }

    public function emitirRecarga(Request $request, EmpresaAtual $atual, CobrancaService $cobrancas)
    {
        $atual->exigir('saldo.ver');
        $empresaId = $atual->empresa()->id;

        $dados = $request->validate(['valor' => ['required', 'string', 'max:30']]);
        $centavos = Dinheiro::centavosDeTexto($dados['valor']);
        $piso = Parametro::inteiro('ATIVACAO_CENTAVOS');
        $minimo = Parametro::inteiro('RECARGA_MINIMA_CENTAVOS');
        if ($centavos < $minimo) {
            return back()->withInput()->with('erro', 'A recarga deve ser superior a '.Dinheiro::reais($piso).'.');
        }

        $cobranca = $cobrancas->emitir($empresaId, 'RECARGA', $centavos);

        return redirect()->route('pix.mostrar', $cobranca->txid);
    }
}
