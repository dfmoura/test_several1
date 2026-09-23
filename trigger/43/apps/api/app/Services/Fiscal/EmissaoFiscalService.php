<?php

namespace App\Services\Fiscal;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Parceiro;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Estoque\EstoqueSaidaVendaService;
use App\Support\PadraoDecimal;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Planeja e emite NF-e do FAT via SEFAZ + A1 (ADR_EMISSAO_NFE_SEFAZ_DIRETO).
 * HTTP só depois do FAT commit. Numeração no ERP. Focus legado não é chamado.
 * Local: stub se permitido. NFS-e permanece planejada nesta fatia.
 */
class EmissaoFiscalService
{
    public function __construct(
        private readonly FiscalHubResolver $hubs,
        private readonly FocusNfeClient $client,
        private readonly FiscalEmissorStub $stub,
        private readonly FiscalEmissorPolicy $emissorPolicy,
        private readonly FocusPayloadBuilder $payloads,
        private readonly EmissaoFiscalChecklist $checklist,
        private readonly CodigoGenerator $codigos,
        private readonly EstoqueSaidaVendaService $saidaVenda,
        private readonly \App\Services\Fiscal\Sefaz\NfeAutorizacaoService $nfeSefaz,
        private readonly \App\Services\Fiscal\Sefaz\NfeEventoService $nfeEventos,
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
        $sefazApto = (bool) ($check['sefaz']['apto'] ?? false);
        $stubAtivo = $this->emissorPolicy->ativoNaAusenciaDoSefaz($sefazApto);

        foreach ($fat->documentosFiscais as $doc) {
            if ($doc->status === DocumentoFiscalSaida::STATUS_CANCELADO) {
                continue;
            }
            if ($doc->eOficial()) {
                continue;
            }
            if ($doc->tipo === DocumentoFiscalSaida::TIPO_NFSE) {
                $doc->mensagem = 'Emissão de NFS-e ainda não disponível nesta fatia.';
                $doc->save();

                continue;
            }
            if ($doc->eSimulado() && ! $sefazApto) {
                continue;
            }
            if ($doc->status === DocumentoFiscalSaida::STATUS_PROCESSANDO && ! $forcar) {
                continue;
            }
            if (! $doc->podeEnviar() && $doc->status !== DocumentoFiscalSaida::STATUS_PROCESSANDO) {
                continue;
            }

            if ($sefazApto) {
                $cadastro = $check['pendencias_cadastro'] ?? [];
                $estoque = array_values(array_filter(
                    $check['pendencias'] ?? [],
                    fn ($p) => str_contains((string) $p, 'Estoque') || str_contains((string) $p, 'inventário') || str_contains((string) $p, 'Inventário')
                ));
                // Bloqueia POST se cadastro ou estoque; outras pendências de NFS-e não afetam NFE
                if ($cadastro !== [] || $estoque !== []) {
                    $doc->mensagem = implode(' ', array_merge($cadastro, $estoque));
                    $doc->save();

                    continue;
                }
                $this->enviarDocumentoSefaz($empresa, $fat, $doc);

                continue;
            }

            if ($stubAtivo) {
                $cadastro = $check['pendencias_cadastro'] ?? [];
                if ($cadastro !== []) {
                    $doc->mensagem = implode(' ', $cadastro);
                    $doc->save();

                    continue;
                }
                $this->autorizarStub($empresa, $fat, $doc);

                continue;
            }

            $doc->mensagem = implode(' ', $check['pendencias'] ?: ['Canal SEFAZ/A1 não apto e stub indisponível.']);
            $doc->save();
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

        foreach ($fat->documentosFiscais as $doc) {
            if ($doc->tipo !== DocumentoFiscalSaida::TIPO_NFE) {
                continue;
            }
            if (! in_array($doc->status, [
                DocumentoFiscalSaida::STATUS_PROCESSANDO,
                DocumentoFiscalSaida::STATUS_ERRO,
            ], true)) {
                continue;
            }
            if ($doc->eSimulado()) {
                continue;
            }
            if (! $this->nfeSefaz->sefazDisponivel()) {
                continue;
            }
            $resultado = $this->nfeSefaz->consultarProcessando($empresa, $doc);
            $this->aplicarResultado($doc, $resultado, null, $empresa, $fat);
        }

        $this->sincronizarNfStatus($fat);

        return $this->documentosOut($fat->fresh(['documentosFiscais']));
    }

    /**
     * Cancelamento SEFAZ (110111) + estorno SAIDA_VENDA.
     *
     * @return array<string, mixed>
     */
    public function cancelarNfe(Empresa $empresa, Faturamento $fat, string $justificativa): array
    {
        $this->assertEmpresa($empresa, $fat);
        $fat->loadMissing(['documentosFiscais']);
        $doc = $fat->documentosFiscais->first(
            fn (DocumentoFiscalSaida $d) => $d->tipo === DocumentoFiscalSaida::TIPO_NFE && $d->eOficial()
        );
        if ($doc === null) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'documento' => ['Não há NF-e oficial autorizada para cancelar.'],
            ]);
        }

        $out = $this->nfeEventos->cancelar($empresa, $doc, $justificativa);
        $resultado = $out['resultado'];
        if (($resultado['status'] ?? '') === 'cancelado' || ($resultado['status_focus'] ?? '') === 'cancelado') {
            $doc->status = DocumentoFiscalSaida::STATUS_CANCELADO;
            $doc->mensagem = mb_substr((string) ($resultado['mensagem'] ?? 'Cancelada na SEFAZ'), 0, 500);
            $doc->response_json = array_merge(
                is_array($doc->response_json) ? $doc->response_json : [],
                ['cancelamento' => $resultado]
            );
            $doc->save();
            $this->saidaVenda->estornaSeHouver($empresa, $doc);
            $fat->nf_status = Faturamento::NF_CANCELADA;
            $fat->save();
        }

        return [
            'documentos' => $this->documentosOut($fat->fresh(['documentosFiscais'])),
            'evento' => $out['evento'],
        ];
    }

    /**
     * Carta de correção (110110).
     *
     * @return array<string, mixed>
     */
    public function cartaCorrecao(Empresa $empresa, Faturamento $fat, string $texto, ?int $nSeq = null): array
    {
        $this->assertEmpresa($empresa, $fat);
        $fat->loadMissing(['documentosFiscais']);
        $doc = $fat->documentosFiscais->first(
            fn (DocumentoFiscalSaida $d) => $d->tipo === DocumentoFiscalSaida::TIPO_NFE && $d->eOficial()
        );
        if ($doc === null) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'documento' => ['Não há NF-e oficial autorizada para carta de correção.'],
            ]);
        }

        $out = $this->nfeEventos->cartaCorrecao($empresa, $doc, $texto, $nSeq);

        return [
            'documentos' => $this->documentosOut($fat->fresh(['documentosFiscais'])),
            'evento' => $out['evento'],
        ];
    }

    public function cancelarPlanejados(Faturamento $fat): void
    {
        DocumentoFiscalSaida::query()
            ->where('faturamento_id', $fat->id)
            ->where(function ($q) {
                $q->whereIn('status', [
                    DocumentoFiscalSaida::STATUS_PLANEJADO,
                    DocumentoFiscalSaida::STATUS_ERRO,
                    DocumentoFiscalSaida::STATUS_REJEITADO,
                ])->orWhere(function ($q2) {
                    $q2->where('status', DocumentoFiscalSaida::STATUS_AUTORIZADO)
                        ->where('autorizacao_origem', DocumentoFiscalSaida::ORIGEM_STUB);
                });
            })
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
        $fat->loadMissing(['documentosFiscais.saidaEstoque.itens.produto', 'empresa', 'parceiro', 'pedido.parceiro', 'itens.pedidoItem.produtoPa', 'titulos']);
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
     * @deprecated Focus — mantido só para compat; não chamado no caminho NF-e.
     */
    private function enviarDocumento(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc, array $runtime): void
    {
        $this->enviarDocumentoSefaz($empresa, $fat, $doc);
    }

    private function enviarDocumentoSefaz(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc): void
    {
        $parceiro = $fat->parceiro ?? $fat->pedido?->parceiro;
        if ($parceiro === null) {
            $doc->status = DocumentoFiscalSaida::STATUS_ERRO;
            $doc->mensagem = 'Faturamento sem destinatário.';
            $doc->save();

            return;
        }

        try {
            $resultado = $this->nfeSefaz->emitir($empresa, $fat, $doc, $parceiro);
            $this->aplicarResultado($doc->fresh(), $resultado, null, $empresa, $fat);
        } catch (Throwable $e) {
            $doc->status = DocumentoFiscalSaida::STATUS_ERRO;
            $doc->mensagem = mb_substr($e->getMessage(), 0, 500);
            $doc->fiscal_hub_id = null;
            $doc->save();
            Log::warning('Emissão SEFAZ NF-e falhou', [
                'faturamento_id' => $fat->id,
                'documento_id' => $doc->id,
                'erro' => $e->getMessage(),
            ]);
        }
    }

    private function autorizarStub(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc): void
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
        $doc->fiscal_hub_id = null;
        $doc->ambiente = 'local';
        $doc->enviado_em = now();
        $doc->save();

        $this->aplicarResultado($doc, $this->stub->autorizar($empresa, $doc), null, $empresa, $fat);
    }

    /**
     * @param  array<string, mixed>  $resultado
     * @param  array{hub: \App\Models\FiscalHub, ambiente: string}|null  $runtime
     */
    private function aplicarResultado(
        DocumentoFiscalSaida $doc,
        array $resultado,
        ?array $runtime,
        Empresa $empresa,
        Faturamento $fat
    ): void {
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

        $origem = strtoupper((string) ($resultado['origem'] ?? ''));
        if ($origem === DocumentoFiscalSaida::ORIGEM_STUB) {
            $doc->autorizacao_origem = DocumentoFiscalSaida::ORIGEM_STUB;
            $doc->ambiente = 'local';
            $doc->fiscal_hub_id = null;
        } elseif ($focus === 'autorizado' || $origem === DocumentoFiscalSaida::ORIGEM_SEFAZ || $origem === 'SEFAZ') {
            $doc->autorizacao_origem = DocumentoFiscalSaida::ORIGEM_SEFAZ;
            $doc->fiscal_hub_id = null;
        } elseif ($origem === DocumentoFiscalSaida::ORIGEM_FOCUS) {
            $doc->autorizacao_origem = DocumentoFiscalSaida::ORIGEM_FOCUS;
        }

        if (! empty($resultado['xml_nfe']) && is_array($doc->response_json)) {
            $doc->response_json = array_merge($doc->response_json, ['xml_nfe' => $resultado['xml_nfe']]);
        } elseif (! empty($resultado['xml_nfe'])) {
            $doc->response_json = array_merge(
                is_array($doc->response_json) ? $doc->response_json : [],
                ['xml_nfe' => $resultado['xml_nfe']]
            );
        }

        // Não guardar XML assinado gigante no payload após decisão final
        if (is_array($doc->payload_json) && isset($doc->payload_json['_xml_assinado'])
            && in_array($focus, ['autorizado', 'cancelado', 'rejeitado'], true)) {
            $pj = $doc->payload_json;
            unset($pj['_xml_assinado']);
            $doc->payload_json = $pj;
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
        $this->saidaVenda->baixarSeOficial($empresa, $fat, $doc);
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
            'autorizacao_origem' => $d->autorizacao_origem,
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
            'saida_estoque' => $this->saidaVenda->movimentoOut($d),
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
     * Regenera a prévia Focus dos documentos ainda editáveis (após ajuste de transporte).
     */
    public function rebuildPrevistas(Empresa $empresa, Faturamento $fat): void
    {
        $this->assertEmpresa($empresa, $fat);
        $fat->loadMissing(['documentosFiscais', 'parceiro', 'pedido.parceiro', 'itens.pedidoItem.produtoPa', 'titulos', 'transportador']);
        foreach ($fat->documentosFiscais as $doc) {
            if ($doc->status === DocumentoFiscalSaida::STATUS_CANCELADO) {
                continue;
            }
            if ($doc->eOficial() || $doc->status === DocumentoFiscalSaida::STATUS_PROCESSANDO) {
                continue;
            }
            if ($doc->tipo !== DocumentoFiscalSaida::TIPO_NFE) {
                continue;
            }
            $this->persistirPrevista($empresa, $fat, $doc);
        }
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
        $oficial = $d->eOficial();
        $simulada = $d->eSimulado();
        $cancelada = $d->eCanceladaOficial();
        // DANFE completo (sem rascunho) para autorizada ou cancelada com chave SEFAZ.
        $layoutOficial = $oficial || $cancelada;
        $comNumeracao = $d->temNumeracaoFiscal();
        $nfse = $d->tipo === DocumentoFiscalSaida::TIPO_NFSE;
        $empresa = $fat->empresa;
        $parceiro = $fat->parceiro ?? $fat->pedido?->parceiro;

        if ($cancelada) {
            $aviso = 'NF-e cancelada na SEFAZ. DANFE auxiliar com a mesma chave — consulte autenticidade no portal nacional.';
        } elseif ($oficial) {
            $aviso = 'Nota autorizada na SEFAZ via certificado A1 da empresa. Numeração e chave oficiais.';
        } elseif ($simulada) {
            $aviso = 'Autorização de teste — sem SEFAZ e sem valor fiscal. Em homolog/produção a emissão usa o A1 da empresa.';
        } else {
            $aviso = 'Prévia — aguardando emissão com certificado A1. Não é documento fiscal autorizado.';
        }

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

        $seriePrevista = $comNumeracao
            ? null
            : (isset($payload['serie']) ? (int) $payload['serie'] : (isset($payload['serie_dps']) ? (int) $payload['serie_dps'] : null));

        $emitEnd = trim(implode(', ', array_filter([
            (string) ($empresa?->logradouro ?? ''),
            (string) ($empresa?->numero ?? ''),
            (string) ($empresa?->bairro ?? ''),
        ])));

        return [
            'oficial' => $layoutOficial,
            'simulada' => $simulada,
            'cancelada' => $cancelada,
            'formato_envio' => 'json_focus',
            'rotulo' => $nfse ? 'NFS-e (serviço)' : 'NF-e (produto)',
            'modelo' => $nfse ? 'NFS-e Nacional' : '55',
            'aviso' => $aviso,
            'natureza' => (string) ($payload['natureza_operacao'] ?? ($nfse ? 'Prestação de serviço' : '')),
            'informacoes_adicionais' => (string) ($payload['informacoes_adicionais_contribuinte'] ?? $payload['informacoes_complementares'] ?? ''),
            'data_emissao' => (string) ($payload['data_emissao'] ?? $payload['data_competencia'] ?? ''),
            'data_saida' => $this->previaDataSaida($d, $payload),
            'hora_saida' => $this->previaHoraSaida($d, $payload),
            'competencia' => (string) ($payload['data_competencia'] ?? ''),
            'serie_envio' => $comNumeracao ? $d->serie : $seriePrevista,
            'numero' => $comNumeracao ? $d->numero : null,
            'chave' => $comNumeracao ? $d->chave : null,
            'protocolo' => $comNumeracao ? $d->protocolo : null,
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
     * Instantâneo de saída/entrada para DANFE (dhSaiEnt).
     * Sem campo próprio: usa autorização / envio / emissão (padrão operacional).
     *
     * @param  array<string, mixed>  $payload
     */
    private function momentoSaidaDanfe(DocumentoFiscalSaida $d, array $payload): ?Carbon
    {
        $raw = $payload['data_saida'] ?? $payload['data_saida_entrada'] ?? $payload['dh_sai_ent'] ?? null;
        if (is_string($raw) && trim($raw) !== '') {
            try {
                return Carbon::parse($raw)->timezone('America/Sao_Paulo');
            } catch (Throwable) {
                // segue fallback
            }
        }
        foreach ([$d->autorizado_em, $d->enviado_em] as $ts) {
            if ($ts !== null) {
                return Carbon::parse($ts)->timezone('America/Sao_Paulo');
            }
        }
        $emi = $payload['data_emissao'] ?? $payload['data_competencia'] ?? null;
        if (is_string($emi) && trim($emi) !== '') {
            try {
                return Carbon::parse($emi)->timezone('America/Sao_Paulo');
            } catch (Throwable) {
                return null;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function previaDataSaida(DocumentoFiscalSaida $d, array $payload): string
    {
        $m = $this->momentoSaidaDanfe($d, $payload);

        return $m ? $m->format('Y-m-d') : '';
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function previaHoraSaida(DocumentoFiscalSaida $d, array $payload): string
    {
        if (isset($payload['hora_saida']) && is_string($payload['hora_saida']) && trim($payload['hora_saida']) !== '') {
            return trim($payload['hora_saida']);
        }
        $m = $this->momentoSaidaDanfe($d, $payload);

        return $m ? $m->format('H:i:s') : '';
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function agruparItens(Faturamento $fat): array
    {
        $grupos = ['NFE' => [], 'NFSE' => []];
        foreach ($this->payloads->itensFiscaisParaPayload($fat->itens) as $linha) {
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
        foreach ($this->payloads->itensFiscaisParaPayload($fat->itens) as $linha) {
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
