<?php

namespace App\Console\Commands;

use App\Models\ContaAtivacao;
use App\Models\User;
use App\Services\Plataforma\ConsolePlataformaService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

/**
 * Lab ≈ produção: cortesia acabou no cadastro atual; a 1ª mensalidade vence hoje.
 * Não apaga EMP, clientes nem orçamentos.
 */
class AbrirCobrancaPosCortesia extends Command
{
    protected $signature = 'plataforma:abrir-cobranca-pos-cortesia
                            {email? : E-mail do master (omitir = USR-00001)}
                            {--manter-pagamento : Só encerra a cortesia; não reabre cobrança demo}
                            {--forcar-pendente : Recoloca PENDENTE mesmo com assinatura ASAAS (só lab)}
                            {--dry-run : Inventaria; não altera nada}
                            {--force : Executa sem confirmação}';

    protected $description = 'Encerra a cortesia no cadastro atual e abre a 1ª mensalidade antecipada (hoje)';

    public function handle(ConsolePlataformaService $console): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $user = $email !== ''
            ? User::query()->where('email', $email)->first()
            : User::query()->where('codigo', 'USR-00001')->first();

        if ($user === null) {
            $this->error($email !== ''
                ? 'Usuário não encontrado.'
                : 'USR-00001 não encontrado. Informe o e-mail do master.');

            return self::FAILURE;
        }

        $conta = ContaAtivacao::query()->where('user_id', $user->id)->first();
        if ($conta === null) {
            $this->error('Esta conta não tem mensalidade FLEXORC (conta_ativacoes).');

            return self::FAILURE;
        }

        $empresas = $user->empresas()->count();
        $this->info("Conta {$user->codigo} · {$user->email}");
        $this->line('Billing: '.$conta->billing_status
            .($conta->pagamentoAutenticado() ? ' (autenticado)' : '')
            .($conta->cortesiaVigente()
                ? ' · cortesia até '.$conta->cortesia_ate->timezone(config('app.timezone'))->format('d/m/Y')
                : ($conta->cortesiaEncerrada()
                    ? ' · cortesia já encerrada em '.$conta->cortesia_ate->timezone(config('app.timezone'))->format('d/m/Y')
                    : ' · sem cortesia vigente')));
        $this->line("Empresas: {$empresas} (permanecem — PAR/ORC intactos)");

        if ($this->option('dry-run')) {
            $this->comment('Dry-run: nada foi alterado.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Encerrar cortesia e abrir cobrança hoje neste cadastro?', true)) {
            $this->warn('Cancelado.');

            return self::SUCCESS;
        }

        try {
            $out = $console->abrirCobrancaPosCortesia($conta, [
                'reabrir_demo' => ! $this->option('manter-pagamento'),
                'forcar_pendente' => (bool) $this->option('forcar-pendente'),
            ]);
        } catch (ValidationException $e) {
            foreach ($e->errors() as $msgs) {
                foreach ($msgs as $msg) {
                    $this->error($msg);
                }
            }

            return self::FAILURE;
        }

        $atual = $out['conta'];
        $this->newLine();
        $this->info('Pronto: cortesia encerrada · 1ª mensalidade antecipada hoje.');
        if ($out['reabriu_cobranca']) {
            $this->line('Cobrança reaberta (demo/lab). Customer ASAAS, se houver, foi preservado.');
        } elseif ($atual->pagamentoAutenticado()) {
            $this->warn('Mensalidade ainda autenticada — o login não vai exigir pagamento.');
            $this->comment('Lab: rode de novo com --forcar-pendente para reabrir o checkout.');
        }
        $this->line("Acesso liberado: ".($atual->acessoLiberado() ? 'sim' : 'não (pague para enviar proposta)'));
        $this->newLine();
        $this->line('1. Saia e entre em http://localhost:8043/login com este master.');
        $this->line('2. O app abre em /conta/mensalidade.');
        $this->line('3. Pagar agora → cartão no ASAAS (sandbox). Webhook: make ensaio-asaas');
        $this->comment('Empresas, clientes e orçamentos não foram apagados.');

        return self::SUCCESS;
    }
}
