@extends('layouts.cliente')
@section('titulo', 'Início')
@section('conteudo')
  <h1>Olá</h1>
  <p class="muted">{{ $empresa->razao_social }} · {{ \App\Suporte\Rotulos::statusEmpresa($empresa->status) }}</p>
  @if($empresa->status === 'ATIVA' && $carteira->disponivel_centavos < $saldoMinimo)
    <div class="flash flash-aviso" role="status">Seu saldo está abaixo do limite recomendado (@reais($saldoMinimo)).</div>
  @endif
  <div class="grid grid-3">
    <section class="card"><p class="kicker">Disponível</p><p class="money">@reais($carteira->disponivel_centavos)</p></section>
    <section class="card"><p class="kicker">Reservado</p><p class="money">@reais($carteira->reservado_centavos)</p></section>
    <section class="card"><p class="kicker">Consumido</p><p class="money">@reais($carteira->consumido_centavos)</p></section>
  </div>
  <div class="grid grid-2" style="margin-top:1rem">
    <section class="card">
      <h2>Demanda</h2>
      @if($demanda)
        <p><a href="{{ route('demandas.mostrar', $demanda->codigo) }}">{{ $demanda->codigo }} · {{ $demanda->titulo }}</a></p>
        <p><span class="badge">{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</span>
          @if($demanda->aguardando_cliente) <span class="badge">aguardando você</span>@endif
        </p>
      @elseif($motivoNova)
        <p>{{ $motivoNova }}</p>
        @if($empresa->status === 'AGUARDA_PIX')
          <p><a class="btn" href="{{ route('conta') }}">Ver ativação</a></p>
        @endif
        @if($motivoNova === 'Falta saldo para abrir uma demanda.')
          <p><a class="btn" href="{{ route('conta.recarga') }}">Adicionar saldo</a></p>
        @endif
      @else
        <p>Nenhuma demanda em andamento.</p>
        <p><a class="btn" href="{{ route('demandas.criar') }}">Nova demanda</a></p>
      @endif
    </section>
    <section class="card">
      <h2>Avisos</h2>
      @forelse($avisos as $aviso)
        <p><strong>{{ $aviso->titulo }}</strong><br><span class="muted">{{ $aviso->corpo }}</span></p>
      @empty
        <p class="muted">Nenhum aviso.</p>
      @endforelse
      @if($avisos->whereNull('lida_em')->isNotEmpty())
        <form method="post" action="{{ route('avisos.lidos') }}">@csrf<button class="btn-ghost" type="submit">Marcar como lidos</button></form>
      @endif
    </section>
  </div>
  <section class="card" style="margin-top:1rem">
    <h2>Últimos movimentos</h2>
    @include('partials.movimentos', ['movimentos' => $movimentos])
  </section>
@endsection
