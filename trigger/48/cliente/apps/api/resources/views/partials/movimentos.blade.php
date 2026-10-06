<div class="table-wrap">
  <table>
    <thead><tr><th>Quando</th><th>Movimento</th><th>Valor</th><th>Disponível depois</th></tr></thead>
    <tbody>
      @forelse($movimentos as $movimento)
        <tr>
          <td>{{ $movimento->criado_em?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}</td>
          <td>{{ \App\Suporte\Rotulos::movimento($movimento->tipo, $movimento->observacao) }}</td>
          <td>@reais($movimento->valor_centavos)</td>
          <td>@reais($movimento->saldo_disponivel_depois)</td>
        </tr>
      @empty
        <tr><td colspan="4">Ainda não há movimentos.</td></tr>
      @endforelse
    </tbody>
  </table>
</div>
@if(method_exists($movimentos, 'links'))
  <p class="row">
    @if($movimentos->previousPageUrl())<a href="{{ $movimentos->previousPageUrl() }}">Anterior</a>@endif
    @if($movimentos->hasMorePages())<a href="{{ $movimentos->nextPageUrl() }}">Próxima</a>@endif
  </p>
@endif
