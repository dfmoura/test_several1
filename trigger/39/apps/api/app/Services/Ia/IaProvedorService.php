<?php

namespace App\Services\Ia;

use App\Models\IaProvedor;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class IaProvedorService
{
    public function __construct(
        private readonly IaCrypto $crypto,
        private readonly IaClient $client,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * @return array{items: Collection<int, array<string, mixed>>, total: int, ativos: int, aviso_custo: string}
     */
    public function list(): array
    {
        $rows = IaProvedor::query()
            ->orderBy('prioridade')
            ->orderBy('id')
            ->get();

        return [
            'items' => $rows->map(fn (IaProvedor $r) => $this->toOut($r)),
            'total' => $rows->count(),
            'ativos' => $rows->where('ativo', true)->count(),
            'aviso_custo' => 'O uso consome crédito do provedor externo (OpenAI, Gemini, Anthropic etc.).',
        ];
    }

    /** @param  array<string, mixed>  $data */
    public function create(array $data): array
    {
        $tipo = $this->validarProvedor((string) ($data['provedor'] ?? 'openai'));
        $apiKey = trim((string) $data['api_key']);

        $row = IaProvedor::query()->create([
            'nome' => trim((string) $data['nome']),
            'provedor' => $tipo,
            'base_url' => $this->limparOpcional($data['base_url'] ?? null),
            'modelo' => $this->limparOpcional($data['modelo'] ?? null),
            'api_key_criptografada' => $this->crypto->criptografar($apiKey),
            'api_key_mascara' => $this->crypto->mascarar($apiKey),
            'prioridade' => (int) ($data['prioridade'] ?? 100),
            'ativo' => (bool) ($data['ativo'] ?? true),
        ]);

        $this->auditLogger->log('CRIAR', 'ia_provedor', $row->id, null, [
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'api_key_mascara' => $row->api_key_mascara,
            'prioridade' => $row->prioridade,
            'ativo' => $row->ativo,
        ]);

        return $this->toOut($row);
    }

    /** @param  array<string, mixed>  $data */
    public function update(IaProvedor $row, array $data): array
    {
        $antes = [
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'api_key_mascara' => $row->api_key_mascara,
            'prioridade' => $row->prioridade,
            'ativo' => $row->ativo,
        ];

        if (array_key_exists('nome', $data)) {
            $row->nome = trim((string) $data['nome']);
        }
        if (array_key_exists('provedor', $data)) {
            $row->provedor = $this->validarProvedor((string) $data['provedor']);
        }
        if (array_key_exists('base_url', $data)) {
            $row->base_url = $this->limparOpcional($data['base_url']);
        }
        if (array_key_exists('modelo', $data)) {
            $row->modelo = $this->limparOpcional($data['modelo']);
        }
        if (array_key_exists('prioridade', $data)) {
            $row->prioridade = (int) $data['prioridade'];
        }
        if (array_key_exists('ativo', $data)) {
            $row->ativo = (bool) $data['ativo'];
        }
        if (! empty($data['api_key']) && is_string($data['api_key']) && trim($data['api_key']) !== '') {
            $key = trim($data['api_key']);
            $row->api_key_criptografada = $this->crypto->criptografar($key);
            $row->api_key_mascara = $this->crypto->mascarar($key);
        }

        $row->save();

        $this->auditLogger->log('ATUALIZAR', 'ia_provedor', $row->id, $antes, [
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'api_key_mascara' => $row->api_key_mascara,
            'prioridade' => $row->prioridade,
            'ativo' => $row->ativo,
        ]);

        return $this->toOut($row->fresh());
    }

    public function delete(IaProvedor $row): void
    {
        $id = $row->id;
        $snapshot = [
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'api_key_mascara' => $row->api_key_mascara,
        ];
        $row->delete();

        $this->auditLogger->log('EXCLUIR', 'ia_provedor', $id, $snapshot, null);
    }

    /**
     * @return array{ok: bool, mensagem: string, provedor: array<string, mixed>}
     */
    public function testar(IaProvedor $row): array
    {
        try {
            $resultado = $this->client->testarConexao($row);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages([
                'api_key' => [$e->getMessage()],
            ]);
        }

        $row->ultimo_teste_em = now();
        $row->ultimo_teste_ok = (bool) ($resultado['ok'] ?? false);
        $row->ultimo_teste_msg = mb_substr((string) ($resultado['mensagem'] ?? ''), 0, 300);
        $row->save();

        return [
            'ok' => (bool) $row->ultimo_teste_ok,
            'mensagem' => (string) $row->ultimo_teste_msg,
            'provedor' => $this->toOut($row->fresh()),
        ];
    }

    /** @return array<string, mixed> */
    public function toOut(IaProvedor $row): array
    {
        return [
            'id' => $row->id,
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'base_url' => $row->base_url,
            'modelo' => $row->modelo,
            'api_key_mascara' => $row->api_key_mascara,
            'prioridade' => $row->prioridade,
            'ativo' => $row->ativo,
            'ultimo_teste_em' => $row->ultimo_teste_em?->toIso8601String(),
            'ultimo_teste_ok' => $row->ultimo_teste_ok,
            'ultimo_teste_msg' => $row->ultimo_teste_msg,
            'created_at' => $row->created_at?->toIso8601String(),
            'updated_at' => $row->updated_at?->toIso8601String(),
        ];
    }

    private function validarProvedor(string $valor): string
    {
        $v = strtolower(trim($valor));
        if (! in_array($v, IaProvedor::PROVEDORES, true)) {
            throw ValidationException::withMessages([
                'provedor' => ['Provedor inválido. Use: '.implode(', ', IaProvedor::PROVEDORES).'.'],
            ]);
        }

        return $v;
    }

    private function limparOpcional(mixed $valor): ?string
    {
        if ($valor === null) {
            return null;
        }
        $t = trim((string) $valor);

        return $t === '' ? null : $t;
    }
}
