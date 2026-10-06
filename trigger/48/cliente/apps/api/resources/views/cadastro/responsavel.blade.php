@extends('layouts.convidado')
@section('titulo', 'Responsável')
@section('conteudo')
  <div class="card form-narrow">
    <p class="kicker">Empresa</p>
    <h1>{{ $receita['razao_social'] }}</h1>
    <p class="muted">{{ $receita['nome_fantasia'] }} · {{ \App\Suporte\Documento::formatarCnpj($receita['cnpj']) }} · {{ $receita['situacao'] }}</p>
    <form method="post" action="{{ route('cadastro.responsavel') }}">
      @csrf
      <label for="nome">Nome do responsável</label>
      <input id="nome" name="nome" required value="{{ old('nome') }}">
      <label for="cpf">CPF do responsável</label>
      <input id="cpf" name="cpf" inputmode="numeric" required value="{{ old('cpf') }}">
      <label for="email">E-mail de acesso</label>
      <input id="email" name="email" type="email" autocomplete="username" required value="{{ old('email') }}">
      <label for="telefone">Celular</label>
      <input id="telefone" name="telefone" inputmode="tel" required value="{{ old('telefone') }}">
      <label for="senha">Senha</label>
      <input id="senha" name="senha" type="password" minlength="10" autocomplete="new-password" required>
      <label for="senha_confirmation">Repita a senha</label>
      <input id="senha_confirmation" name="senha_confirmation" type="password" minlength="10" required>
      <label><input type="checkbox" name="responsavel_legal" value="1" required> Declaro que sou responsável legal ou procurador desta empresa.</label>
      <label><input type="checkbox" name="aceite_termos" value="1" required> Li e aceito os <a href="{{ route('termos') }}" target="_blank" rel="noopener">termos</a> e o <a href="{{ route('privacidade') }}" target="_blank" rel="noopener">aviso de privacidade</a>.</label>
      <p style="margin-top:1rem"><button type="submit">Criar cadastro e gerar PIX</button></p>
    </form>
  </div>
@endsection
