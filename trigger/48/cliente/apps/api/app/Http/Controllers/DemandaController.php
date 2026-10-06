<?php

namespace App\Http\Controllers;

use App\Domain\Anexos\AnexosService;
use App\Domain\Carteira\CarteiraService;
use App\Domain\Demanda\DemandaService;
use App\Domain\Empresa\EmpresaAtual;
use App\Domain\Fatura\FaturaService;
use App\Models\CobrancaPix;
use App\Models\Demanda;
use App\Models\Marco;
use App\Models\Mensagem;
use App\Models\Proposta;
use App\Suporte\Dinheiro;
use App\Suporte\Rotulos;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DemandaController extends Controller
{
    public function index(EmpresaAtual $atual)
    {
        $empresa = $atual->empresa();

        return view('demandas.index', [
            'demandas' => Demanda::query()->where('empresa_id', $empresa->id)->latest('id')->paginate(20),
        ]);
    }

    public function criar()
    {
        return view('demandas.criar', ['demanda' => null]);
    }

    public function salvar(Request $request, EmpresaAtual $atual, DemandaService $demandas, AnexosService $anexos)
    {
        $atual->exigir('demanda.abrir');
        $dados = $this->validar($request);
        $demanda = $demandas->abrir(
            $atual->empresa(),
            $request->user('web'),
            $dados,
            $request->boolean('rascunho'),
        );
        $this->anexar($request, $demanda, $anexos);

        return redirect()->route('demandas.mostrar', $demanda->codigo)
            ->with('ok', $demanda->status === 'RASCUNHO' ? 'Rascunho salvo.' : 'Demanda enviada. Reservamos o ticket de abertura.');
    }

    public function mostrar(Demanda $demanda, CarteiraService $carteira, FaturaService $faturas)
    {
        $demanda->load(['propostas', 'fatura', 'apresentacao', 'anexos', 'marcos']);
        $mensagens = Mensagem::query()
            ->where('demanda_id', $demanda->id)
            ->where('visibilidade', 'CLIENTE')
            ->orderBy('criada_em')
            ->get();
        $vigente = $demanda->propostas->firstWhere('status', 'VIGENTE');
        $aprovada = $demanda->propostas->firstWhere('status', 'APROVADA');
        $reserva = $carteira->reservaAberta($demanda->id);
        $disponivel = (int) $demanda->empresa->carteira->disponivel_centavos;
        $pix = null;
        if ($demanda->fatura && $demanda->fatura->status === 'ABERTA') {
            $pix = CobrancaPix::query()
                ->where('fatura_id', $demanda->fatura->id)
                ->where('status', 'ATIVA')
                ->first();
        }

        return view('demandas.mostrar', [
            'demanda' => $demanda,
            'mensagens' => $mensagens,
            'vigente' => $vigente,
            'aprovada' => $aprovada,
            'reserva' => $reserva,
            'disponivel' => $disponivel,
            'falta' => $vigente ? max(0, $vigente->valor_centavos - $reserva - $disponivel) : 0,
            'pix' => $pix,
            'eventos' => $demanda->eventos()->orderBy('em')->get(),
            'marcos' => Marco::query()->where('demanda_id', $demanda->id)->where('visivel_ao_cliente', true)->orderBy('criado_em')->get(),
        ]);
    }

    public function enviar(Demanda $demanda, DemandaService $demandas)
    {
        $demandas->enviarRascunho($demanda, auth('web')->user());

        return back()->with('ok', 'Demanda enviada. Reservamos o ticket de abertura.');
    }

    public function descartar(Demanda $demanda, DemandaService $demandas)
    {
        $demandas->descartarRascunho($demanda, auth('web')->user());

        return redirect()->route('demandas.index')->with('ok', 'Rascunho descartado.');
    }

    public function mensagem(Request $request, Demanda $demanda, AnexosService $anexos)
    {
        $dados = $request->validate([
            'corpo' => ['required', 'string', 'max:4000'],
            'anexo' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp,txt,zip', 'max:10240'],
        ]);
        $mensagem = Mensagem::query()->create([
            'demanda_id' => $demanda->id,
            'autor_tipo' => 'CLIENTE',
            'autor_id' => auth('web')->id(),
            'visibilidade' => 'CLIENTE',
            'corpo' => $dados['corpo'],
            'criada_em' => now(),
        ]);
        if ($request->file('anexo')) {
            $anexos->guardar($demanda, $request->file('anexo'), false, $mensagem->id);
        }
        $demanda->aguardando_cliente = false;
        $demanda->save();

        return back()->with('ok', 'Mensagem enviada.');
    }

    public function aprovar(Request $request, Demanda $demanda, DemandaService $demandas, EmpresaAtual $atual)
    {
        $atual->exigir('demanda.aprovar');
        $request->validate(['confirmar_valor' => ['required', 'string', 'max:30']]);
        $proposta = Proposta::query()->where('demanda_id', $demanda->id)->where('status', 'VIGENTE')->firstOrFail();
        if (Dinheiro::centavosDeTexto($request->string('confirmar_valor')->toString()) !== $proposta->valor_centavos) {
            return back()->with('erro', 'Digite o valor da proposta para confirmar a aprovação.');
        }
        $demandas->aprovar($demanda, $request->user('web'), (string) $request->ip());

        return back()->with('ok', 'Proposta aprovada. A execução pode começar. O valor será liquidado na entrega.');
    }

    public function recusar(Request $request, Demanda $demanda, DemandaService $demandas, EmpresaAtual $atual)
    {
        $atual->exigir('demanda.aprovar');
        $dados = $request->validate(['motivo' => ['required', 'string', 'min:10', 'max:1000']]);
        $demandas->recusarCliente($demanda, $request->user('web'), $dados['motivo']);

        return redirect()->route('demandas.mostrar', $demanda->codigo)->with('ok', 'Proposta recusada.');
    }

    private function validar(Request $request): array
    {
        $dados = $request->validate([
            'titulo' => ['required', 'string', 'max:160'],
            'descricao' => ['required', 'string', 'max:5000'],
            'objetivo' => ['required', 'string', 'max:2000'],
            'sistema_atual' => ['required', 'string', 'max:200'],
            'tipo' => ['required', Rule::in(array_keys(Rotulos::TIPOS_DEMANDA))],
            'prioridade' => ['required', Rule::in(array_keys(Rotulos::PRIORIDADES))],
            'prazo_desejado' => ['nullable', 'date'],
            'contato_tecnico' => ['required', 'string', 'max:160'],
            'observacoes' => ['nullable', 'string', 'max:2000'],
            'anexos' => ['nullable', 'array', 'max:5'],
            'anexos.*' => ['file', 'mimes:pdf,png,jpg,jpeg,webp,txt,zip', 'max:10240'],
        ]);
        unset($dados['anexos']);

        return $dados;
    }

    private function anexar(Request $request, Demanda $demanda, AnexosService $anexos): void
    {
        foreach ($request->file('anexos', []) as $arquivo) {
            $anexos->guardar($demanda, $arquivo);
        }
    }
}
