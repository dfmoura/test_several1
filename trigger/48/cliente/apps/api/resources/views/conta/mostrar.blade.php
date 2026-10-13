@extends('layouts.cliente')
@section('titulo', 'Conta')
@section('conteudo')
  <header class="pagehead">
    <div>
      <p class="kicker">Conta</p>
      <h1>{{ $empresa->razao_social }}</h1>
    </div>
    <a class="btn" href="{{ route('conta.recarga') }}">Adicionar saldo</a>
  </header>
  <section class="card">
    <dl class="facts">
      <div><dt>CNPJ</dt><dd>{{ \App\Suporte\Documento::formatarCnpj($empresa->cnpj) }}</dd></div>
      <div><dt>Situação</dt><dd>{{ \App\Suporte\Rotulos::statusEmpresa($empresa->status) }}</dd></div>
      <div><dt>Responsável</dt><dd>{{ auth('web')->user()->nome }}</dd></div>
      <div><dt>CPF</dt><dd>{{ $cpfMascarado }}</dd></div>
      <div><dt>E-mail</dt><dd>{{ auth('web')->user()->email }}</dd></div>
    </dl>
  </section>
@endsection
