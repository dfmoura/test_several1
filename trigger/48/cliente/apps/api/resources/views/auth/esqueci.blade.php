@extends('layouts.convidado')
@section('titulo', 'Esqueci a senha')
@section('conteudo')
  <div class="card form-narrow">
    <h1>Esqueci a senha</h1>
    <p class="muted">Enviaremos um link de uso único se o e-mail estiver cadastrado.</p>
    <form method="post" action="{{ route('senha.esqueci') }}">
      @csrf
      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" required value="{{ old('email') }}">
      <p style="margin-top:1rem"><button type="submit">Enviar link</button></p>
    </form>
    <p><a href="{{ route('entrar') }}">Voltar ao login</a></p>
  </div>
@endsection
