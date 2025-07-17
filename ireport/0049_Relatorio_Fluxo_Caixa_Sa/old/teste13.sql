"Saldo 'A Receber' anterior até " +
    new java.text.SimpleDateFormat("dd/MM/yyyy").format(
        new java.util.Date(
            $P{DT_ESCOLHA} == null ? ($P{DTINI}.getTime() - (1000 * 60 * 60 * 24)) : $P{DT_ESCOLHA}.getTime()
        )
    ) +
    " |  Provisão: " +
    new java.text.DecimalFormat("#,##0.00").format($F{A_RECEBER_PROV_S}) +
    "  Real: " +
    new java.text.DecimalFormat("#,##0.00").format($F{A_RECEBER_PROV_N}) +
    "  Real Vendas Veículos: " +
    new java.text.DecimalFormat("#,##0.00").format($F{A_REC_VEIC_PROV_N}) +
    "  Total: " +
    new java.text.DecimalFormat("#,##0.00").format($F{A_RECEBER_TOT})



"Saldo 'A Pagar' anterior até " +
    new java.text.SimpleDateFormat("dd/MM/yyyy").format(
        (new java.util.Date(
            $P{DT_ESCOLHA} == null ? ($P{DTINI}.getTime() - (1000 * 60 * 60 * 24)) : $P{DT_ESCOLHA}.getTime()
        ))
    ) +
    " |  Provisão: " +
    new java.text.DecimalFormat("#,##0.00").format($F{A_PAGAR_PROV_S}) +
    "  Real: " +
    new java.text.DecimalFormat("#,##0.00").format($F{A_PAGAR_PROV_N}) +
    "  Total: " +
    new java.text.DecimalFormat("#,##0.00").format($F{A_PAGAR_TOT})