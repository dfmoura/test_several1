<?php

namespace App\Services\Relatorio;

use App\Models\Empresa;
use App\Models\Relatorio;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class RelatorioPdfRenderer
{
    /**
     * @param  array{
     *   programa: array<string, mixed>,
     *   labels: array<string, string>,
     *   rows: list<array<string, mixed>>,
     *   totais: array<string, mixed>,
     *   total_linhas: int
     * }  $dataset
     */
    public function renderAndStore(Relatorio $relatorio, Empresa $empresa, array $dataset): string
    {
        $logoDataUri = $this->logoDataUri();
        $orientacao = $relatorio->orientacao === Relatorio::ORIENTACAO_PAISAGEM ? 'landscape' : 'portrait';
        $titulo = (string) ($dataset['programa']['titulo'] ?? $relatorio->titulo ?? 'Relatório');
        $emitidoEm = now()->timezone(config('app.timezone'))->format('d/m/Y H:i');

        $pdf = Pdf::loadView('relatorios.layout', [
            'titulo' => $titulo,
            'codigo' => $relatorio->codigo,
            'empresaNome' => $empresa->nome_fantasia ?: $empresa->razao_social,
            'empresaCodigo' => $empresa->codigo,
            'emitidoEm' => $emitidoEm,
            'logoDataUri' => $logoDataUri,
            'labels' => $dataset['labels'],
            'colunas' => $dataset['programa']['colunas'],
            'rows' => $dataset['rows'],
            'totais' => $dataset['totais'],
            'totalLinhas' => $dataset['total_linhas'],
            'totalDisponivel' => $dataset['total_disponivel'] ?? $dataset['total_linhas'],
            'truncado' => (bool) ($dataset['truncado'] ?? false),
            'orientacao' => $relatorio->orientacao,
        ])->setPaper('a4', $orientacao);

        $pdf->setOption('isRemoteEnabled', false);
        $pdf->setOption('isHtml5ParserEnabled', true);

        // Render primeiro — page_script itera páginas já geradas.
        $pdf->render();
        $this->aplicarNumeracaoPaginas($pdf);

        $relative = sprintf('relatorios/%d/%s.pdf', $empresa->id, $relatorio->codigo);
        Storage::disk('local')->put($relative, $pdf->output());

        return $relative;
    }

    private function aplicarNumeracaoPaginas(\Barryvdh\DomPDF\PDF $pdf): void
    {
        $dompdf = $pdf->getDomPDF();
        $canvas = $dompdf->getCanvas();
        $fontMetrics = $dompdf->getFontMetrics();
        $font = $fontMetrics->getFont('DejaVu Sans');
        $size = 8.0;

        $canvas->page_script(function (int $pageNumber, int $pageCount, $canvas, $fontMetrics) use ($font, $size) {
            $text = "Página {$pageNumber} de {$pageCount}";
            $textWidth = $fontMetrics->getTextWidth($text, $font, $size);
            // ~14mm da borda direita; ~10mm da borda inferior (área do rodapé).
            $x = $canvas->get_width() - $textWidth - 40;
            $y = $canvas->get_height() - 28;
            $canvas->text($x, $y, $text, $font, $size, [0.33, 0.33, 0.33]);
        });
    }

    private function logoDataUri(): ?string
    {
        $candidates = [
            '/var/www/branding/cliente/logo-rlp.png',
            base_path('../../branding/cliente/logo-rlp.png'),
            dirname(base_path(), 2).'/branding/cliente/logo-rlp.png',
        ];

        foreach ($candidates as $path) {
            if (is_readable($path)) {
                $bin = file_get_contents($path);
                if ($bin !== false && $bin !== '') {
                    return 'data:image/png;base64,'.base64_encode($bin);
                }
            }
        }

        return null;
    }
}
