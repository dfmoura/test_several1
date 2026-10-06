@extends('layouts.operacao')
@section('titulo', 'Fila')
@section('conteudo')
  <h1>Fila</h1>
  <p class="muted">{{ $ativas }} empresas ativas · {{ $abertas }} faturas em aberto</p>
  <p class="row">
    <a href="{{ route('operacao.fila') }}">Todas</a>
    @foreach(['EM_ANALISE','PROPOSTA_ENVIADA','APROVADA','EM_EXECUCAO','APRESENTADA','CONCLUIDA'] as $item)
      <a href="{{ route('operacao.fila', ['status' => $item]) }}">{{ \App\Suporte\Rotulos::statusDemanda($item) }}</a>
    @endforeach
  </p>
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
