<?php

namespace App\Services\Fiscal;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Parceiro;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Planeja e emite NF-e / NFS-e do FAT via hub Focus (estudo 32 / ADR_EMISSAO_NFE_NFSE).
 * HTTP só depois do FAT commit. Numeração vem da resposta Focus.
 */
class EmissaoFiscalService
{
    public function __construct(
        private readonly FiscalHubResolver $hubs,
        private readonly FocusNfeClient $client,
        private readonly FocusPayloadBuilder $payloads,
        private readonly EmissaoFiscalChecklist $checklist,
        private readonly CodigoGenerator $codigos,
    ) {}

    public function checklist(): EmissaoFiscalChecklist
    {
        return $this->checklist;
    }

    /**
     * Cria documentos PLANEJADO na mesma transação do FAT.
     * Já grava o JSON Focus (prévia) — sem POST, sem chave/número.
     */
    public function planejar(Empresa $empresa, Faturamento $fat): void
    {
        $fat->loadMissing(['itens.pedidoItem.produtoPa', 'pedido', 'parceiro', 'titulos', 'empresa']);
        $grupos = $this->agruparItens($fat);
        foreach ($grupos as $tipo => $itens) {
            if ($itens === []) {
                continue;
            }
            $existe = DocumentoFiscalSaida::query()
                ->where('faturamento_id', $fat->id)
                ->where('tipo', $tipo)
                ->exists();
            if ($existe) {
                continue;
            }

            $valor = '0.00';
            foreach ($itens as $i) {
                $valor = bcadd($valor, (string) $i['valor'], PadraoDecimal::SCALE_MONEY);
            }

            $ano = (int) now()->year;
            $ref = $this->ref($empresa, $fat, $tipo);
            $doc = DocumentoFiscalSaida::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $this->codigos->nextCode($empresa->id, 'DFS-'.$ano, 5),
                'faturamento_id' => $fat->id,
                'pedido_id' => $fat->pedido_id,
                'parceiro_id' => $fat->parceiro_id,
                'tipo' => $tipo,
                'modelo' => $tipo === DocumentoFiscalSaida::TIPO_NFSE
                    ? DocumentoFiscalSaida::MODELO_NFSE
                    : DocumentoFiscalSaida::MODELO_NFE,
                'status' => DocumentoFiscalSaida::STATUS_PLANEJADO,
                'ref' => $ref,
                'valor' => $valor,
                'criado_por' => Auth::id(),
            ]);
            $this->persistirPrevista($empresa, $fat, $doc);
        }

        $this->sincronizarNfStatus($fat);
    }

    /**
     * POST Focus se o hub estiver habilitado e o checklist passar.
     * Nunca lança para o faturamento — registra ERRO no documento.
     */
    public function emitirSeApto(Empresa $empresa, Faturamento $fat): void
    {
        try {
            $this->emitir($empresa, $fat, false);
        } catch (Throwable $e) {
            Log::warning('Emissão fiscal falhou após FAT', [
                'faturamento_id' => $fat->id,
                'empresa_id' => $empresa->id,
                'erro' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function emitir(Empresa $empresa, Faturamento $fat, bool $forcar = true): array
    {
        $this->assertEmpresa($empresa, $fat);
        $fat->loadMissing(['itens.pedidoItem.produtoPa', 'pedido.parceiro', 'parceiro', 'titulos', 'documentosFiscais']);

        if ($fat->documentosFiscais->isEmpty()) {
            $this->planejar($empresa, $fat);
            $fat->load('documentosFiscais');
        }

        $check = $this->checklist->paraFaturamento($empresa, $fat);
        $runtime = $this->hubs->runtimeSeApto($empresa);

        foreach ($fat->documentosFiscais as $doc) {
            if ($doc->status === DocumentoFiscalSaida::STATUS_CANCELADO) {
                continue;
            }
            if ($doc->status === DocumentoFiscalSaida::STATUS_AUTORIZADO) {
                continue;
            }
            if ($doc->status === DocumentoFiscalSaida::STATUS_PROCESSANDO && ! $forcar) {
                continue;
            }
            if (! $doc->podeEnviar() && $doc->status !== DocumentoFiscalSaida::STATUS_PROCESSANDO) {
                continue;
            }

            if ($runtime === null) {
                $doc->mensagem = $check['hub']['mensagem'] ?? 'Hub fiscal não habilitado.';
                $doc->save();
                continue;
            }
            if (! $check['apto_emissao'] && $doc->podeEnviar()) {
                $doc->mensagem = implode(' ', $check['pendencias']);
                $doc->save();
                continue;
            }

            $this->enviarDocumento($empresa, $fat, $doc, $runtime);
        }

        $this->sincronizarNfStatus($fat);

        return $this->documentosOut($fat->fresh(['documentosFiscais']));
    }

    /**
     * @return array<string, mixed>
     */
    public function consultar(Empresa $empresa, Faturamento $fat): array
    {
        $this->assertEmpresa($empresa, $fat);
        $fat->loadMissing(['documentosFiscais']);
        $runtime = $this->hubs->runtimeSeApto($empresa);
        if ($runtime === null) {
            return $this->documentosOut($fat);
        }

        foreach ($fat->documentosFiscais as $doc) {
            if (! in_array($doc->status, [
                DocumentoFiscalSaida::STATUS_PROCESSANDO,
                DocumentoFiscalSaida::STATUS_ERRO,
            ], true)) {
                continue;
            }
            $resultado = $doc->tipo === DocumentoFiscalSaida::TIPO_NFSE
                ? $this->client->consultarNfse($runtime['hub'], $runtime['ambiente'], $doc->ref)
                : $this->client->consultarNfe($runtime['hub'], $runtime['ambiente'], $doc->ref);
            $this->aplicarResultado($doc, $resultado, $runtime);
        }

        $this->sincronizarNfStatus($fat);

        return $this->documentosOut($fat->fresh(['documentosFiscais']));
    }

    public function cancelarPlanejados(Faturamento $fat): void
    {
        DocumentoFiscalSaida::query()
            ->where('faturamento_id', $fat->id)
            ->whereIn('status', [
                DocumentoFiscalSaida::STATUS_PLANEJADO,
                DocumentoFiscalSaida::STATUS_ERRO,
                DocumentoFiscalSaida::STATUS_REJEITADO,
            ])
            ->update([
                'status' => DocumentoFiscalSaida::STATUS_CANCELADO,
                'mensagem' => 'Cancelado com o estorno do faturamento.',
            ]);
    }

    public function sincronizarNfStatus(Faturamento $fat): void
    {
        $docs = DocumentoFiscalSaida::query()
            ->where('faturamento_id', $fat->id)
            ->where('status', '!=', DocumentoFiscalSaida::STATUS_CANCELADO)
            ->get();

        $nf = Faturamento::NF_PENDENTE;
        if ($docs->isNotEmpty()) {
            if ($docs->contains(fn ($d) => $d->status === DocumentoFiscalSaida::STATUS_PROCESSANDO)
                || ($docs->contains(fn ($d) => $d->status === DocumentoFiscalSaida::STATUS_AUTORIZADO)
                    && $docs->contains(fn ($d) => $d->status !== DocumentoFiscalSaida::STATUS_AUTORIZADO))) {
                $nf = Faturamento::NF_PROCESSANDO;
            } elseif ($docs->every(fn ($d) => $d->status === DocumentoFiscalSaida::STATUS_AUTORIZADO)) {
                $nf = Faturamento::NF_AUTORIZADA;
            } elseif ($docs->contains(fn ($d) => $d->status === DocumentoFiscalSaida::STATUS_REJEITADO)
                && ! $docs->contains(fn ($d) => in_array($d->status, [
                    DocumentoFiscalSaida::STATUS_AUTORIZADO,
                    DocumentoFiscalSaida::STATUS_PROCESSANDO,
                ], true))) {
                $nf = Faturamento::NF_REJEITADA;
            }
        }

        if ($fat->nf_status !== $nf) {
            $fat->nf_status = $nf;
            $fat->save();
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function documentosOut(?Faturamento $fat): array
    {
        if ($fat === null) {
            return [];
        }
        $fat->loadMissing(['documentosFiscais', 'empresa', 'parceiro', 'pedido.parceiro', 'itens.pedidoItem.produtoPa', 'titulos']);
        $empresa = $fat->empresa;
        if ($empresa instanceof Empresa) {
            foreach ($fat->documentosFiscais as $d) {
                $this->garantirPrevista($empresa, $fat, $d);
            }
        }

        return $fat->documentosFiscais->map(fn (DocumentoFiscalSaida $d) => $this->documentoOut($d, $fat))->all();
    }

    /**
     * @param  array{hub: \App\Models\FiscalHub, ambiente: string, base_url: string, token: string, provedor: string}  $runtime
     */
    private function enviarDocumento(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc, array $runtime): void
    {
        $parceiro = $fat->parceiro ?? $fat->pedido?->parceiro;
        if ($parceiro === null) {
            $doc->status = DocumentoFiscalSaida::STATUS_ERRO;
            $doc->mensagem = 'Faturamento sem destinatário.';
            $doc->save();

            return;
        }

        $built = $this->montarPayload($empresa, $fat, $doc, $parceiro);
        if ($built === null) {
            $doc->status = DocumentoFiscalSaida::STATUS_ERRO;
            $doc->mensagem = 'Não foi possível montar o payload fiscal.';
            $doc->save();

            return;
        }

        $doc->payload_json = $built['payload'];
        $doc->fiscal_hub_id = $runtime['hub']->id;
        $doc->ambiente = $runtime['ambiente'];
        $doc->enviado_em = now();
        $doc->status = DocumentoFiscalSaida::STATUS_PROCESSANDO;
        $doc->save();

        $resultado = $doc->tipo === DocumentoFiscalSaida::TIPO_NFSE
            ? $this->client->emitirNfse($runtime['hub'], $runtime['ambiente'], $doc->ref, $built['http'])
            : $this->client->emitirNfe($runtime['hub'], $runtime['ambiente'], $doc->ref, $built['http']);

        $this->aplicarResultado($doc, $resultado, $runtime);
    }

    /**
     * @param  array<string, mixed>  $resultado
     * @param  array{hub: \App\Models\FiscalHub, ambiente: string}|null  $runtime
     */
    private function aplicarResultado(DocumentoFiscalSaida $doc, array $resultado, ?array $runtime): void
    {
        $focus = (string) ($resultado['status_focus'] ?? '');
        $doc->response_json = $resultado['body'] ?? null;
        $doc->mensagem = mb_substr((string) ($resultado['mensagem'] ?? ''), 0, 500);
        if (! empty($resultado['chave'])) {
            $doc->chave = (string) $resultado['chave'];
        }
        if (! empty($resultado['numero']) && ctype_digit((string) $resultado['numero'])) {
            $doc->numero = (int) $resultado['numero'];
        }
        if (! empty($resultado['serie']) && ctype_digit((string) $resultado['serie'])) {
            $doc->serie = (int) $resultado['serie'];
        }
        if (! empty($resultado['protocolo'])) {
            $doc->protocolo = (string) $resultado['protocolo'];
        }
        if ($runtime !== null) {
            $doc->fiscal_hub_id = $runtime['hub']->id;
            $doc->ambiente = $runtime['ambiente'];
        }

        if ($focus === 'autorizado') {
            $doc->status = DocumentoFiscalSaida::STATUS_AUTORIZADO;
            $doc->autorizado_em = now();
        } elseif ($focus === 'processando_autorizacao') {
            $doc->status = DocumentoFiscalSaida::STATUS_PROCESSANDO;
        } elseif ($focus === 'cancelado') {
            $doc->status = DocumentoFiscalSaida::STATUS_CANCELADO;
        } elseif (($resultado['http_status'] ?? 0) >= 500 || ($resultado['http_status'] ?? 0) === 0) {
            $doc->status = DocumentoFiscalSaida::STATUS_ERRO;
        } else {
            $doc->status = DocumentoFiscalSaida::STATUS_REJEITADO;
        }
        $doc->save();
    }

    /**
     * @return array<string, mixed>
     */
    private function documentoOut(DocumentoFiscalSaida $d, Faturamento $fat): array
    {
        $payload = is_array($d->payload_json) ? $d->payload_json : [];

        return [
            'id' => $d->id,
            'codigo' => $d->codigo,
            'tipo' => $d->tipo,
            'modelo' => $d->modelo,
            'status' => $d->status,
            'ambiente' => $d->ambiente,
            'ref' => $d->ref,
            'serie' => $d->serie,
            'numero' => $d->numero,
            'chave' => $d->chave,
            'protocolo' => $d->protocolo,
            'mensagem' => $d->mensagem,
            'valor' => (string) $d->valor,
            'enviado_em' => optional($d->enviado_em)?->toIso8601String(),
            'autorizado_em' => optional($d->autorizado_em)?->toIso8601String(),
            'previa' => $this->previaDe($d, $fat, $payload),
            'envio_hub' => $payload === [] ? null : $this->payloads->paraEnvio($payload),
        ];
    }

    private function garantirPrevista(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc): void
    {
        if (is_array($doc->payload_json) && $doc->payload_json !== []) {
            return;
        }
        if (! $doc->podeEnviar()) {
            return;
        }
        $this->persistirPrevista($empresa, $fat, $doc);
    }

    private function persistirPrevista(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc): void
    {
        $parceiro = $fat->parceiro ?? $fat->pedido?->parceiro;
        if ($parceiro === null) {
            return;
        }
        $built = $this->montarPayload($empresa, $fat, $doc, $parceiro);
        if ($built === null) {
            return;
        }
        $doc->payload_json = $built['payload'];
        $doc->save();
    }

    /**
     * @return array{payload: array<string, mixed>, http: array<string, mixed>}|null
     */
    private function montarPayload(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc, Parceiro $parceiro): ?array
    {
        $itens = $this->itensDoTipo($fat, $doc->tipo);
        if ($itens === []) {
            return null;
        }

        return $doc->tipo === DocumentoFiscalSaida::TIPO_NFSE
            ? $this->payloads->nfse($empresa, $parceiro, $fat, $itens, (string) $doc->ref)
            : $this->payloads->nfe($empresa, $parceiro, $fat, $itens, (string) $doc->ref);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function previaDe(DocumentoFiscalSaida $d, Faturamento $fat, array $payload): array
    {
        $oficial = $d->status === DocumentoFiscalSaida::STATUS_AUTORIZADO;
        $nfse = $d->tipo === DocumentoFiscalSaida::TIPO_NFSE;
        $empresa = $fat->empresa;
        $parceiro = $fat->parceiro ?? $fat->pedido?->parceiro;

        $aviso = $oficial
            ? 'Nota autorizada no hub Focus. Numeração e chave vieram do fisco — o XML oficial só existe após essa autorização.'
            : 'Prévia — aguardando hub Focus. Não é documento fiscal autorizado. O sistema não inventa série, número nem chave. O XML da SEFAZ só existe depois da autorização.';

        $destNome = (string) ($payload['nome_destinatario'] ?? $payload['nome_tomador'] ?? $parceiro?->razao_social ?? '');
        $destDoc = (string) ($payload['cnpj_destinatario'] ?? $payload['cpf_destinatario'] ?? $payload['cnpj_tomador'] ?? $payload['cpf_tomador'] ?? '');
        $destMun = (string) ($payload['municipio_destinatario'] ?? '');
        $destUf = (string) ($payload['uf_destinatario'] ?? $payload['uf_tomador'] ?? '');
        $destEnd = trim(implode(', ', array_filter([
            (string) ($payload['logradouro_destinatario'] ?? $payload['logradouro_tomador'] ?? ''),
            (string) ($payload['numero_destinatario'] ?? $payload['numero_tomador'] ?? ''),
            (string) ($payload['bairro_destinatario'] ?? $payload['bairro_tomador'] ?? ''),
        ])));

        $itens = [];
        if ($nfse) {
            $itens[] = [
                'numero' => 1,
                'codigo' => null,
                'descricao' => (string) ($payload['descricao_servico'] ?? ''),
                'ncm' => (string) ($payload['codigo_nbs'] ?? ''),
                'cfop' => (string) ($payload['codigo_tributacao_nacional_iss'] ?? ''),
                'unidade' => 'UN',
                'quantidade' => '1',
                'valor_unitario' => (string) ($payload['valor_servico'] ?? $d->valor),
                'valor' => (string) ($payload['valor_servico'] ?? $d->valor),
            ];
        } else {
            foreach (($payload['items'] ?? []) as $item) {
                if (! is_array($item)) {
                    continue;
                }
                $itens[] = [
                    'numero' => $item['numero_item'] ?? count($itens) + 1,
                    'codigo' => $item['codigo_produto'] ?? null,
                    'descricao' => (string) ($item['descricao'] ?? ''),
                    'ncm' => (string) ($item['codigo_ncm'] ?? ''),
                    'cfop' => (string) ($item['cfop'] ?? ''),
                    'csosn' => (string) ($item['icms_situacao_tributaria'] ?? ''),
                    'unidade' => (string) ($item['unidade_comercial'] ?? ''),
                    'quantidade' => (string) ($item['quantidade_comercial'] ?? ''),
                    'valor_unitario' => (string) ($item['valor_unitario_comercial'] ?? ''),
                    'valor' => (string) ($item['valor_bruto'] ?? ''),
                ];
            }
        }

        $duplicatas = [];
        foreach (($payload['duplicatas'] ?? []) as $dup) {
            if (! is_array($dup)) {
                continue;
            }
            $duplicatas[] = [
                'numero' => (string) ($dup['numero'] ?? count($duplicatas) + 1),
                'vencimento' => (string) ($dup['data_vencimento'] ?? ''),
                'valor' => (string) ($dup['valor'] ?? ''),
            ];
        }

        $seriePrevista = $oficial
            ? null
            : (isset($payload['serie']) ? (int) $payload['serie'] : (isset($payload['serie_dps']) ? (int) $payload['serie_dps'] : null));

        $emitEnd = trim(implode(', ', array_filter([
            (string) ($empresa?->logradouro ?? ''),
            (string) ($empresa?->numero ?? ''),
            (string) ($empresa?->bairro ?? ''),
        ])));

        return [
            'oficial' => $oficial,
            'formato_envio' => 'json_focus',
            'rotulo' => $nfse ? 'NFS-e (serviço)' : 'NF-e (produto)',
            'modelo' => $nfse ? 'NFS-e Nacional' : '55',
            'aviso' => $aviso,
            'natureza' => (string) ($payload['natureza_operacao'] ?? ($nfse ? 'Prestação de serviço' : '')),
            'informacoes_adicionais' => (string) ($payload['informacoes_adicionais_contribuinte'] ?? $payload['informacoes_complementares'] ?? ''),
            'data_emissao' => (string) ($payload['data_emissao'] ?? $payload['data_competencia'] ?? ''),
            'competencia' => (string) ($payload['data_competencia'] ?? ''),
            'serie_envio' => $oficial ? $d->serie : $seriePrevista,
            'numero' => $oficial ? $d->numero : null,
            'chave' => $oficial ? $d->chave : null,
            'protocolo' => $oficial ? $d->protocolo : null,
            'emitente' => [
                'nome' => $empresa?->razao_social,
                'nome_fantasia' => $empresa?->nome_fantasia,
                'cnpj' => (string) ($payload['cnpj_emitente'] ?? $payload['cnpj_prestador'] ?? $empresa?->cnpj ?? ''),
                'ie' => $empresa?->ie,
                'im' => $empresa?->im,
                'logradouro' => $empresa?->logradouro,
                'numero' => $empresa?->numero,
                'bairro' => $empresa?->bairro,
                'endereco' => $emitEnd !== '' ? $emitEnd : null,
                'municipio' => $empresa?->municipio,
                'uf' => $empresa?->uf,
                'cep' => $empresa?->cep,
                'telefone' => $empresa?->telefone,
                'crt' => $empresa?->crt,
            ],
            'destinatario' => [
                'nome' => $destNome,
                'documento' => $destDoc,
                'endereco' => $destEnd !== '' ? $destEnd : null,
                'bairro' => (string) ($payload['bairro_destinatario'] ?? $payload['bairro_tomador'] ?? $parceiro?->bairro ?? ''),
                'municipio' => $destMun !== '' ? $destMun : $parceiro?->municipio,
                'uf' => $destUf !== '' ? $destUf : $parceiro?->uf,
                'cep' => (string) ($payload['cep_destinatario'] ?? $payload['cep_tomador'] ?? $parceiro?->cep ?? ''),
                'email' => (string) ($payload['email_destinatario'] ?? $payload['email_tomador'] ?? ''),
                'ie' => (string) ($payload['inscricao_estadual_destinatario'] ?? $parceiro?->ie ?? ''),
            ],
            'itens' => $itens,
            'duplicatas' => $duplicatas,
            'valor_total' => (string) ($payload['valor_total'] ?? $payload['valor_servico'] ?? $d->valor),
            'pedido' => $fat->pedido?->codigo,
            'faturamento' => $fat->codigo,
        ];
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function agruparItens(Faturamento $fat): array
    {
        $grupos = ['NFE' => [], 'NFSE' => []];
        foreach ($this->payloads->itensParaPayload($fat->itens) as $linha) {
            $tipo = FiscalSaidaDefaults::tipoDeFamilia($linha['familia_fiscal'] ?? null);
            $grupos[$tipo][] = $linha;
        }

        return $grupos;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function itensDoTipo(Faturamento $fat, string $tipo): array
    {
        $out = [];
        foreach ($this->payloads->itensParaPayload($fat->itens) as $linha) {
            if (FiscalSaidaDefaults::tipoDeFamilia($linha['familia_fiscal'] ?? null) === $tipo) {
                $out[] = $linha;
            }
        }

        return $out;
    }

    private function ref(Empresa $empresa, Faturamento $fat, string $tipo): string
    {
        $emp = preg_replace('/[^A-Za-z0-9\-]/', '', (string) $empresa->codigo) ?: 'EMP';
        $fatCod = preg_replace('/[^A-Za-z0-9\-]/', '', (string) $fat->codigo) ?: 'FAT';

        return mb_substr($emp.'-'.$fatCod.'-'.$tipo, 0, 80);
    }

    private function assertEmpresa(Empresa $empresa, Faturamento $fat): void
    {
        if ($fat->empresa_id !== $empresa->id) {
            abort(404);
        }
    }
}
