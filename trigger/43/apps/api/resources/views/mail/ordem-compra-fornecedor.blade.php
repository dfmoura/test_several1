<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pedido de compra {{ $codigo }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e7e5e4;">
          <tr>
            <td style="padding:28px 28px 8px;font-size:15px;line-height:1.55;">
              <p style="margin:0 0 16px;">Olá, {{ $primeiroNome }},</p>
              <p style="margin:0 0 16px;">
                Segue o pedido de compra <strong>{{ $codigo }}</strong>
                @if (!empty($urgente))
                  <span style="color:#b45309;">(urgente)</span>
                @endif
                da <strong>{{ $nomeEmpresa }}</strong>.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;font-size:13px;color:#44403c;">
                <tr>
                  <td style="padding:0 0 6px;"><strong>Comprador</strong></td>
                </tr>
                <tr>
                  <td style="padding:0 0 4px;">
                    {{ $empresa['razao_social'] ?? $nomeEmpresa }}
                    @if (!empty($empresa['cnpj']))
                      · CNPJ {{ $empresa['cnpj'] }}
                    @endif
                  </td>
                </tr>
                @if (!empty($empresa['endereco']))
                  <tr><td style="padding:0 0 4px;">{{ $empresa['endereco'] }}</td></tr>
                @endif
                @if (!empty($empresa['telefone']) || !empty($empresa['email']))
                  <tr>
                    <td style="padding:0 0 4px;">
                      @if (!empty($empresa['telefone']))Tel. {{ $empresa['telefone'] }}@endif
                      @if (!empty($empresa['telefone']) && !empty($empresa['email'])) · @endif
                      @if (!empty($empresa['email'])){{ $empresa['email'] }}@endif
                    </td>
                  </tr>
                @endif
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;font-size:13px;color:#44403c;">
                <tr>
                  <td style="padding:0 0 6px;"><strong>Fornecedor</strong></td>
                </tr>
                <tr>
                  <td style="padding:0 0 4px;">
                    {{ $fornecedor['razao_social'] ?? '' }}
                    @if (!empty($fornecedor['cnpj_cpf']))
                      · {{ $fornecedor['cnpj_cpf'] }}
                    @endif
                  </td>
                </tr>
                @if (!empty($fornecedor['endereco']))
                  <tr><td style="padding:0 0 4px;">{{ $fornecedor['endereco'] }}</td></tr>
                @endif
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 12px;font-size:13px;color:#44403c;">
                @if (!empty($condicao_pagamento))
                  <tr><td style="padding:0 0 4px;">Condição de pagamento: <strong>{{ $condicao_pagamento }}</strong></td></tr>
                @endif
                @if (!empty($previsao_entrega))
                  <tr><td style="padding:0 0 4px;">Previsão de entrega: <strong>{{ $previsao_entrega }}</strong></td></tr>
                @endif
                @if (!empty($mod_frete_label))
                  <tr><td style="padding:0 0 4px;">Frete: <strong>{{ $mod_frete_label }}</strong></td></tr>
                @endif
                @if (!empty($transportador))
                  <tr>
                    <td style="padding:0 0 4px;">
                      Transportador:
                      <strong>{{ $transportador['razao_social'] ?? '' }}</strong>
                      @if (!empty($transportador['cnpj_cpf']))
                        · {{ $transportador['cnpj_cpf'] }}
                      @endif
                      @if (!empty($transportador['ie']))
                        · IE {{ $transportador['ie'] }}
                      @endif
                      @if (!empty($transportador['endereco']))
                        <br><span style="color:#57534e;">{{ $transportador['endereco'] }}</span>
                      @endif
                    </td>
                  </tr>
                @endif
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 16px;font-size:13px;">
                <thead>
                  <tr style="background:#f5f5f4;">
                    <th align="left" style="padding:8px;border-bottom:1px solid #e7e5e4;">Item</th>
                    <th align="right" style="padding:8px;border-bottom:1px solid #e7e5e4;">Qtde</th>
                    <th align="left" style="padding:8px;border-bottom:1px solid #e7e5e4;">Un.</th>
                    <th align="right" style="padding:8px;border-bottom:1px solid #e7e5e4;">Unit.</th>
                    <th align="right" style="padding:8px;border-bottom:1px solid #e7e5e4;">Mercadoria</th>
                    <th align="right" style="padding:8px;border-bottom:1px solid #e7e5e4;">IPI</th>
                    <th align="right" style="padding:8px;border-bottom:1px solid #e7e5e4;">ICMS</th>
                  </tr>
                </thead>
                <tbody>
                  @foreach ($itens as $item)
                    <tr>
                      <td style="padding:8px;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                        <strong>{{ $item['codigo'] }}</strong><br>
                        <span style="color:#57534e;">{{ $item['descricao'] }}</span>
                        @if (!empty($item['composicao']))
                          <div style="margin-top:6px;font-size:12px;color:#57534e;">
                            <strong>Detalhe físico (faixas)</strong>
                            <ul style="margin:4px 0 0;padding-left:18px;">
                              @foreach ($item['composicao'] as $faixa)
                                <li>
                                  {{ $faixa['largura_mm'] }} mm × {{ $faixa['quantidade'] }} vol. × {{ $faixa['comprimento_m'] }} m
                                  = {{ $faixa['area_m2'] }} m²
                                </li>
                              @endforeach
                            </ul>
                            <div style="margin-top:4px;">Pedido: {{ $item['qtde'] }} {{ $item['unidade'] }}</div>
                          </div>
                        @endif
                      </td>
                      <td align="right" style="padding:8px;border-bottom:1px solid #f5f5f4;vertical-align:top;">{{ $item['qtde'] }}</td>
                      <td style="padding:8px;border-bottom:1px solid #f5f5f4;vertical-align:top;">{{ $item['unidade'] }}</td>
                      <td align="right" style="padding:8px;border-bottom:1px solid #f5f5f4;vertical-align:top;">{{ $item['valor_unitario'] }}</td>
                      <td align="right" style="padding:8px;border-bottom:1px solid #f5f5f4;vertical-align:top;">{{ $item['valor_total'] }}</td>
                      <td align="right" style="padding:8px;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                        {{ $item['valor_ipi'] ?? '0.00' }}
                        @if (!empty($item['aliq_ipi']))
                          <div style="font-size:11px;color:#78716c;">{{ $item['aliq_ipi'] }}%</div>
                        @endif
                      </td>
                      <td align="right" style="padding:8px;border-bottom:1px solid #f5f5f4;vertical-align:top;">
                        {{ $item['valor_icms'] ?? '0.00' }}
                        @if (!empty($item['aliq_icms']))
                          <div style="font-size:11px;color:#78716c;">{{ $item['aliq_icms'] }}%</div>
                        @endif
                      </td>
                    </tr>
                  @endforeach
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4" align="right" style="padding:10px 8px;">Mercadoria</td>
                    <td align="right" style="padding:10px 8px;">{{ $valor_total }}</td>
                    <td align="right" style="padding:10px 8px;">{{ $valor_ipi ?? '0.00' }}</td>
                    <td align="right" style="padding:10px 8px;">{{ $valor_icms ?? '0.00' }}</td>
                  </tr>
                  @if (!empty($valor_frete) && (float) $valor_frete > 0)
                    <tr>
                      <td colspan="6" align="right" style="padding:4px 8px;color:#57534e;">Frete</td>
                      <td align="right" style="padding:4px 8px;">{{ $valor_frete }}</td>
                    </tr>
                  @endif
                  <tr>
                    <td colspan="6" align="right" style="padding:10px 8px;font-weight:600;">Total previsto (mercadoria + IPI)</td>
                    <td align="right" style="padding:10px 8px;font-weight:600;">{{ $valor_previsto ?? $valor_total }}</td>
                  </tr>
                </tfoot>
              </table>
              <p style="margin:0 0 16px;font-size:12px;color:#78716c;">
                ICMS é destaque estimado (não soma no total). Valores da NF na entrada prevalecem.
              </p>

              @if (!empty($observacao))
                <p style="margin:0 0 16px;font-size:13px;color:#44403c;">
                  <strong>Observação:</strong><br>
                  {!! nl2br(e($observacao)) !!}
                </p>
              @endif

              @if ($replyToAddress)
                <p style="margin:20px 0 0;font-size:13px;color:#57534e;">
                  Dúvidas? Responda este e-mail — a mensagem chega em {{ $replyToAddress }}.
                </p>
              @endif
              <p style="margin:16px 0 0;font-size:14px;color:#44403c;">
                Atenciosamente,<br>
                <strong>{{ $nomeEmpresa }}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;font-size:11px;color:#a8a29e;border-top:1px solid #f5f5f4;">
              {{ $nomeEmpresa }} · {{ config('erp.brand.licensee_product') }} · Powered by TRIGGER
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
