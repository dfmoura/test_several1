<?php

namespace App\Services\Compras;

use App\Jobs\SyncDfeEmpresaJob;
use App\Models\DfeDocumento;
use App\Models\DfeSyncEstado;
use App\Models\Empresa;
use App\Services\Cadastros\EmpresaCertificadoA1Materializer;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use App\Services\Fiscal\Dfe\DfeDistribuicaoClient;
use App\Services\Fiscal\Dfe\DfeDocZip;
use App\Services\Fiscal\NfeChaveAcesso;
use App\Services\Fiscal\NfeCompraExtractor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Orquestra sync DF-e: enfileira (request leve) + executa lote no job.
 * Norma: ADR_CAIXA_DFE_NFE_DESTINADAS · BL-091.
 */
class DfeSyncService
{
    public function __construct(
        private readonly DfeCaixaService $caixa,
        private readonly EmpresaCertificadoA1Service $a1,
        private readonly EmpresaCertificadoA1Materializer $materializer,
        private readonly DfeDistribuicaoClient $client,
        private readonly NfeCompraExtractor $extractor,
    ) {}

    public function stagePermiteSync(?string $stage = null): bool
    {
        $s = strtolower(trim((string) ($stage ?? config('erp.stage', 'local'))));
        $ok = config('erp.dfe.stages_permitidos', ['homolog', 'production']);

        return is_array($ok) && in_array($s, $ok, true);
    }

    /**
     * Motivo legível se não puder sincronizar agora (UI).
     */
    public function motivoBloqueio(Empresa $empresa): ?string
    {
        if (! $this->stagePermiteSync()) {
            return 'A sincronização com o fisco (DF-e) está disponível na nuvem (homologação/produção), com certificado A1. Neste ambiente use o upload de XML na ordem de compra.';
        }
        if (! $this->a1->aptoParaOperar($empresa)) {
            return $this->a1->mensagemBloqueioOperacao($empresa);
        }

        return null;
    }

    /**
     * Enfileira sync — não chama SEFAZ no request.
     *
     * @return array<string, mixed>
     */
    public function enfileirar(Empresa $empresa): array
    {
        $bloqueio = $this->motivoBloqueio($empresa);
        if ($bloqueio !== null) {
            throw ValidationException::withMessages([
                'sync' => [$bloqueio],
            ]);
        }

        $estado = $this->estadoOuCriar($empresa);

        if ($estado->sync_status === DfeSyncEstado::STATUS_RUNNING
            && $estado->updated_at
            && $estado->updated_at->gt(now()->subMinutes(10))
        ) {
            $out = $this->caixa->syncEstado($empresa);
            $out['enfileirado'] = false;
            $out['ja_em_andamento'] = true;
            $out['pode_sincronizar'] = true;
            $out['sync_bloqueio'] = null;

            return $out;
        }

        $estado->sync_status = DfeSyncEstado::STATUS_RUNNING;
        $estado->sync_mensagem = 'Sincronização enfileirada…';
        if (! $estado->ano_alvo_hidratacao) {
            $estado->ano_alvo_hidratacao = (int) now()->year;
        }
        $estado->save();

        SyncDfeEmpresaJob::dispatch($empresa->id, 1);

        $out = $this->caixa->syncEstado($empresa);
        $out['enfileirado'] = true;
        $out['ja_em_andamento'] = false;
        $out['pode_sincronizar'] = true;
        $out['sync_bloqueio'] = null;

        return $out;
    }

    /**
     * Um lote DF-e (job). Pode reenfileirar a si mesmo.
     */
    public function executarLote(int $empresaId, int $rodada = 1): void
    {
        $empresa = Empresa::query()->find($empresaId);
        if ($empresa === null) {
            return;
        }

        $bloqueio = $this->motivoBloqueio($empresa);
        if ($bloqueio !== null) {
            $this->marcarErro($empresa, $bloqueio);

            return;
        }

        $estado = $this->estadoOuCriar($empresa);
        $estado->sync_status = DfeSyncEstado::STATUS_RUNNING;
        $estado->sync_mensagem = 'Consultando DF-e (lote '.$rodada.')…';
        $estado->save();

        $material = null;
        try {
            $material = $this->materializer->materializar($empresa);
            $cnpj = preg_replace('/\D/', '', (string) $empresa->cnpj) ?? '';
            $cuf = NfeChaveAcesso::cuf((string) ($empresa->uf ?: 'MG'));
            $ult = str_pad(preg_replace('/\D/', '', (string) $estado->ultimo_nsu) ?: '0', 15, '0', STR_PAD_LEFT);
            $tpAmb = strtolower((string) config('erp.stage')) === 'production' ? 1 : 2;

            $resultado = $this->client->distNsu(
                $cnpj,
                $cuf,
                $ult,
                $material['path'],
                $material['senha'],
                $tpAmb,
            );

            DB::transaction(function () use ($empresa, $resultado, $estado) {
                foreach ($resultado->documentos as $doc) {
                    $this->persistirDoc($empresa, $doc);
                }

                $estado->ultimo_nsu = $resultado->ultNsu !== '' ? $resultado->ultNsu : $estado->ultimo_nsu;
                $estado->max_nsu = $resultado->maxNsu !== '' ? $resultado->maxNsu : $estado->max_nsu;
                $estado->ultima_sync_em = now();
                $estado->sync_mensagem = trim($resultado->cStat.' — '.$resultado->xMotivo);
                $estado->save();
            });

            if ($resultado->consumoIndevido()) {
                $this->marcarErro(
                    $empresa,
                    'SEFAZ: consumo indevido (aguarde alguns minutos antes de atualizar de novo).',
                );

                return;
            }

            $maxLotes = (int) config('erp.dfe.max_lotes_por_corrida', 5);
            $continuar = $resultado->temDocumentos()
                && ! $resultado->esgotado()
                && $rodada < $maxLotes
                && $resultado->ultNsu !== ''
                && $resultado->maxNsu !== ''
                && $resultado->ultNsu < $resultado->maxNsu;

            if ($continuar) {
                $delay = (int) config('erp.dfe.delay_entre_lotes_sec', 3);
                SyncDfeEmpresaJob::dispatch($empresa->id, $rodada + 1)->delay(now()->addSeconds($delay));

                $estado->sync_mensagem = 'Lote '.$rodada.' ok — continuando…';
                $estado->save();

                return;
            }

            $estado->refresh();
            if ($resultado->esgotado() || $rodada >= $maxLotes) {
                if ($resultado->esgotado()) {
                    $estado->primeira_hidratacao_completa = true;
                }
                $estado->sync_status = DfeSyncEstado::STATUS_IDLE;
                $estado->sync_mensagem = $resultado->esgotado()
                    ? 'Sincronização concluída ('.$resultado->xMotivo.').'
                    : 'Sincronização parcial — clique em Atualizar para continuar.';
                $estado->ultima_sync_em = now();
                $estado->save();
            }
        } catch (Throwable $e) {
            Log::warning('dfe.sync.falha', [
                'empresa_id' => $empresaId,
                'rodada' => $rodada,
                'erro' => $e->getMessage(),
            ]);
            $this->marcarErro($empresa, 'Falha no sync DF-e: '.$e->getMessage());
        } finally {
            $this->materializer->liberar($material);
        }
    }

    private function persistirDoc(Empresa $empresa, DfeDocZip $doc): void
    {
        $meta = $this->extrairMeta($doc);
        $chave = $meta['chave'];

        $row = DfeDocumento::query()
            ->where('empresa_id', $empresa->id)
            ->where('nsu', $doc->nsu)
            ->first();

        if ($row === null && $chave !== null) {
            $row = DfeDocumento::query()
                ->where('empresa_id', $empresa->id)
                ->where('chave', $chave)
                ->first();
        }

        $xmlPath = $row?->xml_path;
        $xmlSha = $row?->xml_sha256;
        $isProc = str_contains(strtolower($doc->schema), 'procnfe')
            || str_contains($doc->xml, '<nfeProc')
            || str_contains($doc->xml, '<NFe');

        if ($isProc && $chave !== null) {
            $path = sprintf('dfe-documentos/%d/%s.xml', $empresa->id, $chave);
            Storage::disk((string) config('erp.dfe.xml_disk', 'local'))->put($path, $doc->xml);
            $xmlPath = $path;
            $xmlSha = hash('sha256', $doc->xml);
        }

        $payload = [
            'empresa_id' => $empresa->id,
            'nsu' => $doc->nsu,
            'schema_dfe' => mb_substr($doc->schema, 0, 40) ?: null,
            'chave' => $chave,
            'modelo' => $meta['modelo'],
            'serie' => $meta['serie'],
            'numero' => $meta['numero'],
            'data_emissao' => $meta['data_emissao'],
            'emit_cnpj' => $meta['emit_cnpj'],
            'emit_nome' => $meta['emit_nome'],
            'valor_total' => $meta['valor_total'],
            'xml_path' => $xmlPath,
            'xml_sha256' => $xmlSha,
            'resumo' => [
                'schema' => $doc->schema,
                'origem' => 'dfe',
            ],
        ];

        if ($row) {
            if ($row->situacao === DfeDocumento::SITUACAO_RECEBIDA
                || $row->situacao === DfeDocumento::SITUACAO_AMARRADA
            ) {
                // Não rebaixa situação operacional.
                unset($payload['situacao']);
            } elseif ($xmlPath && ! $row->temXml()) {
                $payload['situacao'] = DfeDocumento::SITUACAO_DISPONIVEL;
            }
            $row->fill($payload)->save();

            return;
        }

        $payload['situacao'] = $xmlPath
            ? DfeDocumento::SITUACAO_DISPONIVEL
            : DfeDocumento::SITUACAO_NOVA;

        DfeDocumento::query()->create($payload);
    }

    /**
     * @return array{
     *   chave: ?string,
     *   modelo: ?string,
     *   serie: ?string,
     *   numero: ?string,
     *   data_emissao: ?string,
     *   emit_cnpj: ?string,
     *   emit_nome: ?string,
     *   valor_total: ?string
     * }
     */
    private function extrairMeta(DfeDocZip $doc): array
    {
        $vazio = [
            'chave' => null,
            'modelo' => null,
            'serie' => null,
            'numero' => null,
            'data_emissao' => null,
            'emit_cnpj' => null,
            'emit_nome' => null,
            'valor_total' => null,
        ];

        if (str_contains($doc->xml, 'resNFe') && ! str_contains($doc->xml, 'infNFe')) {
            $xml = @simplexml_load_string($doc->xml);
            if ($xml === false) {
                return $vazio;
            }
            $xml->registerXPathNamespace('nfe', 'http://www.portalfiscal.inf.br/nfe');
            $nodes = $xml->xpath('//*[local-name()="resNFe"]') ?: [$xml];
            $n = $nodes[0];
            $chave = preg_replace('/\D/', '', (string) ($n->chNFe ?? '')) ?: null;
            $chave = $chave && strlen($chave) === 44 ? $chave : null;
            $dh = (string) ($n->dhEmi ?? '');
            $data = $dh !== '' ? substr($dh, 0, 10) : null;
            $cnpj = preg_replace('/\D/', '', (string) ($n->CNPJ ?? $n->CPF ?? '')) ?: null;
            $valor = trim((string) ($n->vNF ?? ''));

            return [
                'chave' => $chave,
                'modelo' => $chave ? substr($chave, 20, 2) : null,
                'serie' => $chave ? (string) (int) substr($chave, 22, 3) : null,
                'numero' => $chave ? (string) (int) substr($chave, 25, 9) : null,
                'data_emissao' => $data,
                'emit_cnpj' => $cnpj && strlen($cnpj) >= 11 ? $cnpj : null,
                'emit_nome' => ($nome = trim((string) ($n->xNome ?? ''))) !== '' ? mb_substr($nome, 0, 120) : null,
                'valor_total' => $valor !== '' ? $valor : null,
            ];
        }

        try {
            $compra = $this->extractor->extractCompra($doc->xml);
        } catch (Throwable) {
            return $vazio;
        }

        $emit = $compra['emit'] ?? [];

        return [
            'chave' => $compra['chave_nfe'] ?? null,
            'modelo' => $compra['modelo'] ?? null,
            'serie' => $compra['serie'] ?? null,
            'numero' => $compra['numero'] ?? null,
            'data_emissao' => $compra['data_emissao'] ?? null,
            'emit_cnpj' => isset($emit['cnpj_cpf']) ? preg_replace('/\D/', '', (string) $emit['cnpj_cpf']) : null,
            'emit_nome' => isset($emit['razao_social']) ? mb_substr((string) $emit['razao_social'], 0, 120) : null,
            'valor_total' => $compra['valor_nf'] ?? null,
        ];
    }

    private function estadoOuCriar(Empresa $empresa): DfeSyncEstado
    {
        return DfeSyncEstado::query()->firstOrCreate(
            ['empresa_id' => $empresa->id],
            [
                'ultimo_nsu' => '0',
                'sync_status' => DfeSyncEstado::STATUS_IDLE,
                'ano_alvo_hidratacao' => (int) now()->year,
            ],
        );
    }

    private function marcarErro(Empresa $empresa, string $mensagem): void
    {
        $estado = $this->estadoOuCriar($empresa);
        $estado->sync_status = DfeSyncEstado::STATUS_ERRO;
        $estado->sync_mensagem = mb_substr($mensagem, 0, 500);
        $estado->ultima_sync_em = now();
        $estado->save();

        // Volta a IDLE após registrar erro — UI pode tentar de novo.
        $estado->sync_status = DfeSyncEstado::STATUS_IDLE;
        $estado->save();
    }

    /**
     * @return array<string, mixed>
     */
    public function syncEstadoEnriquecido(Empresa $empresa): array
    {
        $out = $this->caixa->syncEstado($empresa);
        $bloqueio = $this->motivoBloqueio($empresa);
        $out['pode_sincronizar'] = $bloqueio === null;
        $out['sync_bloqueio'] = $bloqueio;

        return $out;
    }
}
