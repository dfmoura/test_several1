<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\FiscalHub;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class FiscalHubService
{
    public function __construct(
        private readonly FiscalHubCrypto $crypto,
        private readonly FocusNfeClient $client,
        private readonly CodigoGenerator $codigos,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * @return array{items: Collection<int, array<string, mixed>>, total: int, ativos: int, padrao_id: int|null, aviso: string}
     */
    public function list(Empresa $empresa): array
    {
        $rows = FiscalHub::query()
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('padrao')
            ->orderByDesc('ativo')
            ->orderBy('codigo')
            ->get();

        $padrao = $rows->firstWhere('padrao', true);

        return [
            'items' => $rows->map(fn (FiscalHub $r) => $this->toOut($r)),
            'total' => $rows->count(),
            'ativos' => $rows->where('ativo', true)->count(),
            'padrao_id' => $padrao?->id,
            'aviso' => 'Homologação e produção usam tokens e URLs distintos. Emissões oficiais só com ambiente produção e token de produção. Documentação: https://doc.focusnfe.com.br/reference/introducao',
        ];
    }

    /** @param  array<string, mixed>  $data */
    public function create(Empresa $empresa, array $data): array
    {
        $provedor = $this->validarProvedor((string) ($data['provedor'] ?? 'focusnfe'));
        $ambiente = $this->validarAmbiente((string) ($data['ambiente_ativo'] ?? 'homologacao'));
        $tokenHom = trim((string) ($data['token_homologacao'] ?? ''));
        $tokenProd = trim((string) ($data['token_producao'] ?? ''));

        if ($tokenHom === '' && $tokenProd === '') {
            throw ValidationException::withMessages([
                'token_homologacao' => ['Informe ao menos o token de homologação ou o de produção.'],
            ]);
        }

        if ($ambiente === 'producao' && $tokenProd === '') {
            throw ValidationException::withMessages([
                'token_producao' => ['Ambiente ativo produção exige token de produção.'],
            ]);
        }

        if ($ambiente === 'homologacao' && $tokenHom === '') {
            throw ValidationException::withMessages([
                'token_homologacao' => ['Ambiente ativo homologação exige token de homologação.'],
            ]);
        }

        $this->validarUrlsProvedor($provedor, $data);

        $padrao = (bool) ($data['padrao'] ?? true);
        if (! $padrao && FiscalHub::query()->where('empresa_id', $empresa->id)->where('padrao', true)->doesntExist()) {
            $padrao = true;
        }

        $row = DB::transaction(function () use ($empresa, $data, $provedor, $ambiente, $tokenHom, $tokenProd, $padrao) {
            if ($padrao) {
                FiscalHub::query()
                    ->where('empresa_id', $empresa->id)
                    ->where('padrao', true)
                    ->update(['padrao' => false]);
            }

            return FiscalHub::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $this->codigos->nextCode($empresa->id, 'HUB'),
                'nome' => trim((string) $data['nome']),
                'provedor' => $provedor,
                'ambiente_ativo' => $ambiente,
                'padrao' => $padrao,
                'ativo' => (bool) ($data['ativo'] ?? true),
                'base_url_homologacao' => $this->limparOpcional($data['base_url_homologacao'] ?? null),
                'base_url_producao' => $this->limparOpcional($data['base_url_producao'] ?? null),
                'token_homologacao_criptografada' => $tokenHom !== '' ? $this->crypto->criptografar($tokenHom) : null,
                'token_homologacao_mascara' => $tokenHom !== '' ? $this->crypto->mascarar($tokenHom) : '',
                'token_producao_criptografada' => $tokenProd !== '' ? $this->crypto->criptografar($tokenProd) : null,
                'token_producao_mascara' => $tokenProd !== '' ? $this->crypto->mascarar($tokenProd) : '',
                'meta' => is_array($data['meta'] ?? null) ? $data['meta'] : null,
            ]);
        });

        $this->auditLogger->log('CRIAR', 'fiscal_hub', $row->id, null, [
            'codigo' => $row->codigo,
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'ambiente_ativo' => $row->ambiente_ativo,
            'padrao' => $row->padrao,
            'ativo' => $row->ativo,
            'token_homologacao_mascara' => $row->token_homologacao_mascara,
            'token_producao_mascara' => $row->token_producao_mascara,
        ]);

        return $this->toOut($row);
    }

    /** @param  array<string, mixed>  $data */
    public function update(FiscalHub $row, array $data): array
    {
        $antes = [
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'ambiente_ativo' => $row->ambiente_ativo,
            'padrao' => $row->padrao,
            'ativo' => $row->ativo,
            'token_homologacao_mascara' => $row->token_homologacao_mascara,
            'token_producao_mascara' => $row->token_producao_mascara,
        ];

        if (array_key_exists('nome', $data)) {
            $row->nome = trim((string) $data['nome']);
        }
        if (array_key_exists('provedor', $data)) {
            $row->provedor = $this->validarProvedor((string) $data['provedor']);
        }
        if (array_key_exists('base_url_homologacao', $data)) {
            $row->base_url_homologacao = $this->limparOpcional($data['base_url_homologacao']);
        }
        if (array_key_exists('base_url_producao', $data)) {
            $row->base_url_producao = $this->limparOpcional($data['base_url_producao']);
        }
        if (array_key_exists('meta', $data)) {
            $row->meta = is_array($data['meta']) ? $data['meta'] : null;
        }
        if (array_key_exists('ativo', $data)) {
            $row->ativo = (bool) $data['ativo'];
        }

        if (! empty($data['token_homologacao']) && is_string($data['token_homologacao'])) {
            $t = trim($data['token_homologacao']);
            if ($t !== '') {
                $row->token_homologacao_criptografada = $this->crypto->criptografar($t);
                $row->token_homologacao_mascara = $this->crypto->mascarar($t);
            }
        }
        if (! empty($data['token_producao']) && is_string($data['token_producao'])) {
            $t = trim($data['token_producao']);
            if ($t !== '') {
                $row->token_producao_criptografada = $this->crypto->criptografar($t);
                $row->token_producao_mascara = $this->crypto->mascarar($t);
            }
        }

        if (array_key_exists('ambiente_ativo', $data)) {
            $ambiente = $this->validarAmbiente((string) $data['ambiente_ativo']);
            if ($ambiente === 'producao' && ! $row->temToken('producao')) {
                throw ValidationException::withMessages([
                    'ambiente_ativo' => ['Cadastre o token de produção antes de ativar esse ambiente.'],
                ]);
            }
            if ($ambiente === 'homologacao' && ! $row->temToken('homologacao')) {
                throw ValidationException::withMessages([
                    'ambiente_ativo' => ['Cadastre o token de homologação antes de ativar esse ambiente.'],
                ]);
            }
            $row->ambiente_ativo = $ambiente;
        }

        $this->validarUrlsProvedor($row->provedor, [
            'base_url_homologacao' => $row->base_url_homologacao,
            'base_url_producao' => $row->base_url_producao,
        ]);

        $marcarPadrao = array_key_exists('padrao', $data) ? (bool) $data['padrao'] : null;

        DB::transaction(function () use ($row, $marcarPadrao) {
            if ($marcarPadrao === true) {
                FiscalHub::query()
                    ->where('empresa_id', $row->empresa_id)
                    ->where('id', '!=', $row->id)
                    ->where('padrao', true)
                    ->update(['padrao' => false]);
                $row->padrao = true;
            } elseif ($marcarPadrao === false) {
                if ($row->padrao) {
                    throw ValidationException::withMessages([
                        'padrao' => ['Defina outro hub como padrão antes de remover este.'],
                    ]);
                }
                $row->padrao = false;
            }

            $row->save();
        });

        $fresh = $row->fresh();

        $this->auditLogger->log('ATUALIZAR', 'fiscal_hub', $row->id, $antes, [
            'nome' => $fresh->nome,
            'provedor' => $fresh->provedor,
            'ambiente_ativo' => $fresh->ambiente_ativo,
            'padrao' => $fresh->padrao,
            'ativo' => $fresh->ativo,
            'token_homologacao_mascara' => $fresh->token_homologacao_mascara,
            'token_producao_mascara' => $fresh->token_producao_mascara,
        ]);

        return $this->toOut($fresh);
    }

    public function delete(FiscalHub $row): void
    {
        if ($row->padrao) {
            $outros = FiscalHub::query()
                ->where('empresa_id', $row->empresa_id)
                ->where('id', '!=', $row->id)
                ->exists();
            if ($outros) {
                throw ValidationException::withMessages([
                    'padrao' => ['Não remova o hub padrão. Defina outro como padrão primeiro.'],
                ]);
            }
        }

        $id = $row->id;
        $snapshot = [
            'codigo' => $row->codigo,
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'token_homologacao_mascara' => $row->token_homologacao_mascara,
            'token_producao_mascara' => $row->token_producao_mascara,
        ];
        $row->delete();

        $this->auditLogger->log('EXCLUIR', 'fiscal_hub', $id, $snapshot, null);
    }

    /**
     * @return array{ok: bool, mensagem: string, ambiente: string, hub: array<string, mixed>}
     */
    public function testar(FiscalHub $row, ?string $ambiente = null): array
    {
        $ambiente = $this->validarAmbiente($ambiente ?: $row->ambiente_ativo);

        try {
            $resultado = $this->client->testarConexao($row, $ambiente);
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages([
                'token' => [$e->getMessage()],
            ]);
        }

        $row->ultimo_teste_ambiente = $ambiente;
        $row->ultimo_teste_em = now();
        $row->ultimo_teste_ok = (bool) ($resultado['ok'] ?? false);
        $row->ultimo_teste_msg = mb_substr((string) ($resultado['mensagem'] ?? ''), 0, 300);
        $row->save();

        return [
            'ok' => (bool) $row->ultimo_teste_ok,
            'mensagem' => (string) $row->ultimo_teste_msg,
            'ambiente' => $ambiente,
            'hub' => $this->toOut($row->fresh()),
        ];
    }

    /** @return array<string, mixed> */
    public function toOut(FiscalHub $row): array
    {
        return [
            'id' => $row->id,
            'empresa_id' => $row->empresa_id,
            'codigo' => $row->codigo,
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'ambiente_ativo' => $row->ambiente_ativo,
            'padrao' => $row->padrao,
            'ativo' => $row->ativo,
            'base_url_homologacao' => $row->base_url_homologacao,
            'base_url_producao' => $row->base_url_producao,
            'base_url_homologacao_efetiva' => $this->urlEfetivaSegura($row, 'homologacao'),
            'base_url_producao_efetiva' => $this->urlEfetivaSegura($row, 'producao'),
            'token_homologacao_mascara' => $row->token_homologacao_mascara,
            'token_producao_mascara' => $row->token_producao_mascara,
            'tem_token_homologacao' => $row->temToken('homologacao'),
            'tem_token_producao' => $row->temToken('producao'),
            'ultimo_teste_ambiente' => $row->ultimo_teste_ambiente,
            'ultimo_teste_em' => $row->ultimo_teste_em?->toIso8601String(),
            'ultimo_teste_ok' => $row->ultimo_teste_ok,
            'ultimo_teste_msg' => $row->ultimo_teste_msg,
            'meta' => $row->meta,
            'created_at' => $row->created_at?->toIso8601String(),
            'updated_at' => $row->updated_at?->toIso8601String(),
        ];
    }

    private function urlEfetivaSegura(FiscalHub $row, string $ambiente): ?string
    {
        try {
            return $row->baseUrlPara($ambiente);
        } catch (RuntimeException) {
            return null;
        }
    }

    private function validarProvedor(string $valor): string
    {
        $v = strtolower(trim($valor));
        if (! in_array($v, FiscalHub::PROVEDORES, true)) {
            throw ValidationException::withMessages([
                'provedor' => ['Provedor inválido. Use: '.implode(', ', FiscalHub::PROVEDORES).'.'],
            ]);
        }

        return $v;
    }

    private function validarAmbiente(string $valor): string
    {
        $v = strtolower(trim($valor));
        if (! in_array($v, FiscalHub::AMBIENTES, true)) {
            throw ValidationException::withMessages([
                'ambiente' => ['Ambiente inválido. Use: homologacao ou producao.'],
            ]);
        }

        return $v;
    }

    /** @param  array<string, mixed>  $data */
    private function validarUrlsProvedor(string $provedor, array $data): void
    {
        if ($provedor !== 'generico') {
            return;
        }

        $hom = $this->limparOpcional($data['base_url_homologacao'] ?? null);
        $prod = $this->limparOpcional($data['base_url_producao'] ?? null);
        if ($hom === null && $prod === null) {
            throw ValidationException::withMessages([
                'base_url_homologacao' => ['Provedor genérico exige ao menos uma base URL (homologação ou produção).'],
            ]);
        }
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
