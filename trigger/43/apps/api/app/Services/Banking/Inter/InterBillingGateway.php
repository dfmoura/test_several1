<?php

namespace App\Services\Banking\Inter;

use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\EmpresaAtivacao;
use App\Models\User;
use App\Services\Banking\Billing\BillingCatalog;
use App\Services\Banking\Billing\BillingGateway;
use App\Support\BillingReference;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Mensalidade FLEXORC via BolePix Inter — PIX por ciclo (QR + copia-e-cola).
 * Não mistura com InterBankProvider do sinal ORC.
 */
final class InterBillingGateway implements BillingGateway
{
    public const CONTA_PREFIX = BillingReference::CONTA_LEGACY;

    public const EXTERNAL_PREFIX = BillingReference::BILLING_LEGACY;

    public function __construct(
        private readonly InterBillingClient $client,
        private readonly BillingCatalog $catalog,
    ) {}

    public function providerNome(): string
    {
        $configured = strtolower(trim((string) config('erp.billing.provider', 'mock')));
        if ($configured === 'inter' && $this->client->habilitado()) {
            return 'inter';
        }

        return 'mock';
    }

    public function podeConfirmarDemo(): bool
    {
        if ($this->providerNome() === 'mock') {
            return true;
        }

        $stage = strtolower((string) config('erp.stage', 'local'));

        return in_array($stage, ['local', 'testing'], true);
    }

    public function iniciarCheckout(Empresa $empresa, EmpresaAtivacao $ativacao): array
    {
        // Mensalidade canônica é da conta; EMP herda. Mantém contrato do interface.
        $userIds = $empresa->users()->pluck('users.id');
        $user = User::query()->whereIn('id', $userIds)->orderBy('id')->first();
        if ($user === null) {
            throw new RuntimeException('Conta FLEXORC não encontrada para emitir PIX.');
        }

        $conta = ContaAtivacao::query()->where('user_id', $user->id)->first();
        if ($conta === null) {
            throw new RuntimeException('Ativação da conta não encontrada.');
        }

        return $this->iniciarCheckoutConta($user, $conta);
    }

    public function iniciarCheckoutConta(User $user, ContaAtivacao $ativacao): array
    {
        $provider = $this->providerNome();
        if ($provider === 'mock' || ! $this->client->habilitado()) {
            return [
                'checkout_url' => null,
                'customer_ref' => $ativacao->billing_customer_ref,
                'checkout_ref' => $ativacao->billing_checkout_ref,
                'provider' => 'mock',
                'pix_copia_cola' => $ativacao->billing_pix_copia_cola,
                'pix_qr_base64' => $ativacao->billing_pix_qr_base64,
                'charge_vencimento' => $ativacao->billing_charge_vencimento?->toDateString(),
                'pix_emitido_em' => $ativacao->billing_pix_emitido_em?->toIso8601String(),
                'pix_expira_em' => $this->pixExpiraEm($ativacao)?->toIso8601String(),
            ];
        }

        // Reutiliza cobrança aberta válida (vencimento + TTL operacional).
        if ($this->pixAbertoValido($ativacao)) {
            return [
                'checkout_url' => null,
                'customer_ref' => $ativacao->billing_customer_ref,
                'checkout_ref' => $ativacao->billing_checkout_ref,
                'provider' => 'inter',
                'pix_copia_cola' => $ativacao->billing_pix_copia_cola,
                'pix_qr_base64' => $ativacao->billing_pix_qr_base64,
                'charge_vencimento' => $ativacao->billing_charge_vencimento?->toDateString(),
                'pix_emitido_em' => $ativacao->billing_pix_emitido_em?->toIso8601String(),
                'pix_expira_em' => $this->pixExpiraEm($ativacao)?->toIso8601String(),
            ];
        }

        // PIX velho / vencido: cancela no Inter e emite outro.
        if (filled($ativacao->billing_checkout_ref) && filled($ativacao->billing_pix_copia_cola)) {
            $this->cancelarCobrancaAberta((string) $ativacao->billing_checkout_ref);
        }

        $vencimento = $this->catalog->primeiraCobrancaEm(
            $ativacao->cortesiaVigente() ? $ativacao->cortesia_ate : null,
        );
        if ($ativacao->pagamentoAutenticado() && $ativacao->billing_metodo_em !== null) {
            $fim = $this->catalog->avancarCiclo($ativacao->billing_metodo_em->copy()->startOfDay());
            $vencimento = $fim->lt(now()->startOfDay()) ? now()->startOfDay() : $fim;
        }

        // Vencimento nunca no passado (Inter rejeita com "Dados inválidos").
        $hoje = now()->startOfDay();
        if ($vencimento->lt($hoje)) {
            $vencimento = $hoje->copy();
        }

        $seuNumero = $this->seuNumeroCurto($user->id);
        $cicloTag = $vencimento->format('Ym');
        // Nova chave a cada emissão (após cancelar) — evita idempotência reaproveitar QR morto.
        $idem = substr(hash('sha256', 'inter-bill-'.$user->id.'-'.$cicloTag.'-'.microtime(true)), 0, 48);
        $pagador = $this->pagadorDaConta($user);
        $emitidoEm = now();
        $valor = round($this->catalog->valorCobranca(), 2);
        // Inter BolePix: valores muito baixos costumam voltar HTTP 400 "Dados inválidos".
        if ($valor < 2.50) {
            throw new RuntimeException(
                'Valor da mensalidade (R$ '.number_format($valor, 2, ',', '.').') está abaixo do mínimo do Inter (R$ 2,50). '
                .'Ajuste em Plataforma → Mensalidade e tente de novo.'
            );
        }

        $body = [
            'seuNumero' => $seuNumero,
            'valorNominal' => $valor,
            'dataVencimento' => $vencimento->toDateString(),
            'numDiasAgenda' => 0,
            'pagador' => $pagador,
            'mensagem' => [
                'linha1' => mb_substr($this->catalog->descricao(), 0, 78),
                'linha2' => mb_substr(BillingReference::contaRef($user->id), 0, 78),
            ],
            'formasRecebimento' => ['BOLETO', 'PIX'],
        ];

        $json = $this->client->emitirCobranca($body, $idem);
        $codigoSolicitacao = (string) ($json['codigoSolicitacao'] ?? $json['codigo_solicitacao'] ?? '');
        if ($codigoSolicitacao === '') {
            throw new RuntimeException('Inter não retornou codigoSolicitacao.');
        }

        $detail = $this->client->detalheCobranca($codigoSolicitacao);
        $pixCopia = $this->extrairPixCopia($detail);
        $pixQr = $this->extrairPixQr($detail);

        if (($pixCopia === null || $pixCopia === '') && $detail === []) {
            usleep(400000);
            $detail = $this->client->detalheCobranca($codigoSolicitacao);
            $pixCopia = $this->extrairPixCopia($detail);
            $pixQr = $this->extrairPixQr($detail);
        }

        if ($pixCopia === null || $pixCopia === '') {
            throw new RuntimeException('Inter não retornou PIX copia-e-cola. Tente de novo em alguns segundos.');
        }

        $expiraEm = $this->calcularPixExpiraEm($emitidoEm, $vencimento);

        return [
            'checkout_url' => null,
            'customer_ref' => BillingReference::contaRef($user->id),
            'checkout_ref' => $codigoSolicitacao,
            'provider' => 'inter',
            'pix_copia_cola' => $pixCopia,
            'pix_qr_base64' => $pixQr,
            'charge_vencimento' => $vencimento->toDateString(),
            'pix_emitido_em' => $emitidoEm->toIso8601String(),
            'pix_expira_em' => $expiraEm->toIso8601String(),
        ];
    }

    public function pixAbertoValido(ContaAtivacao $ativacao): bool
    {
        if (! filled($ativacao->billing_checkout_ref) || ! filled($ativacao->billing_pix_copia_cola)) {
            return false;
        }
        if ($ativacao->billing_charge_vencimento === null) {
            return false;
        }
        if ($ativacao->billing_charge_vencimento->lt(now()->startOfDay())) {
            return false;
        }

        $expira = $this->pixExpiraEm($ativacao);
        if ($expira === null) {
            return false;
        }

        return $expira->greaterThan(now());
    }

    public function pixExpiraEm(ContaAtivacao $ativacao): ?\Carbon\Carbon
    {
        if (! filled($ativacao->billing_pix_copia_cola) && $ativacao->billing_charge_vencimento === null) {
            return null;
        }

        // PIX legado sem âncora de emissão: força expiração (libera novo QR).
        if ($ativacao->billing_pix_emitido_em === null && filled($ativacao->billing_pix_copia_cola)) {
            return now()->subSecond();
        }

        $emitido = $ativacao->billing_pix_emitido_em?->copy() ?? now();
        $vencimento = $ativacao->billing_charge_vencimento?->copy()?->endOfDay();

        return $this->calcularPixExpiraEm($emitido, $vencimento ?? now()->endOfDay());
    }

    /**
     * Expira o PIX aberto (cancela no Inter + limpa campos). Idempotente.
     * Só age se há PIX e ele já não é válido.
     *
     * @return bool true se havia PIX e foi limpo
     */
    public function expirarPixAberto(ContaAtivacao $ativacao): bool
    {
        if (! filled($ativacao->billing_pix_copia_cola) && ! filled($ativacao->billing_checkout_ref)) {
            return false;
        }
        if ($this->pixAbertoValido($ativacao)) {
            return false;
        }

        return $this->invalidarPixAberto($ativacao);
    }

    /**
     * Cancela PIX aberto no Inter e limpa campos locais — mesmo se ainda válido (ex.: mudança de preço).
     */
    public function invalidarPixAberto(ContaAtivacao $ativacao): bool
    {
        if (! filled($ativacao->billing_pix_copia_cola) && ! filled($ativacao->billing_checkout_ref)) {
            return false;
        }

        $ref = (string) ($ativacao->billing_checkout_ref ?? '');
        if ($ref !== '') {
            $this->cancelarCobrancaAberta($ref);
        }

        $ativacao->billing_checkout_ref = null;
        $ativacao->billing_pix_copia_cola = null;
        $ativacao->billing_pix_qr_base64 = null;
        $ativacao->billing_charge_vencimento = null;
        $ativacao->billing_pix_emitido_em = null;
        $ativacao->save();

        return true;
    }

    public function ttlHoras(): int
    {
        $n = (int) config('erp.billing.inter_pix_ttl_horas', 3);

        return $n > 0 ? min($n, 48) : 3;
    }

    public function ehEventoBilling(array $payload): bool
    {
        $ref = $this->seuNumeroDoPayload($payload);
        if (BillingReference::isAnyRef($ref)) {
            return true;
        }

        $codigo = isset($payload['codigoSolicitacao']) ? (string) $payload['codigoSolicitacao'] : '';
        if ($codigo === '') {
            return false;
        }

        return ContaAtivacao::query()
            ->where('billing_checkout_ref', $codigo)
            ->where('billing_provider', 'inter')
            ->exists();
    }

    public function empresaIdDoPayload(array $payload): ?int
    {
        return BillingReference::empresaIdFromBillingRef($this->seuNumeroDoPayload($payload));
    }

    public function userIdDoPayload(array $payload): ?int
    {
        $ref = $this->seuNumeroDoPayload($payload);
        $fromPrefix = BillingReference::userIdFromContaRef($ref);
        if ($fromPrefix !== null) {
            return $fromPrefix;
        }
        // Legado: seuNumero fixo FC{userId}. Atual: F{userId5}{ts8} — resolução via codigoSolicitacao.
        if ($ref !== null && preg_match('/^FC(\d{1,13})$/', $ref, $m) === 1) {
            $id = (int) $m[1];
            if ($id > 0) {
                return $id;
            }
        }
        if ($ref !== null && preg_match('/^F(\d{5})\d{8}$/', $ref, $m) === 1) {
            $id = (int) $m[1];
            if ($id > 0) {
                return $id;
            }
        }

        $codigo = isset($payload['codigoSolicitacao']) ? (string) $payload['codigoSolicitacao'] : '';
        if ($codigo === '') {
            return null;
        }

        $conta = ContaAtivacao::query()
            ->where('billing_checkout_ref', $codigo)
            ->where('billing_provider', 'inter')
            ->first();

        return $conta?->user_id;
    }

    public function pagamentoConfirmado(array $payload): bool
    {
        $situacao = $this->situacaoDoPayload($payload);
        if (in_array($situacao, [
            'RECEBIDO',
            'PAGO',
            'MARCADO_RECEBIDO',
            'LIQUIDADO',
            'BAIXADO',
            'RECEBIDO_PIX',
            'PAGA',
            'PAGO_PIX',
        ], true)) {
            return true;
        }

        // Alguns payloads Inter trazem só o valor liquidado.
        $recebido = data_get($payload, 'valorTotalRecebido')
            ?? data_get($payload, 'cobranca.valorTotalRecebido')
            ?? data_get($payload, 'valorPago')
            ?? data_get($payload, 'pix.valor');
        if (is_numeric($recebido) && (float) $recebido > 0) {
            return true;
        }

        return false;
    }

    public function pagamentoEmAtrasoOuCancelado(array $payload): bool
    {
        $situacao = $this->situacaoDoPayload($payload);

        return in_array($situacao, ['CANCELADO', 'EXPIRADO', 'VENCIDO'], true);
    }

    /**
     * Pull de segurança quando o webhook Inter não chega (túnel/lab/portal).
     * Consulta a cobrança aberta no Inter; se paga, devolve payload compatível com o webhook.
     * Rate-limit por conta para não estourar OAuth (429) no polling da UI.
     *
     * @return array<string, mixed>|null
     */
    public function consultarCobrancaAbertaSePaga(ContaAtivacao $ativacao): ?array
    {
        if ($ativacao->pagamentoAutenticado()) {
            return null;
        }
        if ($this->providerNome() !== 'inter' || ! $this->client->habilitado()) {
            return null;
        }

        $ref = trim((string) ($ativacao->billing_checkout_ref ?? ''));
        if ($ref === '' || ! filled($ativacao->billing_pix_copia_cola)) {
            return null;
        }

        $cacheKey = 'inter.billing.reconcile.'.$ativacao->id;
        if (Cache::has($cacheKey)) {
            return null;
        }

        try {
            $detail = $this->client->detalheCobranca($ref);
        } catch (\Throwable $e) {
            // Falha transitória (429/rede): reintento mais cedo que sucesso negativo.
            Cache::put($cacheKey, 1, now()->addSeconds(12));
            Log::warning('inter.billing.reconcile.falha', [
                'conta_id' => $ativacao->id,
                'ref' => $ref,
                'msg' => $e->getMessage(),
            ]);

            return null;
        }

        if ($detail === []) {
            Cache::put($cacheKey, 1, now()->addSeconds(15));
            Log::info('inter.billing.reconcile.vazio', [
                'conta_id' => $ativacao->id,
                'ref' => $ref,
            ]);

            return null;
        }

        if (! $this->pagamentoConfirmado($detail)) {
            Cache::put($cacheKey, 1, now()->addSeconds(20));
            Log::info('inter.billing.reconcile.aguardando', [
                'conta_id' => $ativacao->id,
                'ref' => $ref,
                'situacao' => $this->situacaoDoPayload($detail),
                'valor_recebido' => data_get($detail, 'valorTotalRecebido')
                    ?? data_get($detail, 'cobranca.valorTotalRecebido'),
            ]);

            return null;
        }

        Cache::put($cacheKey, 1, now()->addSeconds(60));
        Log::info('inter.billing.reconcile.pago', [
            'conta_id' => $ativacao->id,
            'ref' => $ref,
            'situacao' => $this->situacaoDoPayload($detail),
        ]);

        return [
            'codigoSolicitacao' => $ref,
            'seuNumero' => BillingReference::contaRef($ativacao->user_id),
            'situacao' => 'RECEBIDO',
            'dataHoraSituacao' => data_get($detail, 'dataHoraSituacao')
                ?? data_get($detail, 'cobranca.dataHoraSituacao')
                ?? now()->toIso8601String(),
            'valorTotalRecebido' => data_get($detail, 'valorTotalRecebido')
                ?? data_get($detail, 'cobranca.valorTotalRecebido')
                ?? data_get($detail, 'valorNominal')
                ?? data_get($detail, 'cobranca.valorNominal'),
            'origem' => 'reconcile_pull',
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function situacaoDoPayload(array $payload): string
    {
        $raw = $payload['situacao']
            ?? $payload['status']
            ?? data_get($payload, 'cobranca.situacao')
            ?? data_get($payload, 'cobranca.status')
            ?? '';

        return strtoupper(trim((string) $raw));
    }

    public function primeiraCobrancaEm(?CarbonInterface $cortesiaAte = null, ?CarbonInterface $agora = null): CarbonInterface
    {
        return $this->catalog->primeiraCobrancaEm($cortesiaAte, $agora);
    }

    public function alertaCortesiaDias(): int
    {
        return $this->catalog->alertaCortesiaDias();
    }

    public function cicloStatus(?CarbonInterface $autenticadoEm, bool $paga): array
    {
        return $this->catalog->cicloStatusPixPorCiclo($autenticadoEm, $paga);
    }

    public function valorTabela(): float
    {
        return $this->catalog->valorTabela();
    }

    public function valorCobranca(): float
    {
        return $this->catalog->valorCobranca();
    }

    public function ciclo(): string
    {
        return $this->catalog->ciclo();
    }

    public function cicloLabel(): string
    {
        return $this->catalog->cicloLabel();
    }

    public function descricao(): string
    {
        return $this->catalog->descricao();
    }

    public function cicloVencidoLocal(?CarbonInterface $autenticadoEm): bool
    {
        return $this->catalog->cicloVencido($autenticadoEm);
    }

    public function precisaPagarCiclo(ContaAtivacao $conta): bool
    {
        return $this->catalog->precisaPagarCicloPix($conta);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function seuNumeroDoPayload(array $payload): ?string
    {
        foreach (['seuNumero', 'seu_numero', 'externalReference'] as $key) {
            $v = $payload[$key] ?? null;
            if (is_string($v) && $v !== '') {
                return $v;
            }
        }

        $nested = data_get($payload, 'cobranca.seuNumero')
            ?? data_get($payload, 'data.seuNumero');

        return is_string($nested) && $nested !== '' ? $nested : null;
    }

    /**
     * @param  array<string, mixed>  $detail
     */
    private function extrairPixCopia(array $detail): ?string
    {
        $v = data_get($detail, 'pix.pixCopiaECola')
            ?? data_get($detail, 'pixCopiaECola')
            ?? data_get($detail, 'pix.emv');

        return is_string($v) && $v !== '' ? $v : null;
    }

    /**
     * @param  array<string, mixed>  $detail
     */
    private function extrairPixQr(array $detail): ?string
    {
        $v = data_get($detail, 'pix.qrCode')
            ?? data_get($detail, 'qrCode')
            ?? data_get($detail, 'pix.imagemQrcode');

        return is_string($v) && $v !== '' ? $v : null;
    }

    private function cancelarCobrancaAberta(string $codigoSolicitacao): void
    {
        if ($codigoSolicitacao === '' || ! $this->client->habilitado()) {
            return;
        }
        try {
            $this->client->cancelarCobranca($codigoSolicitacao, 'SUBSTITUICAO');
        } catch (\Throwable $e) {
            // Best-effort: ainda limpamos localmente para liberar novo PIX.
            \Illuminate\Support\Facades\Log::warning('inter.billing.cancelar.excecao', [
                'ref' => $codigoSolicitacao,
                'msg' => $e->getMessage(),
            ]);
        }
    }

    private function calcularPixExpiraEm(CarbonInterface $emitidoEm, CarbonInterface $vencimentoDia): \Carbon\Carbon
    {
        $porTtl = $emitidoEm->copy()->addHours($this->ttlHoras());
        $porVencimento = $vencimentoDia->copy()->endOfDay();

        return $porTtl->lt($porVencimento) ? $porTtl : $porVencimento;
    }

    /**
     * Inter limita seuNumero (≤15). Tem de ser único por emissão: reusar o mesmo após
     * cancelar/invalidar PIX (ex.: mudança de preço) gera HTTP 400 "Dados inválidos".
     * A ref canônica da conta fica em customer_ref / mensagem.linha2.
     */
    private function seuNumeroCurto(int $userId): string
    {
        $id = str_pad((string) (max(0, $userId) % 100000), 5, '0', STR_PAD_LEFT);
        $ts = substr((string) time(), -8);

        return 'F'.$id.$ts; // 1+5+8 = 14
    }

    /**
     * Pagador com documento e endereço reais (EMP da conta) — CPF/CNPJ zero falha no Inter.
     *
     * @return array<string, mixed>
     */
    private function pagadorDaConta(User $user): array
    {
        $user->loadMissing('empresas');
        /** @var Empresa|null $emp */
        $emp = $user->empresas->sortBy('id')->first();

        $doc = preg_replace('/\D+/', '', (string) ($emp?->cnpj ?? '')) ?: '';
        $tipo = strlen($doc) === 14 ? 'JURIDICA' : 'FISICA';
        if ($doc === '' || (strlen($doc) !== 11 && strlen($doc) !== 14)) {
            throw new RuntimeException(
                'Para emitir o PIX da mensalidade, cadastre a empresa da conta com CNPJ válido (menu Empresas).'
            );
        }

        $cep = preg_replace('/\D+/', '', (string) ($emp->cep ?? '')) ?: '30130000';
        $uf = strtoupper(substr((string) ($emp->uf ?? 'MG'), 0, 2));

        return [
            'nome' => mb_substr((string) ($emp->razao_social ?: $user->name), 0, 100) ?: 'Conta FLEXORC',
            'cpfCnpj' => $doc,
            'tipoPessoa' => $tipo,
            'email' => (string) ($emp->email ?: $user->email),
            'endereco' => mb_substr(trim((string) ($emp->logradouro ?? 'Rua nao informada')), 0, 90) ?: 'Rua nao informada',
            'numero' => mb_substr(trim((string) ($emp->numero ?? 'S/N')), 0, 10) ?: 'S/N',
            'bairro' => mb_substr(trim((string) ($emp->bairro ?? 'Centro')), 0, 60) ?: 'Centro',
            'cidade' => mb_substr(trim((string) ($emp->municipio ?? 'Belo Horizonte')), 0, 60) ?: 'Belo Horizonte',
            'uf' => $uf !== '' ? $uf : 'MG',
            'cep' => strlen($cep) === 8 ? $cep : '30130000',
        ];
    }
}
