<?php

namespace App\Services\Relatorio;

use App\Jobs\GerarRelatorioJob;
use App\Jobs\PlanejarRelatorioJob;
use App\Models\Empresa;
use App\Models\Relatorio;
use App\Models\RelatorioExecucao;
use App\Models\RelatorioPlanejamento;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class RelatorioService
{
    public function __construct(
        private readonly CodigoGenerator $codigoGenerator,
        private readonly AuditLogger $audit,
        private readonly RelatorioCatalogo $catalogo,
        private readonly RelatorioIaPlanner $planner,
        private readonly RelatorioProgramaCompiler $compiler,
        private readonly RelatorioProgramaValidator $validator,
        private readonly RelatorioPdfRenderer $pdf,
        private readonly RelatorioResumoLegivel $resumo,
    ) {}

    /** @return array<string, mixed> */
    public function catalogoMeta(User $user): array
    {
        return $this->catalogo->publicMeta($this->flagsFromUser($user));
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, array $filters = []): array
    {
        $q = Relatorio::query()
            ->with('criador:id,name,email')
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if (! empty($filters['status'])) {
            $q->where('status', $filters['status']);
        }
        if (! empty($filters['q'])) {
            $term = '%'.$filters['q'].'%';
            $q->where(function ($inner) use ($term) {
                $inner->where('codigo', 'like', $term)
                    ->orWhere('titulo', 'like', $term)
                    ->orWhere('prompt', 'like', $term);
            });
        }

        return $q->limit(200)->get()->map(fn (Relatorio $r) => $this->toOut($r))->all();
    }

    /** @return array<string, mixed> */
    public function show(Relatorio $relatorio): array
    {
        $relatorio->loadMissing('criador:id,name,email', 'provedorIa:id,nome,provedor,modelo');

        return $this->toOut($relatorio, detalhe: true);
    }

    /**
     * Inicia planejamento assíncrono (fila) — não bloqueia artisan serve.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function iniciarPlanejamento(Empresa $empresa, User $user, array $data): array
    {
        if (! config('erp.relatorio_ia_planejar_endpoint', true)) {
            throw ValidationException::withMessages([
                'planejar' => 'Endpoint de planejamento desativado.',
            ]);
        }

        $row = RelatorioPlanejamento::query()->create([
            'empresa_id' => $empresa->id,
            'usuario_id' => $user->id,
            'prompt' => trim((string) $data['prompt']),
            'titulo' => filled($data['titulo'] ?? null) ? trim((string) $data['titulo']) : null,
            'orientacao' => $data['orientacao'],
            'status' => RelatorioPlanejamento::STATUS_PENDENTE,
            'contexto_flags' => $this->flagsFromUser($user),
        ]);

        PlanejarRelatorioJob::dispatch($row->id);

        return $this->planejamentoOut($row);
    }

    /** @return array<string, mixed> */
    public function showPlanejamento(RelatorioPlanejamento $p): array
    {
        $p->loadMissing('provedorIa:id,nome,provedor,modelo');

        return $this->planejamentoOut($p);
    }

    /**
     * Executado pelo PlanejarRelatorioJob.
     */
    public function processarPlanejamento(RelatorioPlanejamento $p): void
    {
        $p->refresh();
        if ($p->status === RelatorioPlanejamento::STATUS_PRONTO) {
            return;
        }

        $p->update([
            'status' => RelatorioPlanejamento::STATUS_PROCESSANDO,
            'erro_mensagem' => null,
        ]);

        try {
            $empresa = Empresa::query()->findOrFail($p->empresa_id);
            $flags = $p->contexto_flags ?? [];

            $planejado = $this->planner->planejar(
                $p->prompt,
                $flags,
                $p->titulo,
                [
                    'empresa' => $empresa,
                    'usuario_id' => $p->usuario_id,
                    'planejamento_id' => $p->id,
                ]
            );

            $preview = $this->compiler->preview($empresa->id, $planejado['programa'], $flags, 20);
            $avisos = $planejado['avisos'] ?? [];
            $resumo = $this->resumo->resumir(
                $preview['programa'],
                $flags,
                $avisos,
                $preview['total_estimado']
            );

            $p->update([
                'status' => RelatorioPlanejamento::STATUS_PRONTO,
                'programa_json' => $preview['programa'],
                'resumo_legivel' => $resumo,
                'amostra_json' => $preview['amostra'],
                'total_estimado' => $preview['total_estimado'],
                'avisos_json' => $avisos,
                'provedor_ia_id' => $planejado['provedor_id'],
                'tentativas' => $planejado['tentativas'] ?? 1,
                'erro_mensagem' => null,
            ]);
        } catch (\Throwable $e) {
            $p->update([
                'status' => RelatorioPlanejamento::STATUS_ERRO,
                'erro_mensagem' => mb_substr($e->getMessage(), 0, 2000),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, User $user, array $data): array
    {
        $flags = $this->flagsFromUser($user);
        $specPronta = null;

        if (isset($data['spec']) && is_array($data['spec'])) {
            try {
                $specPronta = $this->validator->validate($data['spec'], $flags);
            } catch (InvalidArgumentException $e) {
                throw ValidationException::withMessages([
                    'spec' => $e->getMessage(),
                ]);
            }
        }

        $relatorio = DB::transaction(function () use ($empresa, $user, $data, $flags, $specPronta) {
            $ano = (int) now()->year;
            $prefix = 'REL-'.$ano;
            $codigo = $this->codigoGenerator->nextCode($empresa->id, $prefix, 5);
            $parts = explode('-', $codigo);
            $numero = (int) end($parts);

            $titulo = isset($data['titulo']) ? trim((string) $data['titulo']) : null;
            if ($titulo === '') {
                $titulo = null;
            }
            if ($titulo === null && $specPronta) {
                $titulo = $specPronta['titulo'] ?? null;
            }

            $row = Relatorio::query()->create([
                'empresa_id' => $empresa->id,
                'ano' => $ano,
                'numero' => $numero,
                'codigo' => $codigo,
                'titulo' => $titulo,
                'prompt' => trim((string) $data['prompt']),
                'orientacao' => $data['orientacao'],
                'status' => Relatorio::STATUS_PENDENTE,
                'programa_json' => $specPronta,
                'contexto_flags' => $flags,
                'criado_por' => $user->id,
            ]);

            $this->audit->log('CRIAR', 'Relatorio', $row->id, null, [
                'codigo' => $row->codigo,
                'orientacao' => $row->orientacao,
                'com_spec' => $specPronta !== null,
            ]);

            return $row;
        });

        GerarRelatorioJob::dispatch($relatorio->id);

        return $this->show($relatorio);
    }

    /**
     * Reprocessar mantendo a spec (sem chamar IA).
     *
     * @return array<string, mixed>
     */
    public function reprocessar(Relatorio $relatorio, ?User $user = null): array
    {
        if (! $relatorio->isReprocessavel()) {
            throw ValidationException::withMessages([
                'status' => 'Somente relatórios CONCLUIDO ou ERRO podem ser reprocessados.',
            ]);
        }

        if (empty($relatorio->programa_json)) {
            throw ValidationException::withMessages([
                'programa' => 'Este relatório não tem programa aprovado. Use "Replanejar com IA".',
            ]);
        }

        if ($relatorio->arquivo_path) {
            Storage::disk('local')->delete($relatorio->arquivo_path);
        }

        $flags = $user ? $this->flagsFromUser($user) : ($relatorio->contexto_flags ?? []);

        // Revalida a spec com as permissões atuais (SoD).
        try {
            $this->validator->validate($relatorio->programa_json, $flags);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'spec' => 'Programa incompatível com suas permissões atuais: '.$e->getMessage(),
            ]);
        }

        $de = ['status' => $relatorio->status];
        $relatorio->update([
            'status' => Relatorio::STATUS_PENDENTE,
            'erro_mensagem' => null,
            'arquivo_path' => null,
            'contexto_flags' => $flags,
            // mantém programa_json e provedor_ia_id
        ]);

        $this->audit->log('REPROCESSAR', 'Relatorio', $relatorio->id, $de, [
            'status' => Relatorio::STATUS_PENDENTE,
            'manter_spec' => true,
        ]);

        GerarRelatorioJob::dispatch($relatorio->id);

        return $this->show($relatorio->fresh());
    }

    /**
     * Replanejar com IA (comportamento histórico do reprocessar).
     *
     * @return array<string, mixed>
     */
    public function replanejar(Relatorio $relatorio, ?User $user = null): array
    {
        if (! $relatorio->isReprocessavel()) {
            throw ValidationException::withMessages([
                'status' => 'Somente relatórios CONCLUIDO ou ERRO podem ser replanejados.',
            ]);
        }

        if ($relatorio->arquivo_path) {
            Storage::disk('local')->delete($relatorio->arquivo_path);
        }

        $flags = $user ? $this->flagsFromUser($user) : ($relatorio->contexto_flags ?? []);

        $de = ['status' => $relatorio->status];
        $relatorio->update([
            'status' => Relatorio::STATUS_PENDENTE,
            'programa_json' => null,
            'erro_mensagem' => null,
            'arquivo_path' => null,
            'provedor_ia_id' => null,
            'contexto_flags' => $flags,
        ]);

        $this->audit->log('REPLANEJAR', 'Relatorio', $relatorio->id, $de, [
            'status' => Relatorio::STATUS_PENDENTE,
        ]);

        GerarRelatorioJob::dispatch($relatorio->id);

        return $this->show($relatorio->fresh());
    }

    public function delete(Relatorio $relatorio): void
    {
        if ($relatorio->arquivo_path) {
            Storage::disk('local')->delete($relatorio->arquivo_path);
        }

        $de = $this->toOut($relatorio);
        $relatorio->update(['status' => Relatorio::STATUS_CANCELADO]);
        $relatorio->delete();

        $this->audit->log('EXCLUIR', 'Relatorio', $relatorio->id, $de, null);
    }

    public function absolutePath(Relatorio $relatorio): string
    {
        if (! $relatorio->isDownloadable()) {
            abort(404, 'PDF ainda não disponível.');
        }

        $full = Storage::disk('local')->path($relatorio->arquivo_path);
        if (! is_readable($full)) {
            abort(404, 'Arquivo do relatório não encontrado.');
        }

        return $full;
    }

    /**
     * Pipeline: (IA ou spec pronta) → dados → PDF.
     */
    public function processar(Relatorio $relatorio): void
    {
        $relatorio->refresh();
        if ($relatorio->status === Relatorio::STATUS_CANCELADO || $relatorio->trashed()) {
            return;
        }

        $relatorio->update([
            'status' => Relatorio::STATUS_PROCESSANDO,
            'erro_mensagem' => null,
        ]);

        $startedAt = hrtime(true);
        $sucesso = false;
        $erroMsg = null;
        $specLog = null;

        try {
            $empresa = Empresa::query()->findOrFail($relatorio->empresa_id);
            $flags = $relatorio->contexto_flags ?? [];
            $provedorId = $relatorio->provedor_ia_id;

            if (! empty($relatorio->programa_json) && is_array($relatorio->programa_json)) {
                // Spec já aprovada — pula planner (determinismo + economia de token).
                $programa = $this->validator->validate($relatorio->programa_json, $flags);
            } else {
                $planejado = $this->planner->planejar(
                    $relatorio->prompt,
                    $flags,
                    $relatorio->titulo,
                    [
                        'empresa' => $empresa,
                        'usuario_id' => $relatorio->criado_por,
                        'relatorio_id' => $relatorio->id,
                    ]
                );
                $programa = $planejado['programa'];
                $provedorId = $planejado['provedor_id'];
            }

            $specLog = $programa;
            $dataset = $this->compiler->execute($empresa->id, $programa, $flags);
            $path = $this->pdf->renderAndStore($relatorio, $empresa, $dataset);

            $relatorio->update([
                'status' => Relatorio::STATUS_CONCLUIDO,
                'titulo' => $programa['titulo'],
                'programa_json' => $programa,
                'arquivo_path' => $path,
                'provedor_ia_id' => $provedorId,
                'erro_mensagem' => null,
            ]);

            $sucesso = true;

            $this->audit->log('CONCLUIDO', 'Relatorio', $relatorio->id, null, [
                'codigo' => $relatorio->codigo,
                'fonte' => $programa['fonte'],
                'linhas' => $dataset['total_linhas'],
                'total_disponivel' => $dataset['total_disponivel'] ?? null,
                'truncado' => $dataset['truncado'] ?? false,
                'celulas' => $dataset['total_linhas'] * max(1, count($programa['colunas'] ?? [])),
            ]);
        } catch (\Throwable $e) {
            $erroMsg = mb_substr($e->getMessage(), 0, 2000);
            $relatorio->update([
                'status' => Relatorio::STATUS_ERRO,
                'erro_mensagem' => $erroMsg,
            ]);

            $this->audit->log('ERRO', 'Relatorio', $relatorio->id, null, [
                'mensagem' => mb_substr($e->getMessage(), 0, 500),
            ]);
        } finally {
            // M2 — pico real do job (substitui estimativa do doc de impacto).
            $this->registrarPicoMemoriaRender(
                $relatorio,
                $sucesso,
                $erroMsg,
                $specLog,
                (int) round((hrtime(true) - $startedAt) / 1_000_000)
            );
        }
    }

    /**
     * Grava memory_get_peak_usage(true) em relatorio_execucoes (etapa render).
     * Nunca lança — observabilidade não pode derrubar o relatório.
     *
     * @param  array<string, mixed>|null  $spec
     */
    private function registrarPicoMemoriaRender(
        Relatorio $relatorio,
        bool $sucesso,
        ?string $erro,
        ?array $spec,
        int $latenciaMs,
    ): void {
        try {
            RelatorioExecucao::query()->create([
                'relatorio_id' => $relatorio->id,
                'empresa_id' => $relatorio->empresa_id,
                'usuario_id' => $relatorio->criado_por,
                'etapa' => 'render',
                'provedor_ia_id' => $relatorio->provedor_ia_id,
                'tentativa' => 1,
                'latencia_ms' => max(0, $latenciaMs),
                'sucesso' => $sucesso,
                'erro' => $erro !== null ? mb_substr($erro, 0, 1000) : null,
                'spec_resultante' => $spec,
                'memory_peak_mb' => (int) max(1, (int) ceil(memory_get_peak_usage(true) / 1048576)),
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // auditoria nunca derruba o pipeline
        }
    }

    /** @return array{incluir_credito: bool} */
    public function flagsFromUser(User $user): array
    {
        return [
            'incluir_credito' => $user->can('credito.escrever') || $user->can('parceiro.bancario'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function planejamentoOut(RelatorioPlanejamento $p): array
    {
        return [
            'id' => $p->id,
            'status' => $p->status,
            'prompt' => $p->prompt,
            'titulo' => $p->titulo,
            'orientacao' => $p->orientacao,
            'spec' => $p->programa_json,
            'resumo_legivel' => $p->resumo_legivel,
            'amostra' => $p->amostra_json,
            'total_estimado' => $p->total_estimado,
            'avisos' => $p->avisos_json ?? [],
            'tentativas' => $p->tentativas,
            'erro_mensagem' => $p->erro_mensagem,
            'provedor_ia' => $p->relationLoaded('provedorIa') && $p->provedorIa ? [
                'id' => $p->provedorIa->id,
                'nome' => $p->provedorIa->nome,
                'provedor' => $p->provedorIa->provedor,
                'modelo' => $p->provedorIa->modelo,
            ] : null,
            'created_at' => optional($p->created_at)?->toIso8601String(),
            'updated_at' => optional($p->updated_at)?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function toOut(Relatorio $r, bool $detalhe = false): array
    {
        $out = [
            'id' => $r->id,
            'codigo' => $r->codigo,
            'titulo' => $r->titulo,
            'prompt' => $r->prompt,
            'orientacao' => $r->orientacao,
            'status' => $r->status,
            'erro_mensagem' => $r->erro_mensagem,
            'downloadable' => $r->isDownloadable(),
            'arquivo_expirado' => $r->status === Relatorio::STATUS_CONCLUIDO && empty($r->arquivo_path),
            'reprocessavel' => $r->isReprocessavel() && ! empty($r->programa_json),
            'replanejavel' => $r->isReprocessavel(),
            'criado_por' => $r->criador ? [
                'id' => $r->criador->id,
                'name' => $r->criador->name,
            ] : null,
            'created_at' => optional($r->created_at)?->toIso8601String(),
            'updated_at' => optional($r->updated_at)?->toIso8601String(),
        ];

        if ($detalhe) {
            $out['programa'] = $r->programa_json;
            $out['contexto_flags'] = $r->contexto_flags;
            $out['provedor_ia'] = $r->provedorIa ? [
                'id' => $r->provedorIa->id,
                'nome' => $r->provedorIa->nome,
                'provedor' => $r->provedorIa->provedor,
                'modelo' => $r->provedorIa->modelo,
            ] : null;
            if (is_array($r->programa_json)) {
                $out['resumo_legivel'] = $this->resumo->resumir(
                    $r->programa_json,
                    $r->contexto_flags ?? []
                );
            }
        }

        return $out;
    }
}
