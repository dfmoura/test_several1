@if(filled($demanda->sistema_atual))
  <p><strong>Sistema atual.</strong> {{ $demanda->sistema_atual }}</p>
@endif
@if($demanda->objetivoAparte())
  <p><strong>O que precisa ficar pronto.</strong></p>
  <p class="prose">{{ $demanda->objetivo }}</p>
@endif
<p class="prose">{{ $demanda->descricao }}</p>
@if(filled($demanda->acessos))
  <details class="segredo-box">
    <summary>Acessos e senhas informados</summary>
    <pre class="segredo">{{ $demanda->acessos }}</pre>
  </details>
@endif
@if($demanda->classificacaoInformada())
  <p class="muted">{{ \App\Suporte\Rotulos::TIPOS_DEMANDA[$demanda->tipo] ?? $demanda->tipo }} · {{ \App\Suporte\Rotulos::PRIORIDADES[$demanda->prioridade] ?? $demanda->prioridade }} · {{ $demanda->contato_tecnico }}</p>
@endif
