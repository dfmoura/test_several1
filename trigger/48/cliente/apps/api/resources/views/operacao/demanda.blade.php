@extends('layouts.operacao')
@section('titulo', $demanda->codigo)
@section('conteudo')
  <header class="pagehead">
    <div>
      <p class="kicker">{{ $demanda->empresa->razao_social }} · disponível @reais($demanda->empresa->carteira->disponivel_centavos) · reservado nesta demanda @reais($reserva)</p>
      <h1>{{ $demanda->codigo }} · {{ $demanda->titulo }}</h1>
    </div>
    <span class="badge">{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</span>
  </header>
  <section class="card">
    @if(filled($demanda->sistema_atual))
      <p><strong>Sistema.</strong> {{ $demanda->sistema_atual }}</p>
    @endif
    @if($demanda->objetivoAparte())
      <p><strong>O que precisa ficar pronto.</strong></p>
      <p class="prose">{{ $demanda->objetivo }}</p>
    @endif
    <p class="prose">{{ $demanda->descricao }}</p>
    <h2>Acessos</h2>
    @if(filled($demanda->acessos))
      <pre class="segredo">{{ $demanda->acessos }}</pre>
    @else
      <p class="muted">Nenhum acesso informado.</p>
    @endif
    <p class="muted">{{ $demanda->contato_tecnico }}@if($demanda->prazo_desejado) · prazo desejado {{ $demanda->prazo_desejado->format('d/m/Y') }}@endif</p>
  </section>
  <div class="grid grid-ops depois">
    <section class="card">
      <h2>Conversa</h2>
      @foreach($mensagens as $mensagem)
        <article class="msg">
          <strong>{{ $mensagem->visibilidade === 'INTERNA' ? 'Nota interna' : ($mensagem->autor_tipo === 'CLIENTE' ? 'Cliente' : 'Trigger') }}</strong>
          <p>{{ $mensagem->corpo }}</p>
        </article>
      @endforeach
      <form class="composer" method="post" action="{{ route('operacao.mensagens', $demanda->codigo) }}" enctype="multipart/form-data">
        @csrf
        <label for="corpo">Mensagem</label>
        <textarea id="corpo" name="corpo" required rows="3"></textarea>
        <label><input type="checkbox" name="interna" value="1"> Nota interna (o cliente não vê)</label>
        <label><input type="checkbox" name="aguardar" value="1"> Aguardando o cliente</label>
        <input type="file" name="anexo">
        <p><button type="submit">Registrar</button></p>
      </form>
    </section>
    <section class="card desk">
      @if(in_array($demanda->status, ['EM_ANALISE','PROPOSTA_ENVIADA'], true))
        <h2>Nova versão de proposta</h2>
        <form method="post" action="{{ route('operacao.propor', $demanda->codigo) }}">
          @csrf
          <div class="fields">
          @foreach(['objetivo'=>['Objetivo', true],'contexto'=>['Contexto', false],'premissas'=>['Premissas', false],'descricao_funcional'=>['Descrição funcional', true],'requisitos'=>['Requisitos', true],'criterios_aceite'=>['Critérios de aceite', true],'restricoes'=>['Restrições', false],'incluso'=>['Incluso', false],'nao_incluso'=>['Não incluso', true]] as $campo => [$rotulo, $largo])
            <div class="field {{ $largo ? 'span-2 alto' : '' }}">
              <label for="{{ $campo }}">{{ $rotulo }}</label>
              <textarea id="{{ $campo }}" name="{{ $campo }}" required rows="{{ $largo ? 3 : 2 }}"></textarea>
            </div>
          @endforeach
          </div>
          <div class="nums">
            <div>
              <label for="prazo_dias_uteis">Prazo em dias úteis</label>
              <input id="prazo_dias_uteis" name="prazo_dias_uteis" type="number" min="1" required>
            </div>
            <div>
              <label for="horas_estimadas">Horas estimadas (interno)</label>
              <input id="horas_estimadas" name="horas_estimadas" type="number" min="1">
            </div>
            <div>
              <label for="valor">Valor</label>
              <input id="valor" name="valor" required placeholder="4.500,00">
            </div>
          </div>
          <label for="observacao">Observação</label>
          <textarea id="observacao" name="observacao" rows="2"></textarea>
          <p><button type="submit">Enviar proposta</button></p>
        </form>
        <form method="post" action="{{ route('operacao.recusar', $demanda->codigo) }}">
          @csrf
          <label for="motivo">Recusar a demanda</label>
          <textarea id="motivo" name="motivo" required minlength="10" rows="2"></textarea>
          <button class="btn-danger" type="submit">Recusar e devolver reserva</button>
        </form>
      @endif
      @if($demanda->status === 'APROVADA')
        <form method="post" action="{{ route('operacao.executar', $demanda->codigo) }}">@csrf<button type="submit">Iniciar execução</button></form>
      @endif
      @if(in_array($demanda->status, ['APROVADA','EM_EXECUCAO'], true))
        <form method="post" action="{{ route('operacao.marco', $demanda->codigo) }}">
          @csrf
          <label for="texto">Marco</label>
          <input id="texto" name="texto" required>
          <label><input type="checkbox" name="visivel" value="1" checked> Visível ao cliente</label>
          <p><button class="btn-ghost" type="submit">Registrar marco</button></p>
        </form>
      @endif
      @if(in_array($demanda->status, ['APROVADA','EM_EXECUCAO','AGUARDANDO_VALIDACAO'], true))
        <form method="post" action="{{ route('operacao.cancelar', $demanda->codigo) }}">
          @csrf
          <label for="motivo_cancel">Cancelar depois da aprovação</label>
          <textarea id="motivo_cancel" name="motivo" required minlength="10" rows="2"></textarea>
          <label><input type="radio" name="consumir" value="devolver" required> Devolver o ticket</label>
          <label><input type="radio" name="consumir" value="consumir"> Consumir o ticket</label>
          <p><button class="btn-danger" type="submit">Cancelar demanda</button></p>
        </form>
      @endif
      @if($demanda->status === 'EM_EXECUCAO')
        <form method="post" action="{{ route('operacao.apresentar', $demanda->codigo) }}" enctype="multipart/form-data">
          @csrf
          <label for="resumo">Resumo da entrega</label>
          <textarea id="resumo" name="resumo" required rows="3"></textarea>
          <label for="pacote">Pacote (libera após a liquidação)</label>
          <input id="pacote" name="pacote[]" type="file" multiple>
          <p><button type="submit">Apresentar para validação</button></p>
        </form>
      @endif
      @if($demanda->status === 'AGUARDANDO_VALIDACAO')
        <h2>Aguardando validação</h2>
        <p>{{ $demanda->apresentacao?->resumo }}</p>
        <p>O cliente valida até {{ $demanda->validacao_ate?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}. O saldo ainda não foi abatido.</p>
        @if((int) $demanda->ajustes_usados >= 1)
          <p class="muted">O ajuste deste escopo já foi usado.</p>
        @endif
      @endif
      @foreach($demanda->propostas as $proposta)
        <p>Proposta v{{ $proposta->versao }} · @reais($proposta->valor_centavos) · {{ $proposta->status }}</p>
      @endforeach
      @if($demanda->fatura)
        <p>Fatura @reais($demanda->fatura->valor_centavos) · {{ $demanda->fatura->status }} · complemento @reais($demanda->fatura->complemento_centavos)</p>
      @endif
    </section>
  </div>
@endsection
