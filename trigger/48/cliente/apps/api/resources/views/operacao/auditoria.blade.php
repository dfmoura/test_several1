@extends('layouts.operacao')
@section('titulo', 'Auditoria')
@section('conteudo')
  <h1>Auditoria</h1>
  <div class="card table-wrap">
    <table>
      <thead><tr><th>Quando</th><th>Ação</th><th>Entidade</th><th>Ator</th></tr></thead>
      <tbody>
        @foreach($registros as $registro)
          <tr>
            <td>{{ $registro->em?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}</td>
            <td>{{ $registro->acao }}</td>
            <td>{{ $registro->entidade }} {{ $registro->entidade_id }}</td>
            <td>{{ $registro->ator_tipo }}</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  </div>
@endsection
