<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proposta {{ $codigo }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Georgia,'Times New Roman',Times,serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e7e5e4;">
          <tr>
            <td style="padding:32px 32px 8px;font-size:16px;line-height:1.55;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 18px;">Olá, {{ $primeiroNome }},</p>
              <p style="margin:0 0 18px;">
                Encaminhamos a proposta comercial <strong>{{ $codigo }}</strong>
                (versão {{ $versao }}) da <strong>{{ $nomeEmpresa }}</strong>.
              </p>
              <p style="margin:0 0 12px;">
                No link abaixo, você poderá consultar todos os detalhes da proposta e também
                <strong>aprovar</strong> ou <strong>recusar</strong>.
              </p>
              <p style="margin:0 0 12px;">
                O acesso é pessoal. Por favor, não compartilhe este link.
                @if ($expiraEmLabel)
                  Validade da proposta: <strong>{{ $expiraEmLabel }}</strong>.
                @endif
              </p>
              <p style="margin:0 0 10px;text-align:center;">
                <a href="{{ $url }}"
                   style="display:inline-block;background:#1a3568;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:4px;font-weight:600;font-size:14px;letter-spacing:0.02em;">
                  Acesse a proposta
                </a>
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#78716c;word-break:break-all;line-height:1.45;">
                Se o botão não abrir, copie e cole no navegador:<br>{{ $url }}
              </p>
              @if ($replyToAddress)
                <p style="margin:20px 0 0;font-size:13px;color:#57534e;">
                  Dúvidas? Responda este e-mail — a mensagem chega em {{ $replyToAddress }}.
                </p>
              @endif
              <p style="margin:20px 0 0;font-size:14px;color:#44403c;">
                Ficamos à disposição para qualquer dúvida!<br>
                <strong>{{ $nomeEmpresa }}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;font-size:11px;color:#a8a29e;border-top:1px solid #f5f5f4;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              {{ $nomeEmpresa }} · {{ config('erp.brand.licensee_product') }} · Powered by TRIGGER
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
