Olá, {{ $primeiroNome }}!

Segue a proposta {{ $codigo }} v{{ $versao }} da {{ $nomeEmpresa }}:

{{ $url }}
@if ($expiraEmLabel)
Válida até {{ $expiraEmLabel }}.
@endif

Abra o link (acesso pessoal — não encaminhe) para ver, aprovar ou recusar.
@if ($replyToAddress)

Dúvidas? Responda este e-mail — a mensagem chega em {{ $replyToAddress }}.
@endif

—
{{ $nomeEmpresa }} via {{ config('erp.brand.licensee_product') }} · Powered by TRIGGER
