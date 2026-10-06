@extends('layouts.convidado')
@section('titulo', 'Cadastrar empresa')
@section('conteudo')
  <div class="card form-narrow">
    <p class="kicker">Cadastro</p>
    <h1>Qual é o CNPJ?</h1>
    <p class="muted">Consultamos a Receita e seguimos só com empresa ativa. O responsável entra no próximo passo.</p>
    <form method="post" action="{{ route('cadastro.cnpj') }}">
      @csrf
      <label for="cnpj">CNPJ</label>
      <input id="cnpj" name="cnpj" inputmode="numeric" autocomplete="off" required value="{{ old('cnpj') }}" placeholder="00.000.000/0000-00">
      <p style="margin-top:1rem"><button type="submit">Continuar</button></p>
    </form>
    <p>Já tem conta? <a href="{{ route('entrar') }}">Entrar</a></p>
  </div>
@endsection
