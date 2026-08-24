<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proposta {{ $codigo }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;font-size:15px;line-height:1.5;">
              <p style="margin:0 0 16px;">Olá, {{ $primeiroNome }}!</p>
              <p style="margin:0 0 16px;">
                Segue a proposta <strong>{{ $codigo }}</strong> v{{ $versao }} da <strong>{{ $nomeEmpresa }}</strong>.
              </p>
              <p style="margin:0 0 24px;">
                Abra o link abaixo (acesso pessoal — não encaminhe) para ver, aprovar ou recusar.
                @if ($expiraEmLabel)
                  Válida até <strong>{{ $expiraEmLabel }}</strong>.
                @endif
              </p>
              <p style="margin:0 0 28px;text-align:center;">
                <a href="{{ $url }}"
                   style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-size:14px;">
                  Abrir proposta
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#52525b;word-break:break-all;">
                Ou copie: {{ $url }}
              </p>
              @if ($replyToAddress)
                <p style="margin:16px 0 0;font-size:13px;color:#52525b;">
                  Dúvidas? Responda este e-mail — a mensagem chega em {{ $replyToAddress }}.
                </p>
              @endif
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;font-size:11px;color:#a1a1aa;border-top:1px solid #f4f4f5;">
              Enviado por {{ $nomeEmpresa }} via {{ config('erp.brand.licensee_product') }} · Powered by TRIGGER
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
