<?php

namespace App\Services\Plataforma;

use App\Models\BillingCatalogoInstalacao;
use App\Models\ContaAtivacao;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Banking\Asaas\AsaasBillingGateway;
use App\Services\Banking\Billing\BillingCatalog;
use App\Services\Banking\Inter\InterBillingGateway;
use Illuminate\Validation\ValidationException;

/** Setup do plano comercial (mensalidade conta → TRIGGER) no console PLATAFORMA. */
final class BillingCatalogoService
{
    public function __construct(
        private readonly BillingCatalog $catalog,
        private readonly AuditLogger $audit,
        private readonly InterBillingGateway $inter,
        private readonly AsaasBillingGateway $asaas,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function apresentar(): array
    {
        $row = BillingCatalogoInstalacao::atual();
        $valor = $this->catalog->valorTabela();
        $emDia = ContaAtivacao::query()
            ->where('billing_status', ContaAtivacao::BILLING_ATIVA)
            ->whereNotNull('billing_metodo_em')
            ->count();

        return [
            'fonte' => $row !== null ? 'banco' : 'env',
            'valor' => $valor,
            'ciclo' => $this->catalog->ciclo(),
            'ciclo_label' => $this->catalog->cicloLabel(),
            'descricao' => $this->catalog->descricao(),
            'vigente_desde' => $row?->vigente_desde?->toIso8601String(),
            'atualizado_em' => $row?->updated_at?->toIso8601String(),
            'billing_provider' => strtolower(trim((string) config('erp.billing.provider', 'mock'))),
            'impacto' => [
                'contas_em_dia' => $emDia,
                'mrr_estimado' => round($emDia * $valor, 2),
            ],
            'env_fallback' => [
                'valor' => (float) config('erp.billing.valor', 297),
                'ciclo' => (string) config('erp.billing.ciclo', 'MONTHLY'),
                'descricao' => (string) config('erp.billing.descricao', ''),
            ],
        ];
    }

    /**
     * @param  array{valor: float|string, ciclo?: string, descricao?: string}  $data
     * @return array<string, mixed>
     */
    public function salvar(array $data, ?User $ator = null): array
    {
        $valor = round((float) str_replace(',', '.', (string) $data['valor']), 2);
        if ($valor < 0) {
            throw ValidationException::withMessages([
                'valor' => ['O valor não pode ser negativo.'],
            ]);
        }
        $provider = strtolower(trim((string) config('erp.billing.provider', 'mock')));
        if ($provider === 'inter' && $valor > 0 && $valor < 2.50) {
            throw ValidationException::withMessages([
                'valor' => ['Com provedor Inter, o valor mínimo da mensalidade é R$ 2,50 (exigência do BolePix).'],
            ]);
        }

        $ciclo = strtoupper(trim((string) ($data['ciclo'] ?? $this->catalog->ciclo())));
        $ciclosValidos = ['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'];
        if (! in_array($ciclo, $ciclosValidos, true)) {
            throw ValidationException::withMessages([
                'ciclo' => ['Ciclo de cobrança inválido.'],
            ]);
        }

        $descricao = trim((string) ($data['descricao'] ?? $this->catalog->descricao()));
        if ($descricao === '') {
            $descricao = 'Mensalidade da conta FLEXORC';
        }
        if (mb_strlen($descricao) > 255) {
            throw ValidationException::withMessages([
                'descricao' => ['A descrição pode ter no máximo 255 caracteres.'],
            ]);
        }

        $anterior = BillingCatalogoInstalacao::atual();
        $valorAnterior = $this->catalog->valorTabela();
        $cicloAnterior = $this->catalog->ciclo();
        $descricaoAnterior = $this->catalog->descricao();

        $mudouPreco = abs($valor - $valorAnterior) >= 0.01;
        $mudouCiclo = $ciclo !== $cicloAnterior;
        $mudouDescricao = $descricao !== $descricaoAnterior;

        if (! $mudouPreco && ! $mudouCiclo && ! $mudouDescricao) {
            return array_merge($this->apresentar(), [
                'sync' => [
                    'pix_invalidados' => 0,
                    'asaas_atualizadas' => 0,
                    'asaas_ignoradas' => 0,
                    'asaas_erros' => [],
                ],
                'alterado' => false,
            ]);
        }

        $row = $anterior ?? new BillingCatalogoInstalacao;
        $row->valor = $valor;
        $row->ciclo = $ciclo;
        $row->descricao = $descricao;
        if ($mudouPreco || $anterior === null) {
            $row->vigente_desde = now();
        }
        $row->atualizado_por_user_id = $ator?->id;
        $row->save();

        $this->audit->log('PLATAFORMA_BILLING_CATALOGO', 'billing_catalogo_instalacao', $row->id, [
            'valor' => $valorAnterior,
            'ciclo' => $cicloAnterior,
            'descricao' => $descricaoAnterior,
        ], [
            'valor' => $valor,
            'ciclo' => $ciclo,
            'descricao' => $descricao,
            'ator_id' => $ator?->id,
        ]);

        $sync = [
            'pix_invalidados' => 0,
            'asaas_atualizadas' => 0,
            'asaas_ignoradas' => 0,
            'asaas_erros' => [],
        ];

        if ($mudouPreco) {
            $sync['pix_invalidados'] = $this->invalidarPixInterAbertos();
            $asaas = $this->asaas->sincronizarValorAssinaturas($valor);
            $sync['asaas_atualizadas'] = $asaas['atualizadas'];
            $sync['asaas_ignoradas'] = $asaas['ignoradas'];
            $sync['asaas_erros'] = $asaas['erros'];
        }

        return array_merge($this->apresentar(), [
            'sync' => $sync,
            'alterado' => true,
        ]);
    }

    private function invalidarPixInterAbertos(): int
    {
        $n = 0;
        ContaAtivacao::query()
            ->where('billing_provider', 'inter')
            ->where(function ($q) {
                $q->whereNotNull('billing_pix_copia_cola')
                    ->orWhereNotNull('billing_checkout_ref');
            })
            ->orderBy('id')
            ->each(function (ContaAtivacao $conta) use (&$n) {
                if ($this->inter->invalidarPixAberto($conta)) {
                    $n++;
                }
            });

        return $n;
    }
}
