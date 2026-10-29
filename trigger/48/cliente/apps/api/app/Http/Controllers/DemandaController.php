<?php

namespace App\Http\Controllers;

use App\Domain\Anexos\AnexosService;
use App\Domain\Carteira\CarteiraService;
use App\Domain\Demanda\AssistenciaClient;
use App\Domain\Demanda\DemandaService;
use App\Domain\Empresa\EmpresaAtual;
use App\Domain\Fatura\FaturaService;
use App\Models\Aprovacao;
use App\Models\CobrancaPix;
use App\Models\Demanda;
use App\Models\Marco;
use App\Models\Mensagem;
use App\Models\Proposta;
use App\Models\Usuario;
use App\Domain\RegraNegocio;
use App\Suporte\Dinheiro;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class DemandaController extends Controller
{
    public function index(EmpresaAtual $atual)
    {
        $empresa = $atual->empresa();

        return view('demandas.index', [
            'demandas' => Demanda::query()->where('empresa_id', $empresa->id)->latest('id')->paginate(20),
        ]);
    }

    public function criar(AssistenciaClient $assistencia)
    {
        return view('demandas.criar', [
            'demanda' => null,
            'assistenciaAtiva' => $assistencia->ativa(),
        ]);
    }

    public function salvar(Request $request, EmpresaAtual $atual, DemandaService $demandas)
    {
        $atual->exigir('demanda.abrir');
        $dados = $this->validar($request);
        $demanda = $demandas->abrir(
            $atual->empresa(),
            $request->user('web'),
            $dados,
            $request->boolean('rascunho'),
        );

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
        $aceite = $this->aceiteCongelado($aprovada);
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
            'aceite' => $aceite,
            'reserva' => $reserva,
            'disponivel' => $disponivel,
            'falta' => $vigente ? max(0, $vigente->valor_centavos - $reserva - $disponivel) : 0,
            'faltaValidacao' => $aceite ? max(0, $aceite['valor_centavos'] - $reserva - $disponivel) : 0,
            'pix' => $pix,
            'eventos' => $demanda->eventos()->orderBy('em')->get(),
            'marcos' => Marco::query()->where('demanda_id', $demanda->id)->where('visivel_ao_cliente', true)->orderBy('criado_em')->get(),
        ]);
    }

    /**
     * @return array{valor_centavos: int, prazo_dias_uteis: int|string, descricao_funcional: string, incluso: string, nao_incluso: string, criterios_aceite: string, etapas: list<array<string, mixed>>}|null
     */
    private function aceiteCongelado(?Proposta $aprovada): ?array
    {
        if (! $aprovada) {
            return null;
        }
        $registro = Aprovacao::query()->where('proposta_id', $aprovada->id)->first();
        $escopo = is_array($registro?->escopo_snapshot) ? $registro->escopo_snapshot : [];
        $etapas = $escopo['etapas'] ?? $aprovada->etapas;

        return [
            'valor_centavos' => (int) ($registro?->valor_centavos ?? $aprovada->valor_centavos),
            'prazo_dias_uteis' => $escopo['prazo_dias_uteis'] ?? $aprovada->prazo_dias_uteis,
            'descricao_funcional' => (string) ($escopo['descricao_funcional'] ?? $aprovada->descricao_funcional),
            'incluso' => (string) ($escopo['incluso'] ?? $aprovada->incluso),
            'nao_incluso' => (string) ($escopo['nao_incluso'] ?? $aprovada->nao_incluso),
            'criterios_aceite' => (string) ($escopo['criterios_aceite'] ?? $aprovada->criterios_aceite),
            'etapas' => is_array($etapas) ? $etapas : [],
        ];
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
        $demandas->aprovar($demanda, $request->user('web'), (string) $request->ip());

        return back()->with('ok', 'Proposta aprovada. A execução pode começar. O saldo é abatido quando você validar a entrega.');
    }

    public function validarEntrega(Request $request, Demanda $demanda, DemandaService $demandas, EmpresaAtual $atual)
    {
        $atual->exigir('demanda.aprovar');
        $this->exigirConfirmacaoDoValor($request, $demanda);
        $fatura = $demandas->validarEntrega($demanda, $request->user('web'));
        $mensagem = $fatura->status === 'LIQUIDADA'
            ? 'Entrega validada. O saldo foi abatido e a demanda está concluída.'
            : 'Entrega validada. Falta '.Dinheiro::reais((int) $fatura->complemento_centavos).' por PIX para concluir.';

        return back()->with('ok', $mensagem);
    }

    private function exigirConfirmacaoDoValor(Request $request, Demanda $demanda): void
    {
        $aprovada = Proposta::query()
            ->where('demanda_id', $demanda->id)
            ->where('status', 'APROVADA')
            ->first();
        $aceite = $this->aceiteCongelado($aprovada);
        if ($aceite === null) {
            throw ValidationException::withMessages([
                'confirmar_valor' => 'Não há valor aprovado para confirmar.',
            ]);
        }
        $request->validate([
            'confirmar_valor' => ['required', 'string', 'max:40'],
        ], [
            'confirmar_valor.required' => 'Digite o valor da proposta para validar a entrega.',
        ]);
        try {
            $informado = Dinheiro::centavosDeTexto((string) $request->input('confirmar_valor'));
        } catch (RegraNegocio $e) {
            throw ValidationException::withMessages([
                'confirmar_valor' => $e->getMessage(),
            ]);
        }
        if ($informado !== (int) $aceite['valor_centavos']) {
            throw ValidationException::withMessages([
                'confirmar_valor' => 'Digite exatamente '.Dinheiro::reais((int) $aceite['valor_centavos']).' para confirmar.',
            ]);
        }
    }

    public function pedirAjuste(Request $request, Demanda $demanda, DemandaService $demandas, EmpresaAtual $atual)
    {
        $atual->exigir('demanda.aprovar');
        $dados = $request->validate(['motivo' => ['required', 'string', 'min:10', 'max:1000']]);
        $demandas->pedirAjuste($demanda, $request->user('web'), $dados['motivo']);

        return back()->with('ok', 'Ajuste pedido. A demanda voltou para execução e o saldo não foi abatido.');
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
            'descricao' => ['required', 'string', 'max:5000'],
            'acessos' => ['nullable', 'string', 'max:4000'],
        ], [
            'required' => 'Preencha :attribute.',
            'max.string' => ':attribute passou do limite.',
        ], [
            'descricao' => 'a descrição da demanda',
            'acessos' => 'os acessos',
        ]);
        $descricao = trim($dados['descricao']);

        return [
            'titulo' => $this->titulo($descricao),
            'descricao' => $descricao,
            'objetivo' => $descricao,
            'sistema_atual' => '',
            'tipo' => 'outro',
            'prioridade' => 'normal',
            'prazo_desejado' => null,
            'contato_tecnico' => $this->contato($request->user('web')),
            'observacoes' => null,
            'acessos' => blank($dados['acessos'] ?? null) ? null : trim((string) $dados['acessos']),
        ];
    }

    private function titulo(string $descricao): string
    {
        $linha = trim((string) (preg_split("/\R/u", $descricao, 2)[0] ?? $descricao));
        if (mb_strlen($linha) <= 160) {
            return $linha;
        }

        return rtrim(mb_substr($linha, 0, 160));
    }

    private function contato(Usuario $usuario): string
    {
        $contato = trim($usuario->nome.', '.$usuario->email, " \t\n\r\0\x0B,");
        if (mb_strlen($contato) <= 160) {
            return $contato;
        }

        return rtrim(mb_substr($contato, 0, 160));
    }
}
