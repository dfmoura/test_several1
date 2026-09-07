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
- {{ $item['codigo'] }} — {{ $item['descricao'] }} | {{ $item['qtde'] }} {{ $item['unidade'] }} × {{ $item['valor_unitario'] }} = {{ $item['valor_total'] }}
@endforeach

Total: {{ $valor_total }}

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
