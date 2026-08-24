<?php

namespace App\Services\Plataforma;

use App\Models\AuditLog;
use App\Models\ContaAtivacao;
use App\Models\EmpresaAtivacao;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Banking\Billing\BillingCatalog;
use App\Support\PlatformRbac;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ConsolePlataformaService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly EmpresaOnboardingService $onboarding,
        private readonly BillingCatalog $billing,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function metricas(): array
    {
        $valor = $this->billing->valorTabela();
        $base = ContaAtivacao::query();

        $ativas = (clone $base)->where('billing_status', ContaAtivacao::BILLING_ATIVA)
            ->whereNotNull('billing_metodo_em')
            ->where(function (Builder $q) {
                $this->escopoSemCortesiaVigente($q);
            })
            ->count();
        $cortesia = (clone $base)->where(function (Builder $q) {
            $this->escopoCortesiaVigente($q);
        })->count();
        $pendentes = (clone $base)->where(function (Builder $q) {
            $q->where(function (Builder $q2) {
                $q2->where('billing_status', ContaAtivacao::BILLING_PENDENTE)
                    ->orWhere(function (Builder $q3) {
                        $q3->where('billing_status', ContaAtivacao::BILLING_ATIVA)
                            ->whereNull('billing_metodo_em');
                    });
            })->where(function (Builder $q2) {
                $this->escopoSemCortesiaVigente($q2);
            });
        })->count();
        $suspensas = (clone $base)->where('billing_status', ContaAtivacao::BILLING_SUSPENSA)->count();

        $desde7 = now()->subDays(7);
        $desde30 = now()->subDays(30);

        return [
            'contas' => [
                'total' => ContaAtivacao::query()->count(),
                'em_dia' => $ativas,
                'cortesia' => $cortesia,
                'pendente' => $pendentes,
                'suspensa' => $suspensas,
            ],
            'novas_7d' => ContaAtivacao::query()->where('created_at', '>=', $desde7)->count(),
            'novas_30d' => ContaAtivacao::query()->where('created_at', '>=', $desde30)->count(),
            'mrr_estimado' => round($ativas * $valor, 2),
            'valor_mensalidade' => $valor,
            'ciclo' => $this->billing->ciclo(),
            'max_empresas_conta' => ContaAtivacao::maxEmpresasPorConta(),
        ];
    }

    /**
     * @return LengthAwarePaginator<int, ContaAtivacao>
     */
    public function listarContas(?string $status, ?string $saude, ?string $q, int $perPage = 25): LengthAwarePaginator
    {
        $query = ContaAtivacao::query()->with(['user']);

        if ($status !== null && $status !== '') {
            $query->where('billing_status', strtoupper($status));
        }

        $this->aplicarFiltroSaude($query, $saude);

        if ($q !== null && trim($q) !== '') {
            $term = '%'.trim($q).'%';
            $query->whereHas('user', function (Builder $u) use ($term) {
                $u->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('codigo', 'like', $term);
            });
        }

        return $query->orderByDesc('id')->paginate($perPage);
    }

    /**
     * Provisiona conta master (mesmo motor do CLI plataforma:criar-conta).
     *
     * @param  array{name: string, email: string, password?: string|null, cortesia_dias?: int|null, cortesia_motivo?: string|null}  $data
     * @return array{conta: ContaAtivacao, senha_temporaria: string|null}
     */
    public function provisionarConta(array $data, ?User $operador = null): array
    {
        $email = strtolower(trim((string) $data['email']));
        $name = trim((string) $data['name']);
        $plain = isset($data['password']) && is_string($data['password']) && $data['password'] !== ''
            ? $data['password']
            : null;
        $generated = $plain === null;
        if ($generated) {
            $plain = Str::password(16);
        }

        $out = $this->onboarding->registrarConta([
            'admin_name' => $name,
            'admin_email' => $email,
            'admin_password' => $plain,
        ]);

        /** @var User $user */
        $user = $out['user'];
        $conta = ContaAtivacao::query()->where('user_id', $user->id)->firstOrFail();

        $dias = isset($data['cortesia_dias']) ? (int) $data['cortesia_dias'] : 0;
        if ($dias > 0) {
            $this->aplicarCortesia(
                $conta,
                $dias,
                isset($data['cortesia_motivo']) ? (string) $data['cortesia_motivo'] : null,
                $operador,
                auditar: false,
            );
            $conta->refresh();
        }

        $this->audit->log('PLATAFORMA_CONTA_CRIAR', 'conta_ativacao', $conta->id, null, [
            'user_id' => $user->id,
            'email' => $user->email,
            'codigo' => $user->codigo,
            'cortesia_dias' => $dias > 0 ? $dias : null,
            'cortesia_ate' => $conta->cortesia_ate?->toIso8601String(),
        ]);

        return [
            'conta' => $conta->load('user'),
            'senha_temporaria' => $generated ? $plain : null,
        ];
    }

    /**
     * Concede, estende ou revoga período cortesia (bonificação).
     *
     * @param  array{dias?: int|null, ate?: string|null, motivo?: string|null, revogar?: bool, encerrar?: bool}  $data
     */
    public function bonificarConta(ContaAtivacao $row, array $data, ?User $operador = null): ContaAtivacao
    {
        if (! empty($data['encerrar'])) {
            return $this->encerrarCortesia($row, $operador);
        }

        if (! empty($data['revogar'])) {
            $de = [
                'cortesia_ate' => $row->cortesia_ate?->toIso8601String(),
                'cortesia_motivo' => $row->cortesia_motivo,
            ];
            $row->cortesia_ate = null;
            $row->cortesia_motivo = null;
            $row->cortesia_concedida_em = null;
            $row->cortesia_por_user_id = null;
            $row->save();

            $this->audit->log('PLATAFORMA_CONTA_CORTESIA_REVOGAR', 'conta_ativacao', $row->id, $de, [
                'user_id' => $row->user_id,
            ]);

            return $row->fresh(['user']) ?? $row;
        }

        $dias = isset($data['dias']) ? (int) $data['dias'] : 0;
        $ateRaw = isset($data['ate']) ? trim((string) $data['ate']) : '';
        $motivo = isset($data['motivo']) ? trim((string) $data['motivo']) : null;

        if ($dias <= 0 && $ateRaw === '') {
            throw ValidationException::withMessages([
                'dias' => ['Informe dias de cortesia ou a data final (ate).'],
            ]);
        }

        if ($dias > 0) {
            return $this->aplicarCortesia($row, $dias, $motivo, $operador);
        }

        try {
            $ate = Carbon::parse($ateRaw)->endOfDay();
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'ate' => ['Data final inválida.'],
            ]);
        }

        if ($ate->lessThan(now())) {
            throw ValidationException::withMessages([
                'ate' => ['A data final da cortesia deve ser hoje ou futura.'],
            ]);
        }

        return $this->aplicarCortesiaAte($row, $ate, $motivo, $operador);
    }

    /**
     * Encerra a cortesia hoje, preservando o histórico (não é revogar).
     * Não mexe em EMP/PAR/ORC nem no pagamento ASAAS já autenticado.
     */
    public function encerrarCortesia(ContaAtivacao $row, ?User $operador = null): ContaAtivacao
    {
        if ($row->cortesia_ate === null) {
            throw ValidationException::withMessages([
                'cortesia' => ['Esta conta não tem período cortesia para encerrar.'],
            ]);
        }

        if ($row->cortesiaEncerrada()) {
            return $row->fresh(['user']) ?? $row;
        }

        $de = [
            'cortesia_ate' => $row->cortesia_ate->toIso8601String(),
            'cortesia_motivo' => $row->cortesia_motivo,
        ];
        $row->cortesia_ate = now()->subSecond();
        $row->save();

        $this->audit->log('PLATAFORMA_CONTA_CORTESIA_ENCERRAR', 'conta_ativacao', $row->id, $de, [
            'user_id' => $row->user_id,
            'cortesia_ate' => $row->cortesia_ate?->toIso8601String(),
            'operador_id' => $operador?->id,
        ]);

        return $row->fresh(['user']) ?? $row;
    }

    /**
     * Cenário de produção no cadastro atual: cortesia acabou e a 1ª mensalidade vence hoje.
     * Não apaga empresas, clientes nem orçamentos.
     *
     * @param  array{reabrir_demo?: bool, forcar_pendente?: bool}  $opts
     * @return array{conta: ContaAtivacao, reabriu_cobranca: bool, empresas: int}
     */
    public function abrirCobrancaPosCortesia(ContaAtivacao $row, array $opts = [], ?User $operador = null): array
    {
        if ($row->billing_status === ContaAtivacao::BILLING_SUSPENSA
            && filled($row->billing_subscription_ref)
            && empty($opts['forcar_pendente'])) {
            throw ValidationException::withMessages([
                'cobranca' => ['Conta suspensa no ASAAS — regularize pelo webhook ou use --forcar-pendente só em lab.'],
            ]);
        }

        if ($row->cortesia_ate !== null && $row->cortesiaVigente()) {
            $row = $this->encerrarCortesia($row, $operador);
        } elseif ($row->cortesia_ate === null) {
            $row->cortesia_ate = now()->subSecond();
            $row->cortesia_motivo = $row->cortesia_motivo ?: 'Período inicial encerrado — cobrança antecipada';
            $row->cortesia_concedida_em ??= now()->subSecond();
            $row->save();
            $this->audit->log('PLATAFORMA_CONTA_CORTESIA_ENCERRAR', 'conta_ativacao', $row->id, null, [
                'user_id' => $row->user_id,
                'sintetico' => true,
            ]);
        }

        $reabrirDemo = ($opts['reabrir_demo'] ?? true) === true;
        $forcar = ($opts['forcar_pendente'] ?? false) === true;
        $temAssinaturaAsaas = filled($row->billing_subscription_ref);
        $reabriu = false;

        if ($forcar || ($reabrirDemo && ! $temAssinaturaAsaas && ($row->pagamentoAutenticado() || $row->billing_status !== ContaAtivacao::BILLING_PENDENTE))) {
            $de = [
                'billing_status' => $row->billing_status,
                'billing_metodo_em' => $row->billing_metodo_em?->toIso8601String(),
            ];
            $row->billing_status = ContaAtivacao::BILLING_PENDENTE;
            $row->billing_metodo_em = null;
            $row->billing_checkout_ref = null;
            $row->billing_checkout_url = null;
            $row->save();
            $reabriu = true;
            $this->audit->log('PLATAFORMA_CONTA_COBRANCA_POS_CORTESIA', 'conta_ativacao', $row->id, $de, [
                'user_id' => $row->user_id,
                'forcar' => $forcar,
            ]);
        }

        $fresh = $row->fresh(['user']) ?? $row;
        if (! $fresh->pagamentoAutenticado()) {
            $this->reabrirEmpresasDaConta($fresh);
        }
        $empresas = $fresh->user ? $fresh->user->empresas()->count() : 0;

        return [
            'conta' => $fresh,
            'reabriu_cobranca' => $reabriu,
            'empresas' => $empresas,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function apresentarConta(ContaAtivacao $row): array
    {
        $user = $row->user;
        $empresasCount = $user ? $user->empresas()->count() : 0;
        $usuariosCount = $user ? $this->usuariosDaContaQuery($user)->count() : 0;
        $paga = $row->pagamentoAutenticado();
        $saude = $this->saudeDe($row);

        return [
            'id' => $row->id,
            'user_id' => $row->user_id,
            'master' => $user ? [
                'id' => $user->id,
                'codigo' => $user->codigo,
                'name' => $user->name,
                'email' => $user->email,
                'ativo' => (bool) $user->ativo,
                'ultimo_login_em' => $user->ultimo_login_em?->toIso8601String(),
                'created_at' => $user->created_at?->toIso8601String(),
            ] : null,
            'billing_status' => $row->billing_status,
            'billing_provider' => $row->billing_provider,
            'billing_customer_ref' => $row->billing_customer_ref,
            'billing_subscription_ref' => $row->billing_subscription_ref,
            'billing_metodo_em' => $row->billing_metodo_em?->toIso8601String(),
            'pagamento_autenticado' => $paga,
            'acesso_liberado' => $row->acessoLiberado(),
            'cortesia' => $this->dtoCortesia($row),
            'saude' => $saude,
            'saude_label' => $this->saudeLabel($saude),
            'empresas_count' => $empresasCount,
            'usuarios_count' => $usuariosCount,
            'max_empresas' => ContaAtivacao::maxEmpresasPorConta(),
            'created_at' => $row->created_at?->toIso8601String(),
        ];
    }

    public function encontrarConta(int $id): ContaAtivacao
    {
        $row = ContaAtivacao::query()->with('user')->find($id);
        if ($row === null) {
            abort(404, 'Conta não encontrada.');
        }

        return $row;
    }

    /**
     * @return array<string, mixed>
     */
    public function detalheConta(ContaAtivacao $row): array
    {
        $this->audit->log('PLATAFORMA_CONTA_VER', 'conta_ativacao', $row->id, null, [
            'user_id' => $row->user_id,
        ]);

        $user = $row->user;
        $dto = $this->apresentarConta($row);
        $dto['empresas'] = $user ? $this->empresasDaConta($user) : [];
        $dto['usuarios'] = $user ? $this->usuariosDaConta($user) : [];
        $dto['fatura'] = [
            'valor' => $this->billing->valorTabela(),
            'ciclo' => $this->billing->ciclo(),
            'descricao' => $this->billing->descricao(),
            'fornecedor' => 'TRIGGER',
            'produto' => (string) config('erp.brand.licensee_product', 'FLEXOERP'),
        ];

        return $dto;
    }

    /**
     * @return LengthAwarePaginator<int, AuditLog>
     */
    public function auditoria(int $perPage = 40): LengthAwarePaginator
    {
        return AuditLog::query()
            ->with('user')
            ->where('acao', 'like', 'PLATAFORMA_%')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    /**
     * @return array<string, mixed>
     */
    public function apresentarAuditoria(AuditLog $log): array
    {
        return [
            'id' => $log->id,
            'acao' => $log->acao,
            'entidade' => $log->entidade,
            'entidade_id' => $log->entidade_id,
            'para' => $log->para,
            'ip' => $log->ip,
            'created_at' => $log->created_at?->toIso8601String(),
            'user' => $log->user ? [
                'id' => $log->user->id,
                'name' => $log->user->name,
                'email' => $log->user->email,
                'codigo' => $log->user->codigo,
            ] : null,
        ];
    }

    private function aplicarCortesia(
        ContaAtivacao $row,
        int $dias,
        ?string $motivo,
        ?User $operador,
        bool $auditar = true,
    ): ContaAtivacao {
        if ($dias < 1 || $dias > 3660) {
            throw ValidationException::withMessages([
                'dias' => ['Use entre 1 e 3660 dias de cortesia.'],
            ]);
        }

        $base = $row->cortesiaVigente() && $row->cortesia_ate !== null
            ? $row->cortesia_ate->copy()
            : now();
        $ate = $base->copy()->addDays($dias)->endOfDay();

        return $this->aplicarCortesiaAte($row, $ate, $motivo, $operador, $auditar);
    }

    private function aplicarCortesiaAte(
        ContaAtivacao $row,
        Carbon $ate,
        ?string $motivo,
        ?User $operador,
        bool $auditar = true,
    ): ContaAtivacao {
        if ($row->billing_status === ContaAtivacao::BILLING_SUSPENSA) {
            throw ValidationException::withMessages([
                'cortesia' => ['Conta suspensa — regularize antes de bonificar.'],
            ]);
        }

        $motivoLimpo = $motivo !== null && trim($motivo) !== '' ? mb_substr(trim($motivo), 0, 255) : null;
        $de = [
            'cortesia_ate' => $row->cortesia_ate?->toIso8601String(),
            'cortesia_motivo' => $row->cortesia_motivo,
        ];

        $row->cortesia_ate = $ate;
        $row->cortesia_motivo = $motivoLimpo;
        $row->cortesia_concedida_em = now();
        $row->cortesia_por_user_id = $operador?->id;
        $row->save();

        if ($auditar) {
            $this->audit->log('PLATAFORMA_CONTA_CORTESIA', 'conta_ativacao', $row->id, $de, [
                'user_id' => $row->user_id,
                'cortesia_ate' => $row->cortesia_ate?->toIso8601String(),
                'cortesia_motivo' => $row->cortesia_motivo,
            ]);
        }

        return $row->fresh(['user']) ?? $row;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function dtoCortesia(ContaAtivacao $row): ?array
    {
        if ($row->cortesia_ate === null) {
            return null;
        }

        $vigente = $row->cortesiaVigente();
        $dias = null;
        if ($vigente) {
            $dias = (int) now()->startOfDay()->diffInDays($row->cortesia_ate->copy()->startOfDay());
        }

        return [
            'vigente' => $vigente,
            'ate' => $row->cortesia_ate->toIso8601String(),
            'ate_formatada' => $row->cortesia_ate->timezone(config('app.timezone'))->format('d/m/Y'),
            'dias_restantes' => $dias,
            'motivo' => $row->cortesia_motivo,
            'concedida_em' => $row->cortesia_concedida_em?->toIso8601String(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function empresasDaConta(User $master): array
    {
        $empresas = $master->empresas()->with('ativacao')->orderBy('empresas.codigo')->get();

        return $empresas->map(function ($e) {
            $ativ = $e->ativacao;

            return [
                'id' => $e->id,
                'codigo' => $e->codigo,
                'cnpj' => $e->cnpj,
                'razao_social' => $e->razao_social,
                'nome_fantasia' => $e->nome_fantasia,
                'situacao' => $e->situacao,
                'self_service' => $ativ !== null,
                'billing_status' => $ativ?->billing_status,
                'catalogo_conferido' => $ativ?->catalogo_conferido_em !== null,
            ];
        })->values()->all();
    }

    /** Recoloca EMP em PENDENTE se a conta não está autenticada. Não apaga o livro. */
    private function reabrirEmpresasDaConta(ContaAtivacao $row): void
    {
        $user = $row->user;
        if ($user === null) {
            return;
        }

        $user->loadMissing('empresas.ativacao');
        foreach ($user->empresas as $empresa) {
            $ativ = $empresa->ativacao;
            if ($ativ === null) {
                continue;
            }
            $ativ->billing_status = EmpresaAtivacao::BILLING_PENDENTE;
            $ativ->billing_metodo_em = null;
            $ativ->billing_checkout_ref = null;
            $ativ->billing_checkout_url = null;
            $ativ->save();
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function usuariosDaConta(User $master): array
    {
        return $this->usuariosDaContaQuery($master)
            ->with(['roles', 'empresas'])
            ->orderBy('users.codigo')
            ->get()
            ->map(function (User $u) {
                return [
                    'id' => $u->id,
                    'codigo' => $u->codigo,
                    'name' => $u->name,
                    'email' => $u->email,
                    'ativo' => (bool) $u->ativo,
                    'ultimo_login_em' => $u->ultimo_login_em?->toIso8601String(),
                    'roles' => $u->getRoleNames()->values()->all(),
                    'empresas' => $u->empresas->map(fn ($e) => [
                        'id' => $e->id,
                        'codigo' => $e->codigo,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return Builder<User>
     */
    private function usuariosDaContaQuery(User $master): Builder
    {
        $empresaIds = $master->empresas()->pluck('empresas.id')->all();

        $query = User::query()->where('id', $master->id);
        if ($empresaIds !== []) {
            $query = User::query()->where(function (Builder $q) use ($master, $empresaIds) {
                $q->where('id', $master->id)
                    ->orWhereHas('empresas', fn (Builder $e) => $e->whereIn('empresas.id', $empresaIds));
            });
        }

        return $query->whereDoesntHave('roles', fn (Builder $r) => $r->where('name', PlatformRbac::ROLE));
    }

    private function aplicarFiltroSaude(Builder $query, ?string $saude): void
    {
        if ($saude === null || $saude === '' || $saude === 'todas') {
            return;
        }

        match ($saude) {
            'em_dia' => $query->where('billing_status', ContaAtivacao::BILLING_ATIVA)
                ->whereNotNull('billing_metodo_em')
                ->where(function (Builder $q) {
                    $this->escopoSemCortesiaVigente($q);
                }),
            'cortesia' => $query->where(function (Builder $q) {
                $this->escopoCortesiaVigente($q);
            }),
            'pendente' => $query->where(function (Builder $q) {
                $q->where(function (Builder $q2) {
                    $q2->where('billing_status', ContaAtivacao::BILLING_PENDENTE)
                        ->orWhere(function (Builder $q3) {
                            $q3->where('billing_status', ContaAtivacao::BILLING_ATIVA)
                                ->whereNull('billing_metodo_em');
                        });
                })->where(function (Builder $q2) {
                    $this->escopoSemCortesiaVigente($q2);
                });
            }),
            'suspensa' => $query->where('billing_status', ContaAtivacao::BILLING_SUSPENSA),
            default => throw ValidationException::withMessages([
                'saude' => ['Use em_dia, cortesia, pendente, suspensa ou todas.'],
            ]),
        };
    }

    private function escopoCortesiaVigente(Builder $q): void
    {
        $q->whereNotNull('cortesia_ate')
            ->where('cortesia_ate', '>=', now());
    }

    private function escopoSemCortesiaVigente(Builder $q): void
    {
        $q->where(function (Builder $q2) {
            $q2->whereNull('cortesia_ate')
                ->orWhere('cortesia_ate', '<', now());
        });
    }

    private function saudeDe(ContaAtivacao $row): string
    {
        if ($row->billing_status === ContaAtivacao::BILLING_SUSPENSA) {
            return 'suspensa';
        }
        // Mesma prioridade da fatura do cliente: cortesia do setup sobrescreve “em dia”.
        if ($row->cortesiaVigente()) {
            return 'cortesia';
        }
        if ($row->pagamentoAutenticado()) {
            return 'em_dia';
        }

        return 'pendente';
    }

    private function saudeLabel(string $saude): string
    {
        return match ($saude) {
            'em_dia' => 'Em dia',
            'cortesia' => 'Cortesia',
            'suspensa' => 'Suspensa',
            default => 'Pendente',
        };
    }
}
