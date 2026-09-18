<?php

namespace App\Services\Producao;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\OrdemProducao;
use App\Models\PaEmbalagem;
use App\Models\PaEmbalagemBobina;
use App\Models\PaEmbalagemCaixa;
use App\Models\Pedido;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Embalagem física do PA (bobina → caixa) — ADR_PA_EMBALAGEM_BOBINA_CAIXA.
 * Não mexe em estoque / Writer / ENTRADA_PA.
 */
class PaEmbalagemService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return array<string, mixed>
     */
    public function sugerir(Empresa $empresa, OrdemProducao $op): array
    {
        $this->assertOpEmpresa($empresa, $op);
        $op->loadMissing(['pedido', 'pedidoItem']);

        if ($op->status !== OrdemProducao::STATUS_CONCLUIDA) {
            throw ValidationException::withMessages([
                'ordem_producao' => ['Embalagem só após a OP concluída.'],
            ]);
        }

        $qtdeBoa = (string) ($op->qtde_boa ?? '0');
        if (bccomp($qtdeBoa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_boa' => ['OP sem quantidade boa.'],
            ]);
        }

        $plano = $this->montarPlano($op, $qtdeBoa, null);
        $vigente = $this->vigenteDaOp($empresa, $op);

        return [
            'ordem_producao' => [
                'id' => $op->id,
                'codigo' => $op->codigo,
                'qtde_boa' => $qtdeBoa,
            ],
            'pedido' => $op->pedido ? [
                'id' => $op->pedido->id,
                'codigo' => $op->pedido->codigo,
            ] : null,
            'sugerido' => true,
            'plano' => $plano,
            'embalagem' => $vigente
                ? $this->toOut($vigente->load(['bobinas', 'caixas']))
                : null,
        ];
    }

    /**
     * Confirma (ou substitui) a embalagem real.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function confirmar(Empresa $empresa, OrdemProducao $op, array $data = []): array
    {
        $this->assertOpEmpresa($empresa, $op);
        $op->loadMissing(['pedido', 'pedidoItem']);

        if ($op->status !== OrdemProducao::STATUS_CONCLUIDA) {
            throw ValidationException::withMessages([
                'ordem_producao' => ['Embalagem só após a OP concluída.'],
            ]);
        }

        $qtdeBoa = (string) ($op->qtde_boa ?? '0');
        if (bccomp($qtdeBoa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_boa' => ['OP sem quantidade boa.'],
            ]);
        }

        $existente = $this->vigenteDaOp($empresa, $op);
        if ($existente && $this->nfAutorizadaDoPedido($empresa, (int) $op->pedido_id)) {
            throw ValidationException::withMessages([
                'embalagem' => ['NF já autorizada — embalagem não pode ser alterada.'],
            ]);
        }

        $bobinasIn = isset($data['bobinas']) && is_array($data['bobinas']) ? $data['bobinas'] : null;
        $plano = $this->montarPlano($op, $qtdeBoa, $bobinasIn);
        $origem = $bobinasIn !== null ? PaEmbalagem::ORIGEM_MANUAL : PaEmbalagem::ORIGEM_SUGERIDA;
        $obs = isset($data['observacao']) ? trim((string) $data['observacao']) : null;

        $emb = DB::transaction(function () use ($empresa, $op, $plano, $origem, $obs, $existente) {
            if ($existente) {
                $existente->bobinas()->delete();
                $existente->caixas()->delete();
                $existente->delete();
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'EMBPA-'.$ano, 5);

            $emb = PaEmbalagem::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'pedido_id' => $op->pedido_id,
                'pedido_item_id' => $op->pedido_item_id,
                'ordem_producao_id' => $op->id,
                'status' => PaEmbalagem::STATUS_CONFIRMADA,
                'qtde_etiquetas' => $plano['qtde_etiquetas'],
                'qtde_bobinas' => $plano['qtde_bobinas'],
                'qtde_caixas' => $plano['qtde_caixas'],
                'etiq_por_rolo' => $plano['etiq_por_rolo'],
                'rolos_por_caixa' => $plano['rolos_por_caixa'],
                'tubete' => $plano['tubete'],
                'caixa_medida' => $plano['caixa_medida'],
                'saida_etiqueta' => $plano['saida_etiqueta'],
                'origem' => $origem,
                'observacao' => $obs !== '' ? $obs : null,
                'confirmada_em' => now(),
                'confirmada_por' => Auth::id(),
            ]);

            /** @var list<PaEmbalagemCaixa> $caixas */
            $caixas = [];
            foreach ($plano['caixas'] as $cx) {
                $caixas[] = PaEmbalagemCaixa::query()->create([
                    'empresa_id' => $empresa->id,
                    'embalagem_id' => $emb->id,
                    'sequencia' => $cx['sequencia'],
                    'codigo' => sprintf('%s-CX%02d', $emb->codigo, $cx['sequencia']),
                    'qtde_bobinas' => $cx['qtde_bobinas'],
                    'qtde_etiquetas' => $cx['qtde_etiquetas'],
                ]);
            }

            foreach ($plano['bobinas'] as $bob) {
                $caixa = $caixas[$bob['caixa_idx']] ?? null;
                PaEmbalagemBobina::query()->create([
                    'empresa_id' => $empresa->id,
                    'embalagem_id' => $emb->id,
                    'caixa_id' => $caixa?->id,
                    'sequencia' => $bob['sequencia'],
                    'codigo' => sprintf('%s-B%03d', $emb->codigo, $bob['sequencia']),
                    'qtde_etiquetas' => $bob['qtde_etiquetas'],
                    'tubete' => $plano['tubete'],
                ]);
            }

            return $emb->fresh(['bobinas', 'caixas']);
        });

        return $this->toOut($emb);
    }

    public function vigenteDaOp(Empresa $empresa, OrdemProducao $op): ?PaEmbalagem
    {
        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('ordem_producao_id', $op->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->first();
    }

    public function vigenteDoPedido(Empresa $empresa, Pedido $pedido): ?PaEmbalagem
    {
        return PaEmbalagem::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedido->id)
            ->where('status', PaEmbalagem::STATUS_CONFIRMADA)
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function resumoPedido(Empresa $empresa, Pedido $pedido): ?array
    {
        $emb = $this->vigenteDoPedido($empresa, $pedido);
        if (! $emb) {
            return null;
        }

        $emb->loadMissing(['bobinas', 'caixas']);

        return $this->toOut($emb, false);
    }

    /**
     * @return array<string, mixed>
     */
    public function etiquetas(Empresa $empresa, PaEmbalagem $embalagem): array
    {
        if ($embalagem->empresa_id !== $empresa->id) {
            abort(404);
        }

        $embalagem->loadMissing(['bobinas', 'caixas', 'pedido:id,codigo', 'ordemProducao:id,codigo', 'pedidoItem:id,descricao']);

        $bobinas = $embalagem->bobinas->map(function (PaEmbalagemBobina $b) use ($embalagem) {
            return [
                'id' => $b->id,
                'tipo' => 'BOBINA',
                'codigo' => $b->codigo,
                'sequencia' => $b->sequencia,
                'qtde_etiquetas' => (string) $b->qtde_etiquetas,
                'tubete' => $b->tubete,
                'caixa_id' => $b->caixa_id,
                'qr_payload' => $b->qrPayload(),
                'pedido' => $embalagem->pedido?->codigo,
                'op' => $embalagem->ordemProducao?->codigo,
                'descricao' => $embalagem->pedidoItem?->descricao,
            ];
        })->all();

        $caixas = $embalagem->caixas->map(function (PaEmbalagemCaixa $c) use ($embalagem) {
            return [
                'id' => $c->id,
                'tipo' => 'CAIXA',
                'codigo' => $c->codigo,
                'sequencia' => $c->sequencia,
                'qtde_bobinas' => $c->qtde_bobinas,
                'qtde_etiquetas' => (string) $c->qtde_etiquetas,
                'qr_payload' => $c->qrPayload(),
                'pedido' => $embalagem->pedido?->codigo,
                'op' => $embalagem->ordemProducao?->codigo,
                'descricao' => $embalagem->pedidoItem?->descricao,
                'tubete' => $embalagem->tubete,
                'caixa_medida' => $embalagem->caixa_medida,
                'total_caixas' => $embalagem->qtde_caixas,
            ];
        })->all();

        return [
            'embalagem' => $this->toOut($embalagem, false),
            'bobinas' => $bobinas,
            'caixas' => $caixas,
        ];
    }

    /**
     * Texto para NF (infAd / contribuinte).
     */
    public function textoFiscal(?PaEmbalagem $emb): ?string
    {
        if (! $emb) {
            return null;
        }

        return $emb->resumoTexto();
    }

    /**
     * @return array{quantidade: int, especie: string}|null
     */
    public function volumesTransporte(?PaEmbalagem $emb): ?array
    {
        if (! $emb || $emb->qtde_caixas < 1) {
            return null;
        }

        return [
            'quantidade' => (int) $emb->qtde_caixas,
            'especie' => 'CAIXA',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(PaEmbalagem $e, bool $detalhe = true): array
    {
        $out = [
            'id' => $e->id,
            'codigo' => $e->codigo,
            'status' => $e->status,
            'qtde_etiquetas' => (string) $e->qtde_etiquetas,
            'qtde_bobinas' => $e->qtde_bobinas,
            'qtde_caixas' => $e->qtde_caixas,
            'etiq_por_rolo' => $e->etiq_por_rolo,
            'rolos_por_caixa' => $e->rolos_por_caixa,
            'tubete' => $e->tubete,
            'caixa_medida' => $e->caixa_medida,
            'saida_etiqueta' => $e->saida_etiqueta,
            'origem' => $e->origem,
            'resumo' => $e->resumoTexto(),
            'confirmada_em' => optional($e->confirmada_em)?->toIso8601String(),
            'ordem_producao_id' => $e->ordem_producao_id,
            'pedido_id' => $e->pedido_id,
        ];

        if ($detalhe) {
            $e->loadMissing(['bobinas', 'caixas']);
            $out['observacao'] = $e->observacao;
            $out['bobinas'] = $e->bobinas->map(fn (PaEmbalagemBobina $b) => [
                'id' => $b->id,
                'codigo' => $b->codigo,
                'sequencia' => $b->sequencia,
                'qtde_etiquetas' => (string) $b->qtde_etiquetas,
                'tubete' => $b->tubete,
                'caixa_id' => $b->caixa_id,
                'qr_payload' => $b->qrPayload(),
            ])->all();
            $out['caixas'] = $e->caixas->map(fn (PaEmbalagemCaixa $c) => [
                'id' => $c->id,
                'codigo' => $c->codigo,
                'sequencia' => $c->sequencia,
                'qtde_bobinas' => $c->qtde_bobinas,
                'qtde_etiquetas' => (string) $c->qtde_etiquetas,
                'qr_payload' => $c->qrPayload(),
            ])->all();
        }

        return $out;
    }

    /**
     * @param  list<array{qtde_etiquetas?: mixed}>|null  $bobinasIn
     * @return array<string, mixed>
     */
    private function montarPlano(OrdemProducao $op, string $qtdeBoa, ?array $bobinasIn): array
    {
        $pedido = $op->pedido;
        $snap = is_array($pedido?->snapshot) ? $pedido->snapshot : [];
        $input = is_array($snap['input'] ?? null) ? $snap['input'] : [];
        $faixa = is_array($snap['faixa'] ?? null) ? $snap['faixa'] : [];
        $espec = is_array($op->pedidoItem?->especificacao) ? $op->pedidoItem->especificacao : [];

        $etiqPorRolo = (int) ($espec['etiq_por_rolo'] ?? $input['etiq_por_rolo'] ?? 1000);
        if ($etiqPorRolo < 1) {
            $etiqPorRolo = 1000;
        }

        $rolosPorCaixa = (int) ($faixa['rolos_por_caixa'] ?? 12);
        if ($rolosPorCaixa < 1) {
            $rolosPorCaixa = 12;
        }

        $tubete = trim((string) ($espec['tubete'] ?? $input['tubete'] ?? ''));
        $caixaMedida = trim((string) ($faixa['caixa_medida'] ?? ''));
        $saida = isset($input['saida_etiqueta']) ? trim((string) $input['saida_etiqueta']) : null;
        if ($saida === '') {
            $saida = null;
        }

        if ($bobinasIn !== null) {
            $qtys = [];
            foreach ($bobinasIn as $i => $row) {
                if (! is_array($row)) {
                    continue;
                }
                $q = PadraoDecimal::parseStrict((string) ($row['qtde_etiquetas'] ?? ''), PadraoDecimal::SCALE_QTY);
                if ($q === null || bccomp($q, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                    throw ValidationException::withMessages([
                        "bobinas.{$i}.qtde_etiquetas" => ['Quantidade da bobina inválida.'],
                    ]);
                }
                $qtys[] = $q;
            }
            if ($qtys === []) {
                throw ValidationException::withMessages([
                    'bobinas' => ['Informe ao menos uma bobina.'],
                ]);
            }
        } else {
            $qtys = $this->distribuirEtiquetas($qtdeBoa, $etiqPorRolo);
        }

        $soma = '0';
        foreach ($qtys as $q) {
            $soma = bcadd($soma, $q, PadraoDecimal::SCALE_QTY);
        }
        if (bccomp($soma, $qtdeBoa, PadraoDecimal::SCALE_QTY) !== 0) {
            throw ValidationException::withMessages([
                'bobinas' => ["Soma das bobinas ({$soma}) deve igualar a quantidade boa ({$qtdeBoa})."],
            ]);
        }

        $nBobinas = count($qtys);
        $nCaixas = (int) ceil($nBobinas / $rolosPorCaixa);

        $bobinas = [];
        $caixasAcc = [];
        for ($c = 0; $c < $nCaixas; $c++) {
            $caixasAcc[$c] = [
                'sequencia' => $c + 1,
                'qtde_bobinas' => 0,
                'qtde_etiquetas' => '0',
            ];
        }

        foreach ($qtys as $i => $q) {
            $caixaIdx = (int) floor($i / $rolosPorCaixa);
            $bobinas[] = [
                'sequencia' => $i + 1,
                'qtde_etiquetas' => $q,
                'caixa_idx' => $caixaIdx,
            ];
            $caixasAcc[$caixaIdx]['qtde_bobinas']++;
            $caixasAcc[$caixaIdx]['qtde_etiquetas'] = bcadd(
                $caixasAcc[$caixaIdx]['qtde_etiquetas'],
                $q,
                PadraoDecimal::SCALE_QTY
            );
        }

        return [
            'qtde_etiquetas' => $qtdeBoa,
            'qtde_bobinas' => $nBobinas,
            'qtde_caixas' => $nCaixas,
            'etiq_por_rolo' => $etiqPorRolo,
            'rolos_por_caixa' => $rolosPorCaixa,
            'tubete' => $tubete !== '' ? $tubete : null,
            'caixa_medida' => $caixaMedida !== '' ? $caixaMedida : null,
            'saida_etiqueta' => $saida,
            'bobinas' => $bobinas,
            'caixas' => array_values($caixasAcc),
            'resumo' => number_format((float) $qtdeBoa, 0, ',', '.').' etiquetas · '
                .$nBobinas.' bobina'.($nBobinas === 1 ? '' : 's').' · '
                .$nCaixas.' caixa'.($nCaixas === 1 ? '' : 's'),
        ];
    }

    /**
     * @return list<string>
     */
    private function distribuirEtiquetas(string $qtdeBoa, int $etiqPorRolo): array
    {
        $porRolo = (string) $etiqPorRolo;
        if (bccomp($qtdeBoa, $porRolo, PadraoDecimal::SCALE_QTY) <= 0) {
            return [$qtdeBoa];
        }

        $nCheias = (int) floor((float) bcdiv($qtdeBoa, $porRolo, 8));
        $consumido = bcmul((string) $nCheias, $porRolo, PadraoDecimal::SCALE_QTY);
        $resto = PadraoDecimal::roundHalfUp(
            bcsub($qtdeBoa, $consumido, PadraoDecimal::SCALE_QTY + 2),
            PadraoDecimal::SCALE_QTY
        );

        $out = [];
        for ($i = 0; $i < $nCheias; $i++) {
            $out[] = PadraoDecimal::roundHalfUp($porRolo, PadraoDecimal::SCALE_QTY);
        }
        if (bccomp($resto, '0', PadraoDecimal::SCALE_QTY) > 0) {
            $out[] = $resto;
        }

        return $out;
    }

    private function nfAutorizadaDoPedido(Empresa $empresa, int $pedidoId): bool
    {
        $fat = Faturamento::query()
            ->where('empresa_id', $empresa->id)
            ->where('pedido_id', $pedidoId)
            ->where('status', Faturamento::STATUS_CONFIRMADO)
            ->first();
        if (! $fat) {
            return false;
        }

        return DocumentoFiscalSaida::query()
            ->where('faturamento_id', $fat->id)
            ->where('status', DocumentoFiscalSaida::STATUS_AUTORIZADO)
            ->exists();
    }

    private function assertOpEmpresa(Empresa $empresa, OrdemProducao $op): void
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }
    }
}
