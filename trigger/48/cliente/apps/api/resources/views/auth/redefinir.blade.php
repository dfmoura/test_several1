@extends('layouts.convidado')
@section('titulo', 'Nova senha')
@section('conteudo')
  <div class="card form-narrow">
    <h1>Nova senha</h1>
    <form method="post" action="{{ route('senha.salvar') }}">
      @csrf
      <input type="hidden" name="token" value="{{ $token }}">
      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" required value="{{ old('email', $email) }}">
      <label for="senha">Nova senha</label>
      <input id="senha" name="senha" type="password" required minlength="10" autocomplete="new-password">
      <label for="senha_confirmation">Repita a senha</label>
      <input id="senha_confirmation" name="senha_confirmation" type="password" required minlength="10" autocomplete="new-password">
      <p style="margin-top:1rem"><button type="submit">Salvar senha</button></p>
    </form>
  </div>
@endsection
