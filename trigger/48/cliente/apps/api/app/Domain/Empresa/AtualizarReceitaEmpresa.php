<?php

declare(strict_types=1);

namespace App\Domain\Empresa;

use App\Domain\Auditoria\AuditoriaService;
use App\Domain\RegraNegocio;
use App\Models\Empresa;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class AtualizarReceitaEmpresa
{
    public const INTERVALO_DIAS = 30;

    public function __construct(
        private ConsultaCnpj $consulta,
        private AuditoriaService $auditoria,
    ) {}

    public function proximaLiberacao(Empresa $empresa): ?CarbonInterface
    {
        $ultima = $empresa->receita_atualizada_em ?? $empresa->criada_em;
        if ($ultima === null) {
            return null;
        }
        $libera = $ultima->copy()->addDays(self::INTERVALO_DIAS);
        if ($libera->lte(now())) {
            return null;
        }

        return $libera;
    }

    public function podeAtualizar(Empresa $empresa): bool
    {
        return $this->proximaLiberacao($empresa) === null;
    }

    /**
     * @return array{empresa: Empresa, aviso_situacao: string|null}
     */
    public function atualizar(Empresa $empresa, int $usuarioId): array
    {
        $proxima = $this->proximaLiberacao($empresa);
        if ($proxima !== null) {
            throw new RegraNegocio(
                'Os dados da Receita só podem ser atualizados de novo em '.$proxima->format('d/m/Y').'.'
            );
        }

        $receita = $this->consulta->consultar($empresa->cnpj);

        return DB::transaction(function () use ($empresa, $receita, $usuarioId) {
            /** @var Empresa $travada */
            $travada = Empresa::query()->whereKey($empresa->id)->lockForUpdate()->firstOrFail();
            $proxima = $this->proximaLiberacao($travada);
            if ($proxima !== null) {
                throw new RegraNegocio(
                    'Os dados da Receita só podem ser atualizados de novo em '.$proxima->format('d/m/Y').'.'
                );
            }

            $antes = [
                'razao_social' => $travada->razao_social,
                'nome_fantasia' => $travada->nome_fantasia,
                'situacao_cadastral' => $travada->situacao_cadastral,
            ];

            $travada->fill([
                'razao_social' => $receita->razaoSocial,
                'nome_fantasia' => $receita->nomeFantasia,
                'situacao_cadastral' => $receita->situacao,
                'dados_receita' => $receita->bruto,
                'receita_atualizada_em' => now(),
            ]);
            $travada->save();

            $this->auditoria->registrar(
                'empresa_receita_atualizada',
                'empresas',
                $travada->id,
                $travada->id,
                $antes,
                [
                    'razao_social' => $travada->razao_social,
                    'nome_fantasia' => $travada->nome_fantasia,
                    'situacao_cadastral' => $travada->situacao_cadastral,
                    'receita_atualizada_em' => $travada->receita_atualizada_em?->toIso8601String(),
                ],
                'CLIENTE',
                $usuarioId,
            );

            $aviso = null;
            if (! $receita->ativa) {
                $aviso = 'A situação cadastral na Receita está '.$receita->situacao.'. A Trigger foi avisada; saldo e demandas em curso não foram alterados.';
            }

            return [
                'empresa' => $travada->fresh(),
                'aviso_situacao' => $aviso,
            ];
        });
    }
}
