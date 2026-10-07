@extends('layouts.convidado')
@section('titulo', 'Operação')
@section('conteudo')
  <div class="card form-narrow">
    <p class="kicker">Equipe Trigger</p>
    <h1>Operação</h1>
    <p class="muted">Entrada da equipe. O responsável da empresa entra em <a href="{{ route('entrar') }}">Área do cliente</a>.</p>
    <form method="post" action="{{ route('operacao.entrar') }}">
      @csrf
      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" required value="{{ old('email') }}">
      <label for="senha">Senha</label>
      <input id="senha" name="senha" type="password" required>
      <p style="margin-top:1rem"><button type="submit">Entrar</button></p>
    </form>
  </div>
@endsection
