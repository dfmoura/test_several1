<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 28mm 14mm 22mm 14mm;
        }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9pt;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
        }
        .header {
            position: fixed;
            top: -22mm;
            left: 0;
            right: 0;
            height: 18mm;
            border-bottom: 1.5pt solid #1a3568;
            padding-bottom: 3mm;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
        }
        .header-table td {
            vertical-align: middle;
            padding: 0;
        }
        .logo {
            max-height: 14mm;
            max-width: 42mm;
        }
        .brand-fallback {
            font-size: 14pt;
            font-weight: bold;
            color: #1a3568;
            letter-spacing: 0.05em;
        }
        .header-meta {
            text-align: right;
            font-size: 8pt;
            color: #555;
        }
        .header-meta .codigo {
            color: #1a3568;
            font-weight: bold;
        }
        h1 {
            font-size: 13pt;
            color: #1a3568;
            margin: 2mm 0 4mm 0;
            font-weight: bold;
        }
        .accent {
            height: 2.5pt;
            width: 28mm;
            background: #7cb518;
            margin-bottom: 4mm;
        }
        table.data {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        table.data th {
            background: #1a3568;
            color: #fff;
            font-size: 8pt;
            text-align: left;
            padding: 2.2mm 1.8mm;
            border: 0.3pt solid #1a3568;
            word-wrap: break-word;
        }
        table.data td {
            padding: 1.8mm 1.8mm;
            border: 0.3pt solid #d0d5dd;
            font-size: 8pt;
            vertical-align: top;
            word-wrap: break-word;
        }
        table.data tr:nth-child(even) td {
            background: #f7f8fa;
        }
        table.data td.cell-desenho {
            text-align: center;
            vertical-align: middle;
            width: 14mm;
        }
        table.data td.cell-desenho svg {
            width: 9mm;
            height: 9mm;
        }
        .totais {
            margin-top: 4mm;
            font-size: 8.5pt;
        }
        .totais strong {
            color: #1a3568;
        }
        .empty {
            color: #666;
            font-style: italic;
            margin-top: 6mm;
        }
        .footer {
            position: fixed;
            bottom: -16mm;
            left: 0;
            right: 0;
            height: 12mm;
            border-top: 0.6pt solid #c5cad3;
            font-size: 7.5pt;
            color: #555;
            padding-top: 2mm;
        }
        .footer-table {
            width: 100%;
            border-collapse: collapse;
        }
        .footer-table td {
            vertical-align: top;
            padding: 0;
        }
        .footer-right {
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td style="width: 45%;">
                    @if ($logoDataUri)
                        <img class="logo" src="{{ $logoDataUri }}" alt="RLP">
                    @else
                        <div class="brand-fallback">RLP</div>
                    @endif
                </td>
                <td class="header-meta">
                    <div class="codigo">{{ $codigo }}</div>
                    <div>{{ $empresaNome }} · {{ $empresaCodigo }}</div>
                    <div>{{ $orientacao === 'paisagem' ? 'Paisagem' : 'Retrato' }} · A4</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="footer">
        <table class="footer-table">
            <tr>
                <td>
                    Emitido em {{ $emitidoEm }} · Powered by TRIGGER
                </td>
                <td class="footer-right">
                    {{-- Numeração via canvas DomPDF (CSS counter(pages) é inconsistente) --}}
                </td>
            </tr>
        </table>
    </div>

    <main>
        <h1>{{ $titulo }}</h1>
        <div class="accent"></div>

        @if (count($rows) === 0)
            <p class="empty">Nenhum registro encontrado para os critérios do programa.</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        @foreach ($colunas as $col)
                            <th>{{ $labels[$col] ?? $col }}</th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @foreach ($rows as $row)
                        <tr>
                            @foreach ($colunas as $col)
                                @if ($col === 'desenho')
                                    <td class="cell-desenho">{!! $row[$col] ?? '' !!}</td>
                                @else
                                    @php
                                        $cell = $row[$col] ?? null;
                                        if (is_bool($cell)) {
                                            $cell = $cell ? 'Sim' : 'Não';
                                        } elseif (is_float($cell) || (is_numeric($cell) && str_contains((string) $cell, '.'))) {
                                            $cell = number_format((float) $cell, 2, ',', '.');
                                        }
                                    @endphp
                                    <td>{{ $cell }}</td>
                                @endif
                            @endforeach
                        </tr>
                    @endforeach
                </tbody>
            </table>

            <div class="totais">
                @if (!empty($truncado) && isset($totalDisponivel))
                    <strong>Exibindo {{ $totalLinhas }} de {{ $totalDisponivel }}</strong> registro(s) (recorte por limite)
                @else
                    <strong>{{ $totalLinhas }}</strong> linha(s)
                @endif
                @foreach ($totais as $campo => $valor)
                    · {{ $labels[$campo] ?? $campo }}:
                    <strong>{{ is_numeric($valor) ? number_format((float) $valor, 2, ',', '.') : $valor }}</strong>
                @endforeach
            </div>
        @endif
    </main>
</body>
</html>
