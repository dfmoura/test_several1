@extends('layouts.operacao')
@section('titulo', $empresa->razao_social)
@section('conteudo')
  <header class="pagehead">
    <div>
      <p class="kicker">{{ \App\Suporte\Documento::formatarCnpj($empresa->cnpj) }}</p>
      <h1>{{ $empresa->razao_social }}</h1>
      <p class="meta">{{ \App\Suporte\Rotulos::statusEmpresa($empresa->status) }} · disponível @reais($empresa->carteira->disponivel_centavos ?? 0) · reservado @reais($empresa->carteira->reservado_centavos ?? 0) · consumido @reais($empresa->carteira->consumido_centavos ?? 0)</p>
    </div>
  </header>
  @if($empresa->motivo)<p>{{ $empresa->motivo }}</p>@endif
  <div class="card">
    <div class="row">
      @if($empresa->status === 'ATIVA')
        <form class="inline-form" method="post" action="{{ route('operacao.empresas.bloquear', $empresa) }}">@csrf<input name="motivo" required placeholder="Motivo do bloqueio"><button class="btn-danger" type="submit">Bloquear</button></form>
      @endif
      @if($empresa->status === 'BLOQUEADA')
        <form method="post" action="{{ route('operacao.empresas.reativar', $empresa) }}">@csrf<button type="submit">Reativar</button></form>
      @endif
      @if($empresa->status !== 'CANCELADA')
        <form class="inline-form" method="post" action="{{ route('operacao.empresas.cancelar', $empresa) }}">@csrf<input name="motivo" required minlength="10" placeholder="Motivo do cancelamento"><button class="btn-ghost" type="submit">Cancelar conta</button></form>
      @endif
    </div>
  </div>
  <section class="card depois">
    @include('partials.movimentos', ['movimentos' => $movimentos])
  </section>
@endsection
