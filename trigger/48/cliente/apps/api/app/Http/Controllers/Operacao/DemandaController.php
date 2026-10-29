<?php

namespace App\Http\Controllers\Operacao;

use App\Domain\Anexos\AnexosService;
use App\Domain\Carteira\CarteiraService;
use App\Domain\Demanda\AssistenciaClient;
use App\Domain\Demanda\DemandaService;
use App\Domain\Demanda\PropostaEtapas;
use App\Domain\Demanda\PropostaRascunho;
use App\Domain\RegraNegocio;
use App\Http\Controllers\Controller;
use App\Models\CobrancaPix;
use App\Models\Demanda;
use App\Models\Marco;
use App\Models\Mensagem;
use App\Models\MovimentoSaldo;
use App\Suporte\Dinheiro;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class DemandaController extends Controller
{
    public function mostrar(Demanda $demanda, CarteiraService $carteira, AssistenciaClient $assistencia)
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
            'rascunho' => PropostaRascunho::para($demanda, request()),
            'assistenciaAtiva' => $assistencia->ativa(),
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
            'descricao_funcional' => ['required', 'string', 'max:8000'],
            'incluso' => ['required', 'string', 'max:4000'],
            'nao_incluso' => ['required', 'string', 'max:4000'],
            'criterios_aceite' => ['required', 'string', 'max:4000'],
            'prazo_dias_uteis' => ['required', 'integer', 'min:1', 'max:365'],
            'valor' => ['required', 'string', 'max:30'],
            'etapas' => ['nullable', 'array', 'max:'.PropostaEtapas::MAXIMO],
            'etapas.*.titulo' => ['nullable', 'string', 'max:160'],
            'etapas.*.resultado' => ['nullable', 'string', 'max:800'],
            'etapas.*.aceite' => ['nullable', 'string', 'max:800'],
            'objetivo' => ['nullable', 'string', 'max:4000'],
            'contexto' => ['nullable', 'string', 'max:4000'],
            'requisitos' => ['nullable', 'string', 'max:8000'],
            'premissas' => ['nullable', 'string', 'max:4000'],
            'restricoes' => ['nullable', 'string', 'max:4000'],
            'horas_estimadas' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ]);
        $demandas->propor($demanda, (int) auth('operacao')->id(), PropostaRascunho::completar($demanda, [
            ...$dados,
            'valor_centavos' => Dinheiro::centavosDeTexto($dados['valor']),
        ]));

        return back()->with('ok', 'Proposta enviada ao cliente.');
    }

    public function desdobrar(Demanda $demanda, AssistenciaClient $client): JsonResponse
    {
        if (! in_array($demanda->status, ['EM_ANALISE', 'PROPOSTA_ENVIADA'], true)) {
            return response()->json(['erro' => 'Esta demanda não aceita desdobramento agora.'], 422);
        }
        $chave = 'assistencia:desdobrar:'.(string) auth('operacao')->id();
        if (RateLimiter::tooManyAttempts($chave, 20)) {
            return response()->json(['erro' => 'Muitas tentativas. Espere um minuto e tente de novo.'], 429);
        }
        RateLimiter::hit($chave, 60);

        $mensagens = Mensagem::query()
            ->where('demanda_id', $demanda->id)
            ->where('visibilidade', 'CLIENTE')
            ->orderByDesc('criada_em')
            ->limit(8)
            ->get()
            ->reverse()
            ->map(fn (Mensagem $m) => [
                'autor' => $m->autor_tipo,
                'corpo' => mb_substr((string) $m->corpo, 0, 500),
            ])
            ->values()
            ->all();

        try {
            $rascunho = $client->desdobrarProposta([
                'codigo' => $demanda->codigo,
                'titulo' => $demanda->titulo,
                'descricao' => $demanda->descricao,
                'objetivo' => $demanda->objetivo,
                'sistema_atual' => $demanda->sistema_atual,
                'mensagens' => $mensagens,
            ]);
        } catch (RegraNegocio $e) {
            return response()->json(['erro' => $e->getMessage()], 503);
        }

        try {
            $etapas = PropostaEtapas::normalizar($rascunho['etapas'] ?? []);
        } catch (RegraNegocio $e) {
            return response()->json(['erro' => $e->getMessage()], 422);
        }

        return response()->json([
            'descricao_funcional' => mb_substr(trim((string) ($rascunho['descricao_funcional'] ?? '')), 0, 8000),
            'incluso' => mb_substr(trim((string) ($rascunho['incluso'] ?? '')), 0, 4000),
            'nao_incluso' => mb_substr(trim((string) ($rascunho['nao_incluso'] ?? '')), 0, 4000),
            'criterios_aceite' => mb_substr(trim((string) ($rascunho['criterios_aceite'] ?? '')), 0, 4000),
            'etapas' => $etapas,
        ]);
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

        return back()->with('ok', 'Entrega apresentada para validação. O saldo só é abatido depois que o cliente validar.');
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
