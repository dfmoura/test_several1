<?php

namespace App\Services\Compras;

use App\Models\DfeDocumento;
use App\Models\DfeSyncEstado;
use App\Models\Empresa;
use App\Services\Fiscal\NfeCompraExtractor;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Importa XMLs oficiais (nfeProc) para a caixa DF-e — só notebook / ERP_STAGE=local.
 * Reusa o mesmo cofre e metadados do sync SEFAZ; não chama o Ambiente Nacional.
 * Norma: docs/ADR_CAIXA_DFE_NFE_DESTINADAS.md (plano B local enriquecido).
 */
class DfeImportXmlLocalService
{
    public function __construct(
        private readonly NfeCompraExtractor $extractor,
    ) {}

    /**
     * @return array{
     *   criados: int,
     *   atualizados: int,
     *   ignorados: int,
     *   erros: list<array{arquivo: string, motivo: string}>
     * }
     */
    public function importarPasta(
        Empresa $empresa,
        string $pasta,
        bool $exigirDestinoEmp = true,
    ): array {
        $pasta = rtrim($pasta, DIRECTORY_SEPARATOR);
        if (! is_dir($pasta) || ! is_readable($pasta)) {
            throw new \InvalidArgumentException("Pasta inacessível: {$pasta}");
        }

        $criados = 0;
        $atualizados = 0;
        $ignorados = 0;
        $erros = [];

        $arquivos = glob($pasta.DIRECTORY_SEPARATOR.'*.{xml,XML}', GLOB_BRACE) ?: [];
        sort($arquivos, SORT_STRING);

        $cnpjEmp = preg_replace('/\D/', '', (string) $empresa->cnpj) ?: '';

        foreach ($arquivos as $path) {
            $nome = basename($path);
            try {
                $xml = file_get_contents($path);
                if ($xml === false || trim($xml) === '') {
                    $erros[] = ['arquivo' => $nome, 'motivo' => 'Arquivo vazio ou ilegível.'];
                    continue;
                }

                $resultado = $this->importarXml($empresa, $xml, $cnpjEmp, $exigirDestinoEmp, $nome);
                if ($resultado === 'criado') {
                    $criados++;
                } elseif ($resultado === 'atualizado') {
                    $atualizados++;
                } else {
                    $ignorados++;
                }
            } catch (Throwable $e) {
                $erros[] = ['arquivo' => $nome, 'motivo' => $e->getMessage()];
            }
        }

        $this->atualizarEstadoSync($empresa, $criados + $atualizados);

        return compact('criados', 'atualizados', 'ignorados', 'erros');
    }

    /**
     * @return 'criado'|'atualizado'|'ignorado'
     */
    public function importarXml(
        Empresa $empresa,
        string $xml,
        ?string $cnpjEmp = null,
        bool $exigirDestinoEmp = true,
        ?string $rotuloArquivo = null,
    ): string {
        $cnpjEmp ??= preg_replace('/\D/', '', (string) $empresa->cnpj) ?: '';

        try {
            $compra = $this->extractor->extractCompra($xml);
        } catch (Throwable $e) {
            throw new \InvalidArgumentException(
                'XML inválido'.($rotuloArquivo ? " ({$rotuloArquivo})" : '').': '.$e->getMessage(),
                0,
                $e,
            );
        }

        $chave = preg_replace('/\D/', '', (string) ($compra['chave_nfe'] ?? '')) ?: null;
        if ($chave === null || strlen($chave) !== 44) {
            throw new \InvalidArgumentException('Chave de acesso ausente ou inválida (44 dígitos).');
        }

        $dest = preg_replace('/\D/', '', (string) ($compra['dest_cnpj'] ?? $compra['dest_cpf'] ?? '')) ?: '';
        if ($exigirDestinoEmp && $cnpjEmp !== '' && $dest !== '' && $dest !== $cnpjEmp) {
            throw new \InvalidArgumentException(
                "Destinatário {$dest} ≠ CNPJ da EMP {$cnpjEmp}.",
            );
        }

        $emit = $compra['emit'] ?? [];
        $emitCnpj = isset($emit['cnpj_cpf'])
            ? (preg_replace('/\D/', '', (string) $emit['cnpj_cpf']) ?: null)
            : null;
        $emitNome = isset($emit['razao_social'])
            ? mb_substr((string) $emit['razao_social'], 0, 120)
            : null;

        $diskPath = sprintf('dfe-documentos/%d/%s.xml', $empresa->id, $chave);
        Storage::disk((string) config('erp.dfe.xml_disk', 'local'))->put($diskPath, $xml);
        $sha = hash('sha256', $xml);

        $row = DfeDocumento::query()
            ->where('empresa_id', $empresa->id)
            ->where('chave', $chave)
            ->first();

        $payload = [
            'schema_dfe' => 'procNFe_v4.00.xsd',
            'chave' => $chave,
            'modelo' => $compra['modelo'] ?? ($chave ? substr($chave, 20, 2) : null),
            'serie' => isset($compra['serie']) ? (string) $compra['serie'] : null,
            'numero' => isset($compra['numero']) ? (string) $compra['numero'] : null,
            'data_emissao' => $compra['data_emissao'] ?? null,
            'emit_cnpj' => $emitCnpj,
            'emit_nome' => $emitNome,
            'valor_total' => $compra['valor_nf'] ?? null,
            'xml_path' => $diskPath,
            'xml_sha256' => $sha,
            'resumo' => [
                'schema' => 'procNFe_v4.00.xsd',
                'origem' => 'import-xml-local',
                'arquivo' => $rotuloArquivo,
            ],
        ];

        if ($row) {
            if (! in_array($row->situacao, [
                DfeDocumento::SITUACAO_AMARRADA,
                DfeDocumento::SITUACAO_RECEBIDA,
            ], true)) {
                $payload['situacao'] = DfeDocumento::SITUACAO_DISPONIVEL;
            }
            $row->fill($payload)->save();

            return 'atualizado';
        }

        $nsu = $this->nsuLocalEstavel($chave);

        DfeDocumento::query()->create([
            ...$payload,
            'empresa_id' => $empresa->id,
            'nsu' => $nsu,
            'situacao' => DfeDocumento::SITUACAO_DISPONIVEL,
        ]);

        return 'criado';
    }

    /**
     * NSU sintético estável (≤20) — não colide com NSU SEFAZ numérico puro.
     */
    private function nsuLocalEstavel(string $chave): string
    {
        return 'L'.substr($chave, -15);
    }

    private function atualizarEstadoSync(Empresa $empresa, int $processados): void
    {
        if ($processados <= 0) {
            return;
        }

        $estado = DfeSyncEstado::query()->firstOrCreate(
            ['empresa_id' => $empresa->id],
            [
                'ultimo_nsu' => '0',
                'sync_status' => DfeSyncEstado::STATUS_IDLE,
                'ano_alvo_hidratacao' => (int) now()->year,
            ],
        );

        $estado->fill([
            'sync_status' => DfeSyncEstado::STATUS_IDLE,
            'sync_mensagem' => sprintf(
                'Importação local de XML: %d arquivo(s) na caixa (sync SEFAZ desligado em local).',
                $processados,
            ),
            'ultima_sync_em' => now(),
            'primeira_hidratacao_completa' => true,
            'ano_alvo_hidratacao' => (int) now()->year,
        ])->save();
    }
}
