<?php

namespace App\Console\Commands;

use App\Models\Empresa;
use App\Models\NfeSerieControle;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use App\Services\Fiscal\FiscalSaidaDefaults;
use App\Services\Fiscal\Sefaz\NfeAutorizacaoService;
use App\Services\Fiscal\Sefaz\NfeNumeracaoService;
use App\Services\Fiscal\Sefaz\SefazNfeUrlResolver;
use Illuminate\Console\Command;

/**
 * Ops piloto NF-e SEFAZ: status da EMP + seed do último número emitido.
 */
class NfeSerieOpsCommand extends Command
{
    protected $signature = 'nfe:serie
                            {acao=status : status|seed}
                            {empresa? : Código EMP-… ou id}
                            {--ultimo= : Último nNF já usado fora do ERP (seed)}
                            {--serie=1 : Série NF-e}';

    protected $description = 'Status / seed da numeração NF-e e prontidão A1+SEFAZ (piloto)';

    public function handle(
        NfeNumeracaoService $numeracao,
        EmpresaCertificadoA1Service $a1,
        NfeAutorizacaoService $nfe,
        SefazNfeUrlResolver $urls,
    ): int {
        $acao = strtolower((string) $this->argument('acao'));
        if (! in_array($acao, ['status', 'seed'], true)) {
            $this->error('Ação inválida. Use: status | seed');

            return self::FAILURE;
        }

        $empresa = $this->resolverEmpresa();
        if ($empresa === null) {
            return self::FAILURE;
        }

        $serie = max(1, (int) $this->option('serie') ?: FiscalSaidaDefaults::SERIE_NFE);

        if ($acao === 'seed') {
            $ultimo = $this->option('ultimo');
            if ($ultimo === null || $ultimo === '' || ! ctype_digit((string) $ultimo)) {
                $this->error('Informe --ultimo=N (último número já autorizado neste CNPJ/série).');

                return self::FAILURE;
            }
            $numeracao->seedUltimo($empresa, (int) $ultimo, $serie);
            $this->info("Seed OK: {$empresa->codigo} série {$serie} → ultimo_numero={$ultimo}");
        }

        $row = NfeSerieControle::query()
            ->where('empresa_id', $empresa->id)
            ->where('serie', $serie)
            ->first();

        $stage = (string) config('erp.stage');
        $driver = (string) config('erp.nfe.driver');
        $a1Apto = $a1->aptoParaOperar($empresa);
        $sefazDisp = $nfe->sefazDisponivel();
        $uf = strtoupper(trim((string) $empresa->uf));
        $autorKey = $uf !== '' ? $urls->autorizadorKey($uf) : '—';
        $tpAmb = $nfe->tpAmb();
        $urlOk = true;
        $urlMsg = '';
        try {
            if ($uf !== '') {
                $u = $urls->urls($uf, $tpAmb);
                $urlMsg = $u['autorizacao'];
            }
        } catch (\Throwable $e) {
            $urlOk = false;
            $urlMsg = $e->getMessage();
        }

        $proximo = $row ? ((int) $row->ultimo_numero + 1) : 1;
        $pronto = $sefazDisp && $a1Apto && $urlOk && $driver === 'sefaz';

        $this->table(
            ['Campo', 'Valor'],
            [
                ['empresa', $empresa->codigo.' · '.$empresa->razao_social],
                ['cnpj', preg_replace('/\D/', '', (string) $empresa->cnpj)],
                ['uf', $uf ?: '—'],
                ['autorizador', $autorKey],
                ['ERP_STAGE', $stage],
                ['NFE_DRIVER', $driver],
                ['tpAmb', (string) $tpAmb.' ('.($tpAmb === 1 ? 'produção' : 'homologação').')'],
                ['A1 apto', $a1Apto ? 'sim' : 'NÃO'],
                ['SEFAZ disponível (stage)', $sefazDisp ? 'sim' : 'NÃO'],
                ['URL autorizacao', $urlOk ? $urlMsg : 'FALHA: '.$urlMsg],
                ['série', (string) $serie],
                ['ultimo_numero', $row ? (string) $row->ultimo_numero : '(ainda sem linha — 1º emit = 1)'],
                ['próximo nNF', (string) $proximo],
                ['pronto para emitir', $pronto ? 'SIM' : 'não — corrija A1/stage/driver/URL'],
            ]
        );

        if (! $pronto) {
            $this->warn('Piloto: Empilhe A1 apto + ERP_STAGE=homolog|production + NFE_DRIVER=sefaz + UF mapeada.');
            if ($row === null) {
                $this->line('Se o CNPJ já emitiu fora do ERP: php artisan nfe:serie seed EMP-00001 --ultimo=NNNN');
            }

            return self::FAILURE;
        }

        $this->info('Pronto para testar emissão/cancel/CC-e na SEFAZ.');

        return self::SUCCESS;
    }

    private function resolverEmpresa(): ?Empresa
    {
        $raw = $this->argument('empresa');
        if ($raw === null || $raw === '') {
            $codigo = (string) config('erp.default_empresa_codigo', 'EMP-00001');
            $emp = Empresa::query()->where('codigo', $codigo)->first();
            if ($emp === null) {
                $this->error("Empresa padrão {$codigo} não encontrada. Passe o código/id.");
            }

            return $emp;
        }

        $q = Empresa::query();
        if (ctype_digit((string) $raw)) {
            $emp = $q->where('id', (int) $raw)->first();
        } else {
            $emp = $q->where('codigo', (string) $raw)->first();
        }
        if ($emp === null) {
            $this->error('Empresa não encontrada: '.$raw);
        }

        return $emp;
    }
}
