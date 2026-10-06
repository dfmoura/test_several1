@extends('layouts.cliente')
@section('titulo', $demanda->codigo)
@section('conteudo')
  <p class="kicker">{{ $demanda->codigo }}</p>
  <h1>{{ $demanda->titulo }}</h1>
  <p>
    <span class="badge">{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</span>
    @if($demanda->aguardando_cliente)<span class="badge">aguardando você</span>@endif
  </p>
  <div class="grid grid-2">
    <section class="card">
      <h2>Pedido</h2>
      <p><strong>Sistema atual.</strong> {{ $demanda->sistema_atual }}</p>
      <p><strong>Objetivo.</strong> {{ $demanda->objetivo }}</p>
      <p>{{ $demanda->descricao }}</p>
      <p class="muted">{{ \App\Suporte\Rotulos::TIPOS_DEMANDA[$demanda->tipo] ?? $demanda->tipo }} · {{ \App\Suporte\Rotulos::PRIORIDADES[$demanda->prioridade] ?? $demanda->prioridade }} · {{ $demanda->contato_tecnico }}</p>
      @if($demanda->status === 'RASCUNHO')
        <form method="post" action="{{ route('demandas.enviar', $demanda->codigo) }}">@csrf<button type="submit">Enviar demanda</button></form>
        <form method="post" action="{{ route('demandas.descartar', $demanda->codigo) }}" style="margin-top:.5rem">@csrf<button class="btn-ghost" type="submit">Descartar rascunho</button></form>
      @endif
      <h2>Linha do tempo</h2>
      <ol class="timeline">
        @foreach($eventos as $evento)
          <li>{{ $evento->em?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }} — {{ \App\Suporte\Rotulos::statusDemanda($evento->para_status) }}@if($evento->motivo) · {{ $evento->motivo }}@endif</li>
        @endforeach
        @foreach($marcos as $marco)
          <li>{{ $marco->criado_em?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }} — {{ $marco->texto }}</li>
        @endforeach
      </ol>
    </section>
    <aside class="card">
      <p class="kicker">Saldo nesta demanda</p>
      <p>Reservado: @reais($reserva)</p>
      <p>Disponível na carteira: @reais($disponivel)</p>
      @if($vigente)
        <h2>Proposta v{{ $vigente->versao }}</h2>
        <p class="money">@reais($vigente->valor_centavos)</p>
        <p>{{ $vigente->prazo_dias_uteis }} dias úteis · válida até {{ $vigente->valida_ate?->timezone('America/Sao_Paulo')->format('d/m/Y') }}</p>
        <p>Na entrega, abatemos o saldo e cobramos a diferença por PIX.</p>
        <p>Falta liquidar, com o saldo de hoje: @reais($falta)</p>
        <h3>Escopo</h3>
        <p>{{ $vigente->descricao_funcional }}</p>
        <p><strong>Incluso.</strong> {{ $vigente->incluso }}</p>
        <p><strong>Não incluso.</strong> {{ $vigente->nao_incluso }}</p>
        <p><strong>Aceite.</strong> {{ $vigente->criterios_aceite }}</p>
        <form method="post" action="{{ route('demandas.aprovar', $demanda->codigo) }}">
          @csrf
          <label for="confirmar_valor">Digite {{ \App\Suporte\Dinheiro::reais($vigente->valor_centavos) }} para aprovar</label>
          <input id="confirmar_valor" name="confirmar_valor" required inputmode="decimal">
          <p><button type="submit">Aprovar demanda</button></p>
        </form>
        <form method="post" action="{{ route('demandas.recusar', $demanda->codigo) }}">
          @csrf
          <label for="motivo">Motivo da recusa</label>
          <textarea id="motivo" name="motivo" required minlength="10"></textarea>
          <p class="muted">As duas primeiras recusas em 90 dias devolvem o saldo. A terceira converte o ticket em remuneração da análise.</p>
          <button class="btn-danger" type="submit">Recusar proposta</button>
        </form>
      @elseif($aprovada)
        <h2>Valor aprovado</h2>
        <p class="money">@reais($aprovada->valor_centavos)</p>
        <p>A aprovação não marca a fatura como paga. A liquidação acontece na apresentação.</p>
      @endif
      @if($demanda->apresentacao)
        <h2>Apresentação</h2>
        <p>{{ $demanda->apresentacao->resumo }}</p>
        @if($demanda->fatura)
          <p>Fatura @reais($demanda->fatura->valor_centavos) · {{ $demanda->fatura->status === 'LIQUIDADA' ? 'liquidada' : 'em aberto' }}</p>
          <p><a href="{{ route('faturas.pdf', $demanda->fatura->id) }}">Baixar PDF</a></p>
          @if($pix)
            <p><a class="btn" href="{{ route('pix.mostrar', $pix->txid) }}">Pagar diferença @reais($pix->valor_centavos)</a></p>
          @endif
        @endif
      @endif
    </aside>
  </div>
  <section class="card" style="margin-top:1rem">
    <h2>Mensagens</h2>
    @foreach($mensagens as $mensagem)
      <article class="msg">
        <strong>{{ $mensagem->autor_tipo === 'CLIENTE' ? 'Você' : 'Trigger' }}</strong>
        <span class="muted">{{ $mensagem->criada_em?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}</span>
        <p>{{ $mensagem->corpo }}</p>
      </article>
    @endforeach
    @if(! $demanda->terminal() && $demanda->status !== 'RASCUNHO')
      <form method="post" action="{{ route('demandas.mensagem', $demanda->codigo) }}" enctype="multipart/form-data">
        @csrf
        <label for="corpo">Escrever para a Trigger</label>
        <textarea id="corpo" name="corpo" required></textarea>
        <label for="anexo">Anexo</label>
        <input id="anexo" name="anexo" type="file">
        <p><button type="submit">Enviar</button></p>
      </form>
    @endif
    @if($demanda->anexos->isNotEmpty())
      <h3>Arquivos</h3>
      <ul>
        @foreach($demanda->anexos as $anexo)
          <li>
            @if($anexo->pacote && optional($demanda->fatura)->status !== 'LIQUIDADA')
              {{ $anexo->nome_original }} — libera quando a fatura liquidar
            @else
              <a href="{{ route('anexos.baixar', [$demanda->codigo, $anexo->id]) }}">{{ $anexo->nome_original }}</a>
            @endif
          </li>
        @endforeach
      </ul>
    @endif
  </section>
@endsection
