@extends('layouts.operacao')
@section('titulo', 'Fila')
@section('conteudo')
  <header class="pagehead">
    <div>
      <h1>Fila</h1>
      <p class="meta">{{ $ativas }} empresas ativas · {{ $abertas }} faturas em aberto</p>
    </div>
  </header>
  <nav class="filters" aria-label="Filtrar por status">
    <a href="{{ route('operacao.fila') }}" @if(! request()->filled('status')) aria-current="page" @endif>Todas</a>
    @foreach(['EM_ANALISE','PROPOSTA_ENVIADA','APROVADA','EM_EXECUCAO','AGUARDANDO_VALIDACAO','APRESENTADA','CONCLUIDA'] as $item)
      <a href="{{ route('operacao.fila', ['status' => $item]) }}" @if(request('status') === $item) aria-current="page" @endif>{{ \App\Suporte\Rotulos::statusDemanda($item) }}</a>
    @endforeach
  </nav>
  <div class="card table-wrap">
    <table>
      <thead><tr><th>Código</th><th>Empresa</th><th>Título</th><th>Status</th></tr></thead>
      <tbody>
        @foreach($demandas as $demanda)
          <tr>
            <td><a href="{{ route('operacao.demanda', $demanda->codigo) }}">{{ $demanda->codigo }}</a></td>
            <td>{{ $demanda->empresa->razao_social }}</td>
            <td>{{ $demanda->titulo }} @if($demanda->aguardando_cliente)<span class="badge">aguardando cliente</span>@endif</td>
            <td>{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  </div>
@endsection
