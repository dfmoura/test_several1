<?php

namespace App\Services\Compras;

use App\Jobs\SyncNfseEmpresaJob;
use App\Models\Empresa;
use App\Models\NfseSyncEstado;
use App\Models\NfseTomada;
use App\Models\Parceiro;
use App\Services\Cadastros\EmpresaCertificadoA1Materializer;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Caixa local de NFS-e tomadas. A lista não fala com o ADN.
 */
final class NfseCaixaService
{
    public function __construct(
        private readonly NfseAdnLote $lote,
        private readonly NfseTomadaXmlResumo $resumo,
        private readonly EmpresaCertificadoA1Service $a1,
        private readonly EmpresaCertificadoA1Materializer $materializer,
    ) {}

    /**
     * @return array{data: list<array<string, mixed>>, meta: array<string, mixed>}
     */
    public function listar(Empresa $empresa, ?string $q, ?string $situacao, ?int $ano): array
    {
        $query = NfseTomada::query()->where('empresa_id', $empresa->id);
        if ($situacao !== null && $situacao !== '') {
            $query->where('situacao', $situacao);
        }
        if ($ano !== null) {
            $query->where(function ($w) use ($ano) {
                $w->whereYear('data_emissao', $ano)->orWhereNull('data_emissao');
            });
        }
        if ($q !== null && trim($q) !== '') {
            $like = '%'.trim($q).'%';
            $query->where(function ($w) use ($like) {
                $w->where('chave', 'like', $like)
                    ->orWhere('emit_nome', 'like', $like)
                    ->orWhere('emit_cnpj', 'like', $like)
                    ->orWhere('numero', 'like', $like);
            });
        }

        $rows = $query->orderByDesc('data_emissao')->orderByDesc('id')->limit(200)->get();

        return [
            'data' => $rows->map(fn (NfseTomada $n) => $this->linha($n))->all(),
            'meta' => ['total' => $rows->count()],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Empresa $empresa, NfseTomada $nota): array
    {
        $nota->load(['parceiro', 'titulos']);
        $linha = $this->linha($nota);
        $linha['xml_disponivel'] = is_string($nota->xml) && $nota->xml !== '';
        $linha['parceiro_sugerido'] = $this->sugerirParceiro($empresa, $nota);
        $linha['titulos'] = $nota->titulos->map(fn ($t) => [
            'id' => $t->id,
            'codigo' => $t->codigo,
            'vencimento' => optional($t->vencimento)->toDateString(),
            'valor' => (string) $t->valor,
            'saldo' => (string) $t->saldo,
            'status' => $t->status,
            'parcela' => $t->parcela,
        ])->all();
        $linha['naturezas'] = $this->naturezasElegiveis();

        return $linha;
    }

    /**
     * @return array<string, mixed>
     */
    public function syncEstado(Empresa $empresa): array
    {
        $row = NfseSyncEstado::query()->firstOrCreate(
            ['empresa_id' => $empresa->id],
            ['ultimo_nsu' => '0', 'sync_status' => 'IDLE']
        );

        return [
            'sync_status' => $row->sync_status,
            'sync_mensagem' => $row->sync_mensagem,
            'ultimo_nsu' => $row->ultimo_nsu,
            'max_nsu' => $row->max_nsu,
            'ultima_sync_em' => optional($row->ultima_sync_em)?->toIso8601String(),
            'pode_sincronizar' => $row->sync_status !== 'RUNNING',
        ];
    }

    public function enfileirar(Empresa $empresa): void
    {
        $estado = NfseSyncEstado::query()->firstOrCreate(
            ['empresa_id' => $empresa->id],
            ['ultimo_nsu' => '0', 'sync_status' => 'IDLE']
        );
        if ($estado->sync_status === 'RUNNING') {
            return;
        }
        $estado->sync_status = 'RUNNING';
        $estado->sync_mensagem = 'Sincronização na fila.';
        $estado->save();
        SyncNfseEmpresaJob::dispatch($empresa->id);
    }

    public function executar(int $empresaId): void
    {
        $empresa = Empresa::query()->find($empresaId);
        if ($empresa === null) {
            return;
        }
        $estado = NfseSyncEstado::query()->firstOrCreate(
            ['empresa_id' => $empresa->id],
            ['ultimo_nsu' => '0', 'sync_status' => 'IDLE']
        );

        try {
            $driver = strtolower(trim((string) config('erp.nfse.caixa_driver', 'off')));
            if ($driver === 'off' || $driver === '') {
                if ($this->ensaioLocal()) {
                    $this->ingerirFake($empresa, $estado, true);

                    return;
                }
                $this->encerrar($estado, 'IDLE', 'Canal ADN desligado. A caixa continua consultável.');

                return;
            }
            if ($driver === 'fake') {
                $this->ingerirFake($empresa, $estado, false);

                return;
            }
            if ($driver !== 'adn') {
                $this->encerrar($estado, 'IDLE', 'Canal de caixa NFS-e não reconhecido.');

                return;
            }
            $this->ingerirAdn($empresa, $estado);
        } catch (\Throwable $e) {
            $this->encerrar($estado, 'ERRO', mb_substr($e->getMessage(), 0, 500));
        }
    }

    public function semInteresse(Empresa $empresa, NfseTomada $nota): NfseTomada
    {
        $this->assertEmpresa($empresa, $nota);
        if ($nota->situacao === NfseTomada::SITUACAO_VINCULADA) {
            throw new RuntimeException('Nota já vinculada a contas a pagar.');
        }
        $nota->situacao = NfseTomada::SITUACAO_SEM_INTERESSE;
        $nota->save();

        return $nota;
    }

    private function ingerirFake(Empresa $empresa, NfseSyncEstado $estado, bool $ensaioLocal): void
    {
        $ultimo = (int) $estado->ultimo_nsu;
        if ($ultimo >= 1 || NfseTomada::query()->where('empresa_id', $empresa->id)->exists()) {
            $this->encerrar($estado, 'IDLE', 'Nenhum documento novo no ensaio.');

            return;
        }
        NfseTomada::query()->create([
            'empresa_id' => $empresa->id,
            'nsu' => '1',
            'tipo_documento' => 'NFSE',
            'chave' => str_repeat('1', 50),
            'numero' => '1',
            'data_emissao' => now()->toDateString(),
            'emit_cnpj' => '00000000000191',
            'emit_nome' => 'Prestador de ensaio',
            'valor_total' => '150.00',
            'situacao' => NfseTomada::SITUACAO_CAIXA,
        ]);
        $estado->ultimo_nsu = '1';
        $estado->max_nsu = '1';
        $this->encerrar(
            $estado,
            'IDLE',
            $ensaioLocal
                ? 'Ambiente local: 1 NFS-e de ensaio na caixa. Sem valor fiscal.'
                : 'Ensaio: 1 NFS-e na caixa.'
        );
    }

    private function ensaioLocal(): bool
    {
        $stage = strtolower(trim((string) config('erp.stage', 'local')));

        return in_array($stage, ['local', 'dev', 'development'], true);
    }

    private function ingerirAdn(Empresa $empresa, NfseSyncEstado $estado): void
    {
        $stage = strtolower(trim((string) config('erp.stage', 'local')));
        if (! in_array($stage, config('erp.nfse.stages_permitidos', ['homolog', 'production']), true)) {
            $this->encerrar($estado, 'IDLE', 'ADN de NFS-e só em homologação ou produção.');

            return;
        }
        if (! $this->a1->aptoParaOperar($empresa)) {
            $this->encerrar($estado, 'ERRO', 'Certificado A1 desta empresa não está apto para o ADN.');

            return;
        }

        $material = null;
        try {
            $material = $this->materializer->materializar($empresa);
            $prod = in_array($stage, ['production', 'prod', 'producao'], true);
            $base = rtrim((string) ($prod ? config('erp.nfse.adn_production') : config('erp.nfse.adn_homolog')), '/');
            $cnpj = preg_replace('/\D/', '', (string) $empresa->cnpj) ?: '';
            $nsu = $estado->ultimo_nsu !== '' ? $estado->ultimo_nsu : '0';
            $url = $base.'/contribuintes/DFe/'.$nsu.'?lote=true&cnpjConsulta='.$cnpj;
            $raw = $this->get($url, ['path' => $material['path'], 'senha' => $material['senha']]);
            $json = json_decode($raw, true);
            if (! is_array($json)) {
                throw new RuntimeException('ADN devolveu um corpo que não é JSON.');
            }
            $lote = $this->lote->interpretar($json, $nsu);
            DB::transaction(function () use ($empresa, $lote) {
                foreach ($lote['documentos'] as $doc) {
                    $this->upsert($empresa, $doc);
                }
            });
            if ($lote['max_nsu'] !== null) {
                $estado->ultimo_nsu = $lote['max_nsu'];
                $estado->max_nsu = $lote['max_nsu'];
            }
            $qtd = count($lote['documentos']);
            $this->encerrar($estado, 'IDLE', $qtd === 0 ? 'Nenhum documento novo no ADN.' : $qtd.' documento(s) na caixa.');
        } finally {
            $this->materializer->liberar($material);
        }
    }

    /**
     * @param  array{nsu: string, tipo: string, chave: string, xml: string}  $doc
     */
    private function upsert(Empresa $empresa, array $doc): void
    {
        $resumo = $this->resumo->ler($doc['xml']);
        $tipo = strtoupper($doc['tipo']) === 'EVENTO' ? 'EVENTO' : 'NFSE';
        $chave = $doc['chave'] !== '' ? mb_substr($doc['chave'], 0, 50) : null;
        $existente = NfseTomada::query()
            ->where('empresa_id', $empresa->id)
            ->where('nsu', $doc['nsu'])
            ->first();
        if ($existente !== null) {
            return;
        }
        NfseTomada::query()->create([
            'empresa_id' => $empresa->id,
            'nsu' => $doc['nsu'],
            'tipo_documento' => $tipo,
            'chave' => $chave,
            'numero' => $resumo['numero'],
            'data_emissao' => $resumo['data_emissao'],
            'emit_cnpj' => $resumo['emit_cnpj'],
            'emit_nome' => $resumo['emit_nome'],
            'valor_total' => $resumo['valor_total'],
            'situacao' => $tipo === 'EVENTO' ? NfseTomada::SITUACAO_EVENTO : NfseTomada::SITUACAO_CAIXA,
            'xml' => $doc['xml'],
        ]);
    }

    /**
     * @param  array{path: string, senha: string}  $cert
     */
    private function get(string $url, array $cert): string
    {
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Falha ao iniciar HTTP para o ADN.');
        }
        $timeout = max(5, (int) ceil((float) config('erp.nfse.timeout_sec', 60)));
        curl_setopt_array($ch, [
            CURLOPT_HTTPGET => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
            CURLOPT_SSLCERT => $cert['path'],
            CURLOPT_SSLCERTPASSWD => $cert['senha'],
            CURLOPT_SSLCERTTYPE => 'P12',
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => min(20, $timeout),
        ]);
        $resp = curl_exec($ch);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($errno !== 0 || ! is_string($resp)) {
            throw new RuntimeException('Falha de rede no ADN: '.($err !== '' ? $err : 'resposta vazia'));
        }
        if ($http >= 400) {
            throw new RuntimeException('ADN HTTP '.$http.'.');
        }

        return $resp;
    }

    private function encerrar(NfseSyncEstado $estado, string $status, string $mensagem): void
    {
        $estado->sync_status = $status;
        $estado->sync_mensagem = mb_substr($mensagem, 0, 500);
        $estado->ultima_sync_em = now();
        $estado->save();
    }

    /**
     * @return array<string, mixed>
     */
    private function linha(NfseTomada $n): array
    {
        return [
            'id' => $n->id,
            'nsu' => $n->nsu,
            'tipo_documento' => $n->tipo_documento,
            'chave' => $n->chave,
            'numero' => $n->numero,
            'data_emissao' => optional($n->data_emissao)?->toDateString(),
            'emit_cnpj' => $n->emit_cnpj,
            'emit_nome' => $n->emit_nome,
            'valor_total' => $n->valor_total !== null ? (string) $n->valor_total : null,
            'situacao' => $n->situacao,
            'parceiro_id' => $n->parceiro_id,
            'vinculado_em' => optional($n->vinculado_em)?->toIso8601String(),
        ];
    }

    /**
     * @return array{id: int, codigo: string, razao_social: string}|null
     */
    private function sugerirParceiro(Empresa $empresa, NfseTomada $nota): ?array
    {
        $cnpj = preg_replace('/\D/', '', (string) $nota->emit_cnpj) ?: '';
        if (strlen($cnpj) !== 14) {
            return null;
        }
        $par = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('cnpj_cpf', $cnpj)
            ->first();
        if ($par === null) {
            return null;
        }

        return [
            'id' => $par->id,
            'codigo' => $par->codigo,
            'razao_social' => $par->razao_social,
        ];
    }

    /**
     * @return list<array{id: int, codigo: string, nome: string, grupo: int}>
     */
    private function naturezasElegiveis(): array
    {
        return \App\Models\NaturezaGerencial::query()
            ->where('aceita_lancamento', true)
            ->where('ativo', true)
            ->whereIn('grupo', [2, 3])
            ->whereNotIn('codigo', ['3.05.06', '3.01.05', '5.06'])
            ->orderBy('codigo')
            ->get(['id', 'codigo', 'nome', 'grupo'])
            ->map(fn ($n) => [
                'id' => $n->id,
                'codigo' => $n->codigo,
                'nome' => $n->nome,
                'grupo' => (int) $n->grupo,
            ])
            ->all();
    }

    private function assertEmpresa(Empresa $empresa, NfseTomada $nota): void
    {
        if ($nota->empresa_id !== $empresa->id) {
            abort(404);
        }
    }
}
