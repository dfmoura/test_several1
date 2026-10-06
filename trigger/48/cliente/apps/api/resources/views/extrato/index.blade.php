@extends('layouts.cliente')
@section('titulo', 'Extrato')
@section('conteudo')
  <h1>Extrato</h1>
  <div class="grid grid-3">
    <section class="card"><p class="kicker">Disponível</p><p class="money">@reais($carteira->disponivel_centavos)</p></section>
    <section class="card"><p class="kicker">Reservado</p><p class="money">@reais($carteira->reservado_centavos)</p></section>
    <section class="card"><p class="kicker">Consumido</p><p class="money">@reais($carteira->consumido_centavos)</p></section>
  </div>
  <section class="card" style="margin-top:1rem">
    @include('partials.movimentos', ['movimentos' => $movimentos])
  </section>
@endsection
