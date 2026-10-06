@extends('layouts.convidado')
@section('titulo', 'Entrar')
@section('conteudo')
  <div class="card form-narrow">
    <p class="kicker">Área do cliente</p>
    <h1>Entrar</h1>
    <p class="muted">Use o e-mail e a senha do responsável vinculado ao CNPJ.</p>
    <form method="post" action="{{ route('entrar') }}">
      @csrf
      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" autocomplete="username" required value="{{ old('email') }}">
      <label for="senha">Senha</label>
      <input id="senha" name="senha" type="password" autocomplete="current-password" required>
      <p class="row" style="margin-top:1rem">
        <button type="submit">Entrar</button>
        <a href="{{ route('senha.esqueci') }}">Esqueci a senha</a>
      </p>
    </form>
    <p>Ainda não tem cadastro? <a href="{{ route('cadastro.cnpj') }}">Cadastrar empresa</a></p>
  </div>
@endsection
