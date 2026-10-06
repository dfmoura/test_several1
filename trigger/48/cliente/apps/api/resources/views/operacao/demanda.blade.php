@extends('layouts.operacao')
@section('titulo', $demanda->codigo)
@section('conteudo')
  <p class="kicker">{{ $demanda->empresa->razao_social }} · disponível @reais($demanda->empresa->carteira->disponivel_centavos) · reservado nesta demanda @reais($reserva)</p>
  <h1>{{ $demanda->codigo }} · {{ $demanda->titulo }}</h1>
  <p><span class="badge">{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</span></p>
  <section class="card">
    <p><strong>Sistema.</strong> {{ $demanda->sistema_atual }}</p>
    <p><strong>Objetivo.</strong> {{ $demanda->objetivo }}</p>
    <p>{{ $demanda->descricao }}</p>
    <p class="muted">{{ $demanda->contato_tecnico }} · prazo desejado {{ $demanda->prazo_desejado?->format('d/m/Y') ?: 'não informado' }}</p>
  </section>
  <div class="grid grid-2" style="margin-top:1rem">
    <section class="card">
      <h2>Conversa</h2>
      @foreach($mensagens as $mensagem)
        <article class="msg">
          <strong>{{ $mensagem->visibilidade === 'INTERNA' ? 'Nota interna' : ($mensagem->autor_tipo === 'CLIENTE' ? 'Cliente' : 'Trigger') }}</strong>
          <p>{{ $mensagem->corpo }}</p>
        </article>
      @endforeach
      <form method="post" action="{{ route('operacao.mensagens', $demanda->codigo) }}" enctype="multipart/form-data">
        @csrf
        <label for="corpo">Mensagem</label>
        <textarea id="corpo" name="corpo" required></textarea>
        <label><input type="checkbox" name="interna" value="1"> Nota interna (o cliente não vê)</label>
        <label><input type="checkbox" name="aguardar" value="1"> Aguardando o cliente</label>
        <input type="file" name="anexo">
        <p><button type="submit">Registrar</button></p>
      </form>
    </section>
    <section class="card">
      @if(in_array($demanda->status, ['EM_ANALISE','PROPOSTA_ENVIADA'], true))
        <h2>Nova versão de proposta</h2>
        <form method="post" action="{{ route('operacao.propor', $demanda->codigo) }}">
          @csrf
          @foreach(['objetivo'=>'Objetivo','contexto'=>'Contexto','descricao_funcional'=>'Descrição funcional','requisitos'=>'Requisitos','criterios_aceite'=>'Critérios de aceite','premissas'=>'Premissas','restricoes'=>'Restrições','incluso'=>'Incluso','nao_incluso'=>'Não incluso'] as $campo => $rotulo)
            <label for="{{ $campo }}">{{ $rotulo }}</label>
            <textarea id="{{ $campo }}" name="{{ $campo }}" required></textarea>
          @endforeach
          <label for="prazo_dias_uteis">Prazo em dias úteis</label>
          <input id="prazo_dias_uteis" name="prazo_dias_uteis" type="number" min="1" required>
          <label for="horas_estimadas">Horas estimadas (interno)</label>
          <input id="horas_estimadas" name="horas_estimadas" type="number" min="1">
          <label for="valor">Valor</label>
          <input id="valor" name="valor" required placeholder="4.500,00">
          <label for="observacao">Observação</label>
          <textarea id="observacao" name="observacao"></textarea>
          <p><button type="submit">Enviar proposta</button></p>
        </form>
        <form method="post" action="{{ route('operacao.recusar', $demanda->codigo) }}">
          @csrf
          <label for="motivo">Recusar a demanda</label>
          <textarea id="motivo" name="motivo" required minlength="10"></textarea>
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
        <form method="post" action="{{ route('operacao.cancelar', $demanda->codigo) }}">
          @csrf
          <label for="motivo_cancel">Cancelar depois da aprovação</label>
          <textarea id="motivo_cancel" name="motivo" required minlength="10"></textarea>
          <label><input type="radio" name="consumir" value="devolver" required> Devolver o ticket</label>
          <label><input type="radio" name="consumir" value="consumir"> Consumir o ticket</label>
          <p><button class="btn-danger" type="submit">Cancelar demanda</button></p>
        </form>
      @endif
      @if($demanda->status === 'EM_EXECUCAO')
        <form method="post" action="{{ route('operacao.apresentar', $demanda->codigo) }}" enctype="multipart/form-data">
          @csrf
          <label for="resumo">Resumo da entrega</label>
          <textarea id="resumo" name="resumo" required></textarea>
          <label for="pacote">Pacote (libera após a liquidação)</label>
          <input id="pacote" name="pacote[]" type="file" multiple>
          <p><button type="submit">Apresentar e faturar</button></p>
        </form>
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
