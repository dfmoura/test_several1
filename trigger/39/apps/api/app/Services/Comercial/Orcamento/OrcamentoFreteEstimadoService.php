<?php

namespace App\Services\Comercial\Orcamento;

use App\Models\Empresa;
use App\Models\OrcCatalogoFaixaFrete;
use App\Models\OrcCatalogoParametro;
use App\Models\Parceiro;
use App\Models\ParceiroEnderecoEntrega;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Schema;

/**
 * Frete estimado no fechamento do ORC (estudo 32 · BL-058).
 * Não altera o motor R1–R20. Não chama ORS. Não inventa R$ se faltar dado.
 */
final class OrcamentoFreteEstimadoService
{
    public const MODO_RETIRAR = 'RETIRAR';

    public const MODO_ENTREGAR = 'ENTREGAR';

    public const DESTINO_FISCAL = 'fiscal';

    public const DESTINO_ENTREGA = 'entrega';

    /**
     * @param  array<string, mixed>  $result  saída do motor (+ faca nova)
     * @param  array<string, mixed>  $data    payload do wizard
     * @return array<string, mixed>
     */
    public function aplicar(array $result, array $data, Parceiro $parceiro, Empresa $empresa): array
    {
        $modo = $this->normalizarModo($data['modo_entrega'] ?? null);
        $destino = $this->resolverDestino($parceiro, $empresa);
        $pesoCaixa = $this->pesoCaixaKgVigente();

        $frete = [
            'modo' => $modo,
            'km' => $destino['km'],
            'destino' => $destino['tipo'],
            'destino_label' => $destino['label'],
            'peso_caixa_kg' => $pesoCaixa,
            'motivo' => null,
        ];

        $faixas = is_array($result['faixas'] ?? null) ? $result['faixas'] : [];

        if ($modo === self::MODO_RETIRAR) {
            $frete['motivo'] = 'retirar';
            foreach ($faixas as $i => $fx) {
                $faixas[$i] = $this->anexarFaixa($fx, [
                    'kg_est' => $this->kgEstimado($fx, $pesoCaixa),
                    'faixa_frete_kg_ate' => null,
                    'preco_por_km' => null,
                    'minimo_rs' => null,
                    'valor_frete' => PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY),
                    'frete_somavel' => false,
                ]);
            }
            $result['faixas'] = $faixas;
            $result['frete'] = $frete;

            return $result;
        }

        $motivoBase = $this->motivoEntregar($destino['km'], $pesoCaixa);
        $frete['motivo'] = $motivoBase;

        foreach ($faixas as $i => $fx) {
            $kgEst = $this->kgEstimado($fx, $pesoCaixa);
            $lookup = $motivoBase === null
                ? $this->lookupFaixa($kgEst)
                : ['faixa' => null, 'motivo' => $motivoBase];

            $motivo = $lookup['motivo'];
            $faixaCat = $lookup['faixa'];
            $valor = null;
            $somavel = false;

            if ($motivo === null && $faixaCat !== null && $destino['km'] !== null) {
                $calc = $this->calcularValor($faixaCat, $destino['km']);
                $valor = $calc['valor'];
                $motivo = $calc['motivo'];
                $somavel = $valor !== null;
            }

            $faixas[$i] = $this->anexarFaixa($fx, [
                'kg_est' => $kgEst,
                'faixa_frete_kg_ate' => $faixaCat?->isAcima() ? null : $this->dec($faixaCat?->kg_ate),
                'preco_por_km' => $this->dec($faixaCat?->preco_por_km),
                'minimo_rs' => $this->dec($faixaCat?->minimo_rs),
                'valor_frete' => $valor,
                'frete_somavel' => $somavel,
            ]);

            if ($motivo !== null && $frete['motivo'] === null) {
                $frete['motivo'] = $motivo;
            }
        }

        $result['faixas'] = $faixas;
        $result['frete'] = $frete;

        return $result;
    }

    public function normalizarModo(mixed $value): string
    {
        $s = strtoupper(trim((string) ($value ?? '')));

        return $s === self::MODO_ENTREGAR ? self::MODO_ENTREGAR : self::MODO_RETIRAR;
    }

    /**
     * @return array{tipo: string, label: string, km: string|null}
     */
    public function resolverDestino(Parceiro $parceiro, Empresa $empresa): array
    {
        $parceiro->loadMissing('enderecosEntrega');
        $entrega = $parceiro->enderecosEntrega
            ->first(fn (ParceiroEnderecoEntrega $e) => (bool) $e->principal)
            ?? $parceiro->enderecosEntrega->first();

        if ($entrega !== null) {
            return [
                'tipo' => self::DESTINO_ENTREGA,
                'label' => $this->labelEndereco(
                    $entrega->apelido,
                    $entrega->municipio,
                    $entrega->uf,
                ),
                'km' => $this->kmDaEmp(
                    $entrega->distancia_km,
                    $entrega->distancia_empresa_id,
                    $empresa->id,
                ),
            ];
        }

        return [
            'tipo' => self::DESTINO_FISCAL,
            'label' => $this->labelEndereco(null, $parceiro->municipio, $parceiro->uf),
            'km' => $this->kmDaEmp(
                $parceiro->distancia_km,
                $parceiro->distancia_empresa_id,
                $empresa->id,
            ),
        ];
    }

    public function pesoCaixaKgVigente(): ?string
    {
        if (! Schema::hasTable('orc_catalogo_parametros')) {
            return null;
        }

        $row = OrcCatalogoParametro::query()
            ->where('chave', OrcCatalogoParametro::CHAVE_PESO_CAIXA_KG)
            ->where('ativo', true)
            ->first();
        if ($row === null) {
            return null;
        }

        $valor = $this->dec($row->valor);
        if ($valor === null || bccomp($valor, '0', PadraoDecimal::SCALE_WEIGHT) <= 0) {
            return null;
        }

        return PadraoDecimal::roundHalfUp($valor, PadraoDecimal::SCALE_WEIGHT);
    }

    /**
     * @return array{faixa: OrcCatalogoFaixaFrete|null, motivo: string|null}
     */
    public function lookupFaixa(?string $kgEst): array
    {
        if ($kgEst === null) {
            return ['faixa' => null, 'motivo' => 'sem_peso'];
        }
        if (! Schema::hasTable('orc_catalogo_faixas_frete')) {
            return ['faixa' => null, 'motivo' => 'sem_faixa'];
        }

        $ativas = OrcCatalogoFaixaFrete::query()
            ->where('ativo', true)
            ->orderByRaw('kg_ate is null')
            ->orderBy('kg_ate')
            ->orderBy('ordem')
            ->get();

        if ($ativas->isEmpty()) {
            return ['faixa' => null, 'motivo' => 'sem_faixa'];
        }

        foreach ($ativas as $faixa) {
            if ($faixa->isAcima()) {
                continue;
            }
            $limite = $this->dec($faixa->kg_ate);
            if ($limite !== null && bccomp($kgEst, $limite, PadraoDecimal::SCALE_WEIGHT) <= 0) {
                return ['faixa' => $faixa, 'motivo' => null];
            }
        }

        $acima = $ativas->first(fn (OrcCatalogoFaixaFrete $f) => $f->isAcima());
        if ($acima === null) {
            return ['faixa' => null, 'motivo' => 'sem_faixa'];
        }

        return ['faixa' => $acima, 'motivo' => null];
    }

    /**
     * @return array{valor: string|null, motivo: string|null}
     */
    public function calcularValor(OrcCatalogoFaixaFrete $faixa, string $km): array
    {
        $preco = $this->dec($faixa->preco_por_km);
        if ($preco === null || bccomp($preco, '0', PadraoDecimal::SCALE_UNIT_PRICE) < 0) {
            return ['valor' => null, 'motivo' => 'sob_consulta'];
        }

        $minimo = $this->dec($faixa->minimo_rs) ?? PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY);
        $produto = bcmul($preco, $km, 8);
        $bruto = bccomp($produto, $minimo, 8) >= 0 ? $produto : $minimo;

        return [
            'valor' => PadraoDecimal::roundCeil($bruto, PadraoDecimal::SCALE_MONEY),
            'motivo' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $fx
     */
    private function kgEstimado(array $fx, ?string $pesoCaixa): ?string
    {
        if ($pesoCaixa === null) {
            return null;
        }
        $caixas = (string) (int) ($fx['qtde_caixas'] ?? 0);
        if (bccomp($caixas, '0', 0) <= 0) {
            return null;
        }

        return PadraoDecimal::roundHalfUp(
            bcmul($caixas, $pesoCaixa, PadraoDecimal::SCALE_WEIGHT + 2),
            PadraoDecimal::SCALE_WEIGHT,
        );
    }

    private function motivoEntregar(?string $km, ?string $pesoCaixa): ?string
    {
        if ($km === null) {
            return 'sem_km';
        }
        if ($pesoCaixa === null) {
            return 'sem_peso';
        }

        return null;
    }

    private function kmDaEmp(mixed $km, mixed $empresaId, int $empresaAtual): ?string
    {
        if ($empresaId === null || (int) $empresaId !== $empresaAtual) {
            return null;
        }
        $canonical = $this->dec($km);
        if ($canonical === null || bccomp($canonical, '0', PadraoDecimal::SCALE_DISTANCE) < 0) {
            return null;
        }

        return PadraoDecimal::roundHalfUp($canonical, PadraoDecimal::SCALE_DISTANCE);
    }

    private function labelEndereco(?string $apelido, mixed $municipio, mixed $uf): string
    {
        $cidade = trim((string) $municipio);
        $ufTxt = strtoupper(trim((string) $uf));
        $local = $cidade !== ''
            ? ($ufTxt !== '' ? $cidade.'/'.$ufTxt : $cidade)
            : ($ufTxt !== '' ? $ufTxt : 'destino');
        $apelido = trim((string) $apelido);

        return $apelido !== '' ? $apelido.' · '.$local : $local;
    }

    /**
     * @param  array<string, mixed>  $fx
     * @param  array<string, mixed>  $frete
     * @return array<string, mixed>
     */
    private function anexarFaixa(array $fx, array $frete): array
    {
        return array_merge($fx, $frete);
    }

    private function dec(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return PadraoDecimal::parse((string) $value);
        } catch (\InvalidArgumentException) {
            return null;
        }
    }
}
