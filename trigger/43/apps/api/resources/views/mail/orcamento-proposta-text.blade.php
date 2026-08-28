Olá, {{ $primeiroNome }},

Encaminhamos a proposta comercial {{ $codigo }} (versão {{ $versao }}) da {{ $nomeEmpresa }}.

Para visualizar, aprovar ou recusar, abra o link abaixo (acesso pessoal — não encaminhe):
{{ $url }}
@if ($expiraEmLabel)

Validade: {{ $expiraEmLabel }}.
@endif
@if ($replyToAddress)

Dúvidas? Responda este e-mail — a mensagem chega em {{ $replyToAddress }}.
@endif

Atenciosamente,
{{ $nomeEmpresa }}

—
{{ $nomeEmpresa }} · {{ config('erp.brand.licensee_product') }} · Powered by TRIGGER
