<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use Illuminate\Validation\ValidationException;

/**
 * Etiqueta / QR do volume + vínculo com endereço — F3/F4.
 */
class EstoqueVolumeService
{
    public function __construct(
        private readonly EstoqueEnderecoService $enderecos,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function etiqueta(Empresa $empresa, EstoqueLote $lote): array
    {
        if ($lote->empresa_id !== $empresa->id) {
            abort(404);
        }

        $lote->loadMissing(['produto:id,codigo,descricao_fiscal,unidade_interna', 'endereco']);
        $token = $lote->ensureQrToken();

        return [
            'lote_id' => $lote->id,
            'qr_payload' => $lote->qrPayload(),
            'qr_token' => $token,
            'codigo' => $lote->codigo,
            'produto' => $lote->produto ? [
                'id' => $lote->produto->id,
                'codigo' => $lote->produto->codigo,
                'descricao_fiscal' => $lote->produto->descricao_fiscal,
            ] : null,
            'qtde' => (string) $lote->qtde,
            'unidade' => $lote->unidade,
            'largura_mm' => $lote->largura_mm !== null ? (string) $lote->largura_mm : null,
            'comprimento_m' => $lote->comprimento_m !== null ? (string) $lote->comprimento_m : null,
            'nf_numero' => $lote->nf_numero,
            'data_entrada' => optional($lote->data_entrada)?->format('Y-m-d'),
            'endereco' => $lote->endereco ? [
                'id' => $lote->endereco->id,
                'codigo' => $lote->endereco->codigo,
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function vincularEndereco(Empresa $empresa, EstoqueLote $lote, int $enderecoId): array
    {
        if ($lote->empresa_id !== $empresa->id) {
            abort(404);
        }

        $endereco = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $enderecoId)
            ->where('ativo', true)
            ->first();

        if (! $endereco) {
            throw ValidationException::withMessages([
                'endereco_id' => ['Endereço inválido ou inativo nesta empresa.'],
            ]);
        }

        $lote->endereco_id = $endereco->id;
        $lote->ensureQrToken();
        $lote->save();

        return $this->etiqueta($empresa, $lote->fresh(['produto', 'endereco']));
    }

    public function seedEnderecos(Empresa $empresa): array
    {
        return $this->enderecos->seedGabarito($empresa);
    }

    /**
     * Ficha de entrada física — cabeçalho do MOV + volumes com QR (pós-receber).
     * Mesmo payload VOL:… da etiqueta unitária; impressão em lote para o almoxarifado.
     *
     * @return array<string, mixed>
     */
    public function fichaEntrada(Empresa $empresa, EstoqueMovimento $movimento): array
    {
        if ($movimento->empresa_id !== $empresa->id) {
            abort(404);
        }

        if ($movimento->tipo !== EstoqueMovimento::TIPO_ENTRADA_COMPRA) {
            throw ValidationException::withMessages([
                'movimento' => ['Ficha de entrada física só se aplica a MOV de entrada de compra.'],
            ]);
        }

        $movimento->load([
            'fornecedor:id,codigo,razao_social,nome_fantasia',
            'ordemCompra:id,codigo,status',
            'itens.produto:id,codigo,descricao_fiscal,unidade_interna',
            'itens.lote.endereco',
            'itens.lote.produto:id,codigo,descricao_fiscal,unidade_interna',
            'nfeEntrada.itens',
        ]);

        $fiscalPorProduto = [];
        $fiscalItens = [];
        if ($movimento->nfeEntrada) {
            foreach ($movimento->nfeEntrada->itens as $fi) {
                $fiscalItens[] = [
                    'n_item' => (int) $fi->n_item,
                    'produto_id' => $fi->produto_id,
                    'c_prod' => $fi->c_prod,
                    'x_prod' => $fi->x_prod,
                    'x_ped' => $fi->x_ped,
                    'n_item_ped' => $fi->n_item_ped,
                    'n_fci' => $fi->n_fci,
                    'ncm' => $fi->ncm,
                    'cfop' => $fi->cfop,
                    'q_com' => $fi->q_com,
                    'u_com' => $fi->u_com,
                ];
                if ($fi->produto_id) {
                    $fiscalPorProduto[(int) $fi->produto_id][] = $fi;
                }
            }
        }

        $volumes = [];
        foreach ($movimento->itens as $item) {
            $lote = $item->lote;
            if ($lote === null) {
                continue;
            }
            if ($lote->empresa_id !== $empresa->id) {
                continue;
            }

            $token = $lote->ensureQrToken();
            $fiscal = $this->pickFiscalForProduto($fiscalPorProduto, (int) $item->produto_id);

            $volumes[] = [
                'movimento_item_id' => $item->id,
                'lote_id' => $lote->id,
                'qr_payload' => $lote->qrPayload(),
                'qr_token' => $token,
                'codigo' => $lote->codigo,
                'produto' => $lote->produto ? [
                    'id' => $lote->produto->id,
                    'codigo' => $lote->produto->codigo,
                    'descricao_fiscal' => $lote->produto->descricao_fiscal,
                ] : ($item->produto ? [
                    'id' => $item->produto->id,
                    'codigo' => $item->produto->codigo,
                    'descricao_fiscal' => $item->produto->descricao_fiscal,
                ] : null),
                'qtde' => (string) $lote->qtde,
                'unidade' => $lote->unidade ?: ($item->unidade ?? ''),
                'largura_mm' => $lote->largura_mm !== null ? (string) $lote->largura_mm : null,
                'comprimento_m' => $lote->comprimento_m !== null ? (string) $lote->comprimento_m : null,
                'data_fabricacao' => optional($lote->data_fabricacao)?->format('Y-m-d'),
                'data_validade' => optional($lote->data_validade)?->format('Y-m-d'),
                'nf_numero' => $lote->nf_numero ?? $movimento->nf_numero,
                'data_entrada' => optional($lote->data_entrada)?->format('Y-m-d')
                    ?? optional($movimento->nf_data)?->format('Y-m-d'),
                'endereco' => $lote->endereco ? [
                    'id' => $lote->endereco->id,
                    'codigo' => $lote->endereco->codigo,
                ] : null,
                'x_ped' => $fiscal?->x_ped,
                'n_item_ped' => $fiscal?->n_item_ped,
                'n_fci' => $fiscal?->n_fci,
            ];
        }

        // Itens do MOV sem volume (SKU sem controle de lote): checklist físico sem QR.
        $linhasSemVolume = [];
        foreach ($movimento->itens as $item) {
            if ($item->lote_id !== null) {
                continue;
            }
            $linhasSemVolume[] = [
                'movimento_item_id' => $item->id,
                'produto' => $item->produto ? [
                    'id' => $item->produto->id,
                    'codigo' => $item->produto->codigo,
                    'descricao_fiscal' => $item->produto->descricao_fiscal,
                ] : null,
                'qtde' => (string) $item->qtde,
                'unidade' => $item->unidade ?? '',
            ];
        }

        $nfe = $movimento->nfeEntrada;

        return [
            'movimento' => [
                'id' => $movimento->id,
                'codigo' => $movimento->codigo,
                'tipo' => $movimento->tipo,
                'nf_chave' => $movimento->nf_chave,
                'nf_numero' => $movimento->nf_numero,
                'nf_data' => optional($movimento->nf_data)?->format('Y-m-d'),
                'nf_valor' => $movimento->nf_valor !== null ? (string) $movimento->nf_valor : null,
                'conferido_em' => optional($movimento->conferido_em)?->toIso8601String(),
            ],
            'ordem_compra' => $movimento->ordemCompra ? [
                'id' => $movimento->ordemCompra->id,
                'codigo' => $movimento->ordemCompra->codigo,
                'status' => $movimento->ordemCompra->status,
            ] : null,
            'fornecedor' => $movimento->fornecedor ? [
                'id' => $movimento->fornecedor->id,
                'codigo' => $movimento->fornecedor->codigo,
                'razao_social' => $movimento->fornecedor->razao_social,
                'nome_fantasia' => $movimento->fornecedor->nome_fantasia,
            ] : null,
            'nfe' => $nfe ? [
                'id' => $nfe->id,
                'chave' => $nfe->chave,
                'numero' => $nfe->numero,
                'serie' => $nfe->serie,
                'data_emissao' => optional($nfe->data_emissao)?->format('Y-m-d'),
                'emit_nome' => $nfe->emit_nome,
            ] : null,
            'itens_fiscais' => $fiscalItens,
            'volumes' => $volumes,
            'volumes_count' => count($volumes),
            'linhas_sem_volume' => $linhasSemVolume,
        ];
    }

    /**
     * Resolve VOL:{empresa_id}:{lote_id}:{qr_token}.
     *
     * @return array<string, mixed>
     */
    public function resolverVolumePorQr(Empresa $empresa, string $payload): array
    {
        $lote = $this->loteFromVolPayload($empresa, $payload);

        return $this->etiqueta($empresa, $lote);
    }

    /**
     * Guarda física: lê QR do volume + QR do vão e vincula (WMS leve).
     *
     * @return array<string, mixed>
     */
    public function guardarPorQr(Empresa $empresa, string $volumeQr, string $enderecoQr): array
    {
        $lote = $this->loteFromVolPayload($empresa, $volumeQr);
        $endereco = $this->enderecos->resolverPorQr($empresa, $enderecoQr);

        return $this->vincularEndereco($empresa, $lote, (int) $endereco->id);
    }

    /**
     * Folha de reimpressão de etiquetas de volume (F3 · 50×40).
     * Com movimento_id: volumes físicos daquela entrada (mesmo elo da ficha).
     *
     * @param  list<int>|null  $loteIds
     * @return array{volumes: list<array<string, mixed>>, volumes_count: int, filtro: array<string, mixed>}
     */
    public function etiquetasVolumes(
        Empresa $empresa,
        ?array $loteIds = null,
        bool $semEndereco = false,
        ?int $movimentoId = null,
    ): array {
        $escopoMovimento = false;
        if ($movimentoId !== null) {
            $loteIds = $this->loteIdsDoMovimentoEntrada($empresa, $movimentoId);
            $escopoMovimento = true;
            if ($loteIds === []) {
                return [
                    'volumes' => [],
                    'volumes_count' => 0,
                    'filtro' => [
                        'sem_endereco' => $semEndereco,
                        'ids' => [],
                        'movimento_id' => $movimentoId,
                    ],
                ];
            }
        }

        $q = EstoqueLote::query()
            ->with(['produto:id,codigo,descricao_fiscal', 'endereco:id,codigo'])
            ->where('empresa_id', $empresa->id)
            ->orderBy('produto_id')
            ->orderBy('codigo');

        // Lista geral: só saldo. Escopo MOV/ids: identidade do volume da entrada (reimpressão).
        if (! $escopoMovimento && ($loteIds === null || $loteIds === [])) {
            $q->where('qtde', '>', 0);
        }

        if ($loteIds !== null && $loteIds !== []) {
            $q->whereIn('id', $loteIds);
            if (! $escopoMovimento) {
                $q->where('qtde', '>', 0);
            }
        }
        if ($semEndereco) {
            $q->whereNull('endereco_id');
        }

        $volumes = [];
        foreach ($q->get() as $lote) {
            $volumes[] = $this->etiqueta($empresa, $lote);
        }

        return [
            'volumes' => $volumes,
            'volumes_count' => count($volumes),
            'filtro' => [
                'sem_endereco' => $semEndereco,
                'ids' => $loteIds,
                'movimento_id' => $movimentoId,
            ],
        ];
    }

    /**
     * Lotes físicos nascidos no MOV de entrada de compra (ficha / etiquetas da NF).
     *
     * @return list<int>
     */
    private function loteIdsDoMovimentoEntrada(Empresa $empresa, int $movimentoId): array
    {
        $movimento = EstoqueMovimento::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $movimentoId)
            ->first();

        if ($movimento === null) {
            abort(404);
        }

        if ($movimento->tipo !== EstoqueMovimento::TIPO_ENTRADA_COMPRA) {
            throw ValidationException::withMessages([
                'movimento_id' => ['Etiquetas por movimento só se aplicam a entrada de compra.'],
            ]);
        }

        $movimento->loadMissing('itens:id,movimento_id,lote_id');

        $ids = [];
        foreach ($movimento->itens as $item) {
            if ($item->lote_id) {
                $ids[(int) $item->lote_id] = (int) $item->lote_id;
            }
        }

        return array_values($ids);
    }

    private function loteFromVolPayload(Empresa $empresa, string $payload): EstoqueLote
    {
        $payload = trim($payload);
        if (! preg_match('/^VOL:(\d+):(\d+):([a-fA-F0-9]+)$/', $payload, $m)) {
            throw ValidationException::withMessages([
                'volume_qr' => ['QR de volume inválido. Esperado VOL:{empresa}:{lote}:{token}.'],
            ]);
        }

        $empId = (int) $m[1];
        $loteId = (int) $m[2];
        $token = strtolower($m[3]);

        if ($empId !== (int) $empresa->id) {
            throw ValidationException::withMessages([
                'volume_qr' => ['QR de volume de outra empresa.'],
            ]);
        }

        $lote = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $loteId)
            ->first();

        if ($lote === null) {
            throw ValidationException::withMessages([
                'volume_qr' => ['Volume não encontrado.'],
            ]);
        }

        $lote->ensureQrToken();
        if (strtolower((string) $lote->qr_token) !== $token) {
            throw ValidationException::withMessages([
                'volume_qr' => ['Token do volume não confere (etiqueta antiga ou adulterada).'],
            ]);
        }

        return $lote;
    }

    /**
     * @param  array<int, list<\App\Models\NfeEntradaItem>>  $fiscalPorProduto
     */
    private function pickFiscalForProduto(array $fiscalPorProduto, int $produtoId): ?\App\Models\NfeEntradaItem
    {
        $list = $fiscalPorProduto[$produtoId] ?? [];
        if ($list === []) {
            return null;
        }
        // Um det por SKU: amarra direto. Vários det (mesmo cProd): 1º — humano confere na ficha.
        return $list[0];
    }
}
