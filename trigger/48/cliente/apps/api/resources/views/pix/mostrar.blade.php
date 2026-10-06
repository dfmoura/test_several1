@extends('layouts.cliente')
@section('titulo', 'PIX')
@section('conteudo')
  <div class="card" x-data="{}" x-init="setInterval(async () => { const r = await fetch('{{ route('pix.situacao', $cobranca->txid) }}'); const j = await r.json(); if (j.paga) location.href = j.para; }, 4000)">
    <p class="kicker">{{ $cobranca->finalidade === 'ATIVACAO' ? 'Ativação' : ($cobranca->finalidade === 'RECARGA' ? 'Recarga' : 'Diferença da fatura') }}</p>
    <h1>@reais($cobranca->valor_centavos)</h1>
    <p class="muted">Esta cobrança continua valendo se você sair e voltar, até {{ $cobranca->expira_em?->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}.</p>
    @if($simulado)
      <div class="flash flash-aviso">Ambiente local: o pagamento é simulado e passa pela mesma baixa do banco.</div>
    @endif
    <div class="qr">{!! $qr !!}</div>
    <label for="copia">Copia e cola</label>
    <textarea id="copia" class="pix-code" readonly>{{ $cobranca->payload_copia_cola }}</textarea>
    <p class="row">
      <button type="button" class="btn-ghost" onclick="navigator.clipboard.writeText(document.getElementById('copia').value)">Copiar código</button>
      @if($simulado && $cobranca->status === 'ATIVA')
        <form method="post" action="{{ route('pix.simular', $cobranca->txid) }}">@csrf<button type="submit">Simular pagamento</button></form>
      @endif
    </p>
    <p>Status: {{ $cobranca->status === 'PAGA' ? 'pago' : 'aguardando o banco' }}</p>
  </div>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"></script>
@endsection
