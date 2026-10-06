@extends('layouts.cliente')
@section('titulo', 'Demandas')
@section('conteudo')
  <div class="row" style="justify-content:space-between">
    <h1>Demandas</h1>
    <a class="btn" href="{{ route('demandas.criar') }}">Nova demanda</a>
  </div>
  <div class="card table-wrap">
    <table>
      <thead><tr><th>Código</th><th>Título</th><th>Status</th><th>Aberta em</th></tr></thead>
      <tbody>
        @forelse($demandas as $demanda)
          <tr>
            <td><a href="{{ route('demandas.mostrar', $demanda->codigo) }}">{{ $demanda->codigo }}</a></td>
            <td>{{ $demanda->titulo }}</td>
            <td><span class="badge">{{ \App\Suporte\Rotulos::statusDemanda($demanda->status) }}</span></td>
            <td>{{ $demanda->criada_em?->timezone('America/Sao_Paulo')->format('d/m/Y') }}</td>
          </tr>
        @empty
          <tr><td colspan="4">Nenhuma demanda ainda.</td></tr>
        @endforelse
      </tbody>
    </table>
  </div>
@endsection
