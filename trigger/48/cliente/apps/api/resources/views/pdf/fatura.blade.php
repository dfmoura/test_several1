<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: DejaVu Sans, sans-serif; color: #0c1a33; font-size: 12px; }
    h1 { font-size: 18px; }
  </style>
</head>
<body>
  <h1>Fatura {{ $fatura->demanda->codigo }}</h1>
  <p>TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA<br>TRIGGER DATA INTELLIGENCE<br>CNPJ 53.369.941/0001-63</p>
  <p>Tomador: {{ $fatura->empresa->razao_social }}<br>CNPJ {{ \App\Suporte\Documento::formatarCnpj($fatura->empresa->cnpj) }}</p>
  <p>Serviço: {{ $fatura->demanda->titulo }}<br>Proposta v{{ $fatura->proposta->versao }}</p>
  <p>Valor: {{ \App\Suporte\Dinheiro::reais($fatura->valor_centavos) }}</p>
  <p>Abatido da reserva: {{ \App\Suporte\Dinheiro::reais($fatura->abatido_reservado_centavos) }}<br>
     Abatido do disponível: {{ \App\Suporte\Dinheiro::reais($fatura->abatido_disponivel_centavos) }}<br>
     Complemento: {{ \App\Suporte\Dinheiro::reais($fatura->complemento_centavos) }}</p>
  <p>Situação: {{ $fatura->status === 'LIQUIDADA' ? 'Liquidada' : 'Em aberto' }}
    @if($fatura->liquidada_em) em {{ $fatura->liquidada_em->timezone('America/Sao_Paulo')->format('d/m/Y H:i') }}@endif
  </p>
  <p>NFS-e: {{ $fatura->nfse_status }}. A nota fiscal não altera esta liquidação.</p>
</body>
</html>
