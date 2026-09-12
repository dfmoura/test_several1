Ordem de compra {{ $codigo }}{{ !empty($urgente) ? ' (urgente)' : '' }}

Olá, {{ $primeiroNome }},

Segue a ordem de compra {{ $codigo }} da {{ $nomeEmpresa }}.

Comprador
{{ $empresa['razao_social'] ?? $nomeEmpresa }}@if (!empty($empresa['cnpj'])) · CNPJ {{ $empresa['cnpj'] }}@endif

@if (!empty($empresa['endereco']))
{{ $empresa['endereco'] }}
@endif
@if (!empty($empresa['telefone']) || !empty($empresa['email']))
@if (!empty($empresa['telefone']))Tel. {{ $empresa['telefone'] }}@endif@classif (!empty($empresa['telefone']) && !empty($empresa['email'])) · @endif@if (!empty($empresa['email'])){{ $empresa['email'] }}@endif

@endif
Fornecedor
{{ $fornecedor['razao_social'] ?? '' }}@if (!empty($fornecedor['cnpj_cpf'])) · {{ $fornecedor['cnpj_cpf'] }}@endif

@if (!empty($fornecedor['endereco']))
{{ $fornecedor['endereco'] }}
@endif
@if (!empty($condicao_pagamento))
Condição de pagamento: {{ $condicao_pagamento }}
@endif
@if (!empty($previsao_entrega))
Previsão de entrega: {{ $previsao_entrega }}
@endif

Itens
@foreach ($itens as $item)
- {{ $item['codigo'] }} — {{ $item['descricao'] }} | {{ $item['qtde'] }} {{ $item['unidade'] }} × {{ $item['valor_unitario'] }} = {{ $item['valor_total'] }}@if (!empty($item['valor_ipi']) && (float) $item['valor_ipi'] > 0) | IPI {{ $item['valor_ipi'] }}@if (!empty($item['aliq_ipi'])) ({{ $item['aliq_ipi'] }}%)@endif @endif@if (!empty($item['valor_icms']) && (float) $item['valor_icms'] > 0) | ICMS {{ $item['valor_icms'] }}@if (!empty($item['aliq_icms'])) ({{ $item['aliq_icms'] }}%)@endif @endif
@if (!empty($item['composicao']))
@foreach ($item['composicao'] as $faixa)
  · {{ $faixa['largura_mm'] }} mm × {{ $faixa['quantidade'] }} bob. × {{ $faixa['comprimento_m'] }} m = {{ $faixa['area_m2'] }} m²
@endforeach
@endif

@endforeach

Mercadoria: {{ $valor_total }}
IPI estimado: {{ $valor_ipi ?? '0.00' }}
ICMS estimado (destaque): {{ $valor_icms ?? '0.00' }}
@if (!empty($valor_frete) && (float) $valor_frete > 0)
Frete: {{ $valor_frete }}
@endif
Total previsto (mercadoria + IPI + frete): {{ $valor_previsto ?? $valor_total }}

@if (!empty($observacao))
Observação:
{{ $observacao }}

@endif
@if ($replyToAddress)
Dúvidas? Responda este e-mail — {{ $replyToAddress }}.

@endif
Atenciosamente,
{{ $nomeEmpresa }}

{{ $nomeEmpresa }} · {{ config('erp.brand.licensee_product') }} · Powered by TRIGGER
