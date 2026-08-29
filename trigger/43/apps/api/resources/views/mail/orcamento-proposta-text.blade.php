Olá, {{ $primeiroNome }},

Encaminhamos a proposta comercial {{ $codigo }} (versão {{ $versao }}) da {{ $nomeEmpresa }}.

No link abaixo, você poderá consultar todos os detalhes da proposta e também aprovar ou recusar.

O acesso é pessoal. Por favor, não compartilhe este link.
@if ($expiraEmLabel)

Validade da proposta: {{ $expiraEmLabel }}
@endif

Acesse a proposta:
{{ $url }}
@if ($replyToAddress)

Dúvidas? Responda este e-mail — a mensagem chega em {{ $replyToAddress }}.
@endif

Ficamos à disposição para qualquer dúvida!
{{ $nomeEmpresa }}

—
{{ $nomeEmpresa }} · {{ config('erp.brand.licensee_product') }} · Powered by TRIGGER
