@extends('layouts.cliente')
@section('titulo', 'Conta')
@section('conteudo')
  <h1>Conta</h1>
  <section class="card form-narrow">
    <p><strong>{{ $empresa->razao_social }}</strong></p>
    <p>{{ \App\Suporte\Documento::formatarCnpj($empresa->cnpj) }}</p>
    <p>Situação: {{ \App\Suporte\Rotulos::statusEmpresa($empresa->status) }}</p>
    <p>Responsável: {{ auth('web')->user()->nome }}</p>
    <p>CPF: {{ $cpfMascarado }}</p>
    <p>E-mail: {{ auth('web')->user()->email }}</p>
    <p><a class="btn" href="{{ route('conta.recarga') }}">Adicionar saldo</a></p>
  </section>
@endsection
