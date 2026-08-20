<?php

namespace App\Services\Cadastros;

use App\Models\BemPatrimonial;
use App\Models\CessaoBem;
use App\Models\Empresa;
use App\Models\Parceiro;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Comodato / cessão de BEM ao cliente — sem NF (ADR_OPERACOES_SAIDA).
 */
class CessaoBemService
{
    public function __construct(private readonly CodigoGenerator $codigos) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?int $bemId = null, ?string $status = null): array
    {
        $q = CessaoBem::query()
            ->with([
                'bem:id,codigo,descricao,status,categoria',
                'parceiro:id,codigo,razao_social',
                ...CessaoBem::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if ($bemId) {
            $q->where('bem_id', $bemId);
        }
        if ($status) {
            $q->where('status', $status);
        }

        return $q->limit(200)->get()->map(fn (CessaoBem $c) => $this->toOut($c))->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $parceiro = $this->parceiroDaEmpresa($empresa, (int) $data['parceiro_id']);
        $tipo = strtoupper(trim((string) ($data['tipo'] ?? CessaoBem::TIPO_COMODATO)));
        if (! in_array($tipo, CessaoBem::TIPOS, true)) {
            throw ValidationException::withMessages(['tipo' => ['Tipo deve ser COMODATO ou LOCACAO.']]);
        }

        $cessao = DB::transaction(function () use ($empresa, $parceiro, $data, $tipo) {
            $bem = BemPatrimonial::query()
                ->where('empresa_id', $empresa->id)
                ->whereKey((int) $data['bem_id'])
                ->lockForUpdate()
                ->first();
            if ($bem === null) {
                throw ValidationException::withMessages(['bem_id' => ['Bem inválido para a empresa.']]);
            }
            $this->assertBemCedivel($bem);

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'CES-'.$ano, 5);

            $row = CessaoBem::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'bem_id' => $bem->id,
                'parceiro_id' => $parceiro->id,
                'tipo' => $tipo,
                'status' => CessaoBem::STATUS_VIGENTE,
                'iniciado_em' => $data['iniciado_em'] ?? now()->toDateString(),
                'encerra_previsto_em' => $data['encerra_previsto_em'] ?? null,
                'valor_mensal' => $tipo === CessaoBem::TIPO_LOCACAO ? ($data['valor_mensal'] ?? null) : null,
                'documento_fiscal' => CessaoBem::DOC_NENHUM,
                'observacao' => $data['observacao'] ?? null,
            ]);

            $bem->status = BemPatrimonial::STATUS_CEDIDO;
            $bem->save();

            return $row;
        });

        return $this->show($cessao->fresh(['bem', 'parceiro']));
    }

    /**
     * @return array<string, mixed>
     */
    public function show(CessaoBem $cessao): array
    {
        $cessao->loadMissing([
            'bem:id,codigo,descricao,status,categoria,marca,modelo',
            'parceiro:id,codigo,razao_social',
            ...CessaoBem::userStampWith(),
        ]);

        return $this->toOut($cessao);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function encerrar(CessaoBem $cessao, array $data): array
    {
        if ($cessao->status !== CessaoBem::STATUS_VIGENTE) {
            return $this->show($cessao);
        }

        $motivo = trim((string) ($data['motivo'] ?? ''));
        if (mb_strlen($motivo) < 3) {
            throw ValidationException::withMessages(['motivo' => ['Informe o motivo do encerramento (mín. 3 caracteres).']]);
        }

        DB::transaction(function () use ($cessao, $motivo) {
            $cessao->status = CessaoBem::STATUS_ENCERRADA;
            $cessao->encerrado_em = now()->toDateString();
            $cessao->motivo_encerramento = $motivo;
            $cessao->save();

            $bem = BemPatrimonial::query()->whereKey($cessao->bem_id)->lockForUpdate()->first();
            if ($bem && $bem->status === BemPatrimonial::STATUS_CEDIDO) {
                $aindaVigente = CessaoBem::query()
                    ->where('bem_id', $bem->id)
                    ->where('status', CessaoBem::STATUS_VIGENTE)
                    ->where('id', '!=', $cessao->id)
                    ->exists();
                if (! $aindaVigente) {
                    $bem->status = BemPatrimonial::STATUS_ATIVO;
                    $bem->save();
                }
            }
        });

        return $this->show($cessao->fresh(['bem', 'parceiro']));
    }

    private function parceiroDaEmpresa(Empresa $empresa, int $parceiroId): Parceiro
    {
        $par = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->whereKey($parceiroId)
            ->first();
        if ($par === null) {
            throw ValidationException::withMessages(['parceiro_id' => ['Parceiro inválido para a empresa.']]);
        }

        return $par;
    }

    private function assertBemCedivel(BemPatrimonial $bem): void
    {
        if (in_array($bem->status, BemPatrimonial::STATUSES_FINAIS, true)) {
            throw ValidationException::withMessages(['bem_id' => ['Bem baixado ou vendido não pode ser cedido.']]);
        }
        $vigente = CessaoBem::query()
            ->where('bem_id', $bem->id)
            ->where('status', CessaoBem::STATUS_VIGENTE)
            ->exists();
        if ($vigente) {
            throw ValidationException::withMessages(['bem_id' => ['Este bem já está cedido. Encerre a cessão vigente antes.']]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function toOut(CessaoBem $c): array
    {
        return [
            'id' => $c->id,
            'codigo' => $c->codigo,
            'tipo' => $c->tipo,
            'status' => $c->status,
            'iniciado_em' => $c->iniciado_em?->toDateString(),
            'encerra_previsto_em' => $c->encerra_previsto_em?->toDateString(),
            'encerrado_em' => $c->encerrado_em?->toDateString(),
            'motivo_encerramento' => $c->motivo_encerramento,
            'valor_mensal' => $c->valor_mensal !== null ? (string) $c->valor_mensal : null,
            'documento_fiscal' => $c->documento_fiscal,
            'observacao' => $c->observacao,
            'aviso_fiscal' => $c->tipo === CessaoBem::TIPO_COMODATO
                ? 'Comodato não gera NFS-e nem NF-e. Manutenção cobrada é outro documento (prestação de serviço).'
                : 'Locação de bem móvel não é ISS (Súmula Vinculante 31). Não emitir NFS-e deste contrato.',
            'bem' => $c->relationLoaded('bem') && $c->bem ? [
                'id' => $c->bem->id,
                'codigo' => $c->bem->codigo,
                'descricao' => $c->bem->descricao,
                'status' => $c->bem->status,
            ] : null,
            'parceiro' => $c->relationLoaded('parceiro') && $c->parceiro ? [
                'id' => $c->parceiro->id,
                'codigo' => $c->parceiro->codigo,
                'razao_social' => $c->parceiro->razao_social,
            ] : null,
            'criado_por' => CessaoBem::userStampFrom($c->criador),
            'atualizado_por' => CessaoBem::userStampFrom($c->atualizador),
            'created_at' => $c->created_at?->toIso8601String(),
        ];
    }
}
