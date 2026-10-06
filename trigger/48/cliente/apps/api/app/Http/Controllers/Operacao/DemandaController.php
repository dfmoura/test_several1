<?php

namespace App\Http\Controllers\Operacao;

use App\Domain\Anexos\AnexosService;
use App\Domain\Carteira\CarteiraService;
use App\Domain\Demanda\DemandaService;
use App\Http\Controllers\Controller;
use App\Models\CobrancaPix;
use App\Models\Demanda;
use App\Models\Marco;
use App\Models\Mensagem;
use App\Models\MovimentoSaldo;
use App\Suporte\Dinheiro;
use Illuminate\Http\Request;

class DemandaController extends Controller
{
    public function mostrar(Demanda $demanda, CarteiraService $carteira)
    {
        $demanda->load(['empresa.carteira', 'propostas', 'fatura', 'apresentacao', 'anexos', 'marcos', 'eventos']);

        return view('operacao.demanda', [
            'demanda' => $demanda,
            'mensagens' => Mensagem::query()->where('demanda_id', $demanda->id)->orderBy('criada_em')->get(),
            'reserva' => $carteira->reservaAberta($demanda->id),
            'movimentos' => MovimentoSaldo::query()->where('demanda_id', $demanda->id)->latest('id')->get(),
            'pix' => $demanda->fatura
                ? CobrancaPix::query()->where('fatura_id', $demanda->fatura->id)->latest('id')->get()
                : collect(),
        ]);
    }

    public function mensagem(Request $request, Demanda $demanda, AnexosService $anexos)
    {
        $dados = $request->validate([
            'corpo' => ['required', 'string', 'max:4000'],
            'interna' => ['nullable', 'boolean'],
            'aguardar' => ['nullable', 'boolean'],
            'anexo' => ['nullable', 'file', 'mimes:pdf,png,jpg,jpeg,webp,txt,zip', 'max:10240'],
        ]);
        $interna = $request->boolean('interna');
        $mensagem = Mensagem::query()->create([
            'demanda_id' => $demanda->id,
            'autor_tipo' => 'TRIGGER',
            'autor_id' => auth('operacao')->id(),
            'visibilidade' => $interna ? 'INTERNA' : 'CLIENTE',
            'corpo' => $dados['corpo'],
            'criada_em' => now(),
        ]);
        if ($request->file('anexo')) {
            $anexos->guardar($demanda, $request->file('anexo'), false, $mensagem->id);
        }
        if (! $interna && $request->boolean('aguardar')) {
            $demanda->aguardando_cliente = true;
            $demanda->save();
        }

        return back()->with('ok', $interna ? 'Nota interna registrada.' : 'Mensagem enviada ao cliente.');
    }

    public function propor(Request $request, Demanda $demanda, DemandaService $demandas)
    {
        $dados = $request->validate([
            'objetivo' => ['required', 'string', 'max:4000'],
            'contexto' => ['required', 'string', 'max:4000'],
            'descricao_funcional' => ['required', 'string', 'max:8000'],
            'requisitos' => ['required', 'string', 'max:8000'],
            'criterios_aceite' => ['required', 'string', 'max:4000'],
            'premissas' => ['required', 'string', 'max:4000'],
            'restricoes' => ['required', 'string', 'max:4000'],
            'incluso' => ['required', 'string', 'max:4000'],
            'nao_incluso' => ['required', 'string', 'max:4000'],
            'prazo_dias_uteis' => ['required', 'integer', 'min:1', 'max:365'],
            'horas_estimadas' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'valor' => ['required', 'string', 'max:30'],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ]);
        $demandas->propor($demanda, (int) auth('operacao')->id(), [
            'objetivo' => $dados['objetivo'],
            'contexto' => $dados['contexto'],
            'descricao_funcional' => $dados['descricao_funcional'],
            'requisitos' => $dados['requisitos'],
            'criterios_aceite' => $dados['criterios_aceite'],
            'premissas' => $dados['premissas'],
            'restricoes' => $dados['restricoes'],
            'incluso' => $dados['incluso'],
            'nao_incluso' => $dados['nao_incluso'],
            'prazo_dias_uteis' => $dados['prazo_dias_uteis'],
            'horas_estimadas' => $dados['horas_estimadas'] ?? null,
            'valor_centavos' => Dinheiro::centavosDeTexto($dados['valor']),
            'observacao' => $dados['observacao'] ?? null,
        ]);

        return back()->with('ok', 'Proposta enviada ao cliente.');
    }

    public function recusar(Request $request, Demanda $demanda, DemandaService $demandas)
    {
        $dados = $request->validate(['motivo' => ['required', 'string', 'min:10', 'max:1000']]);
        $demandas->recusarTrigger($demanda, (int) auth('operacao')->id(), $dados['motivo']);

        return back()->with('ok', 'Demanda recusada e reserva devolvida.');
    }

    public function executar(Demanda $demanda, DemandaService $demandas)
    {
        $demandas->iniciarExecucao($demanda, (int) auth('operacao')->id());

        return back()->with('ok', 'Execução iniciada.');
    }

    public function marco(Request $request, Demanda $demanda)
    {
        $dados = $request->validate([
            'texto' => ['required', 'string', 'max:1000'],
            'visivel' => ['nullable', 'boolean'],
        ]);
        Marco::query()->create([
            'demanda_id' => $demanda->id,
            'texto' => $dados['texto'],
            'visivel_ao_cliente' => $request->boolean('visivel'),
            'criado_por' => auth('operacao')->id(),
            'criado_em' => now(),
        ]);

        return back()->with('ok', 'Marco registrado.');
    }

    public function apresentar(Request $request, Demanda $demanda, DemandaService $demandas, AnexosService $anexos)
    {
        $dados = $request->validate([
            'resumo' => ['required', 'string', 'max:5000'],
            'pacote' => ['nullable', 'array', 'max:5'],
            'pacote.*' => ['file', 'mimes:pdf,png,jpg,jpeg,webp,txt,zip', 'max:10240'],
        ]);
        $demandas->apresentar($demanda, (int) auth('operacao')->id(), $dados['resumo']);
        foreach ($request->file('pacote', []) as $arquivo) {
            $anexos->guardar($demanda, $arquivo, true);
        }

        return back()->with('ok', 'Entrega apresentada e fatura gerada.');
    }

    public function cancelar(Request $request, Demanda $demanda, DemandaService $demandas)
    {
        $dados = $request->validate([
            'motivo' => ['required', 'string', 'min:10', 'max:1000'],
            'consumir' => ['required', 'in:devolver,consumir'],
        ]);
        $demandas->cancelarDepoisDaAprovacao(
            $demanda,
            (int) auth('operacao')->id(),
            $dados['motivo'],
            $dados['consumir'] === 'consumir',
        );

        return back()->with('ok', 'Demanda cancelada.');
    }
}
