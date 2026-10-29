@extends('layouts.cliente')
@section('titulo', 'Adicionar saldo')
@section('conteudo')
  <div class="card form-narrow">
    <h1>Adicionar saldo</h1>
    <p class="muted">Recargas devem ser superiores a @reais($piso). O valor entra na carteira quando o banco confirmar.</p>
    <form method="post" action="{{ route('conta.recarga') }}">
      @csrf
      <label for="valor">Valor</label>
      <input id="valor" name="valor" inputmode="decimal" required placeholder="1.500,00" value="{{ old('valor') }}">
      <p style="margin-top:1rem"><button type="submit">Gerar PIX</button></p>
    </form>
  </div>
@endsection
