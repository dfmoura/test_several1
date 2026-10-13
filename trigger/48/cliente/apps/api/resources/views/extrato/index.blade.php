@extends('layouts.cliente')
@section('titulo', 'Extrato')
@section('conteudo')
  <header class="pagehead">
    <h1>Extrato</h1>
  </header>
  <div class="metrics">
    <section><p class="kicker">Disponível</p><p class="money">@reais($carteira->disponivel_centavos)</p></section>
    <section><p class="kicker">Reservado</p><p class="money">@reais($carteira->reservado_centavos)</p></section>
    <section><p class="kicker">Consumido</p><p class="money">@reais($carteira->consumido_centavos)</p></section>
  </div>
  <section class="card">
    @include('partials.movimentos', ['movimentos' => $movimentos])
  </section>
@endsection
