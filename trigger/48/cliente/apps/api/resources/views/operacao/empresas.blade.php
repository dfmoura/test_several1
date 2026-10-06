@extends('layouts.operacao')
@section('titulo', 'Empresas')
@section('conteudo')
  <h1>Empresas</h1>
  <div class="card table-wrap">
    <table>
      <thead><tr><th>CNPJ</th><th>Razão social</th><th>Status</th><th>Disponível</th></tr></thead>
      <tbody>
        @foreach($empresas as $empresa)
          <tr>
            <td><a href="{{ route('operacao.empresa', $empresa) }}">{{ \App\Suporte\Documento::formatarCnpj($empresa->cnpj) }}</a></td>
            <td>{{ $empresa->razao_social }}</td>
            <td>{{ \App\Suporte\Rotulos::statusEmpresa($empresa->status) }}</td>
            <td>@reais($empresa->carteira->disponivel_centavos ?? 0)</td>
          </tr>
        @endforeach
      </tbody>
    </table>
  </div>
@endsection
