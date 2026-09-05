<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
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
}
