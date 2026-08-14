<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\ParceiroFiscalHistorico;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ParceiroService
{
    public function __construct(
        private readonly CodigoGenerator $codigoGenerator,
        private readonly AuditLogger $auditLogger,
        private readonly DepartamentoService $departamentoService,
    ) {}

    public function list(Empresa $empresa, ?string $q = null, ?string $papel = null, int $limit = 50)
    {
        $query = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->with([
                'contatos',
                'contasBancarias',
                'enderecosEntrega',
                'departamentoRef:id,codigo,nome,ativo',
                ...Parceiro::userStampWith(),
            ])
            ->orderBy('razao_social');

        if ($q) {
            $digits = preg_replace('/\D/', '', $q);
            $query->where(function ($builder) use ($q, $digits) {
                $builder->where('razao_social', 'like', "%{$q}%")
                    ->orWhere('nome_fantasia', 'like', "%{$q}%")
                    ->orWhere('codigo', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('telefone', 'like', "%{$q}%")
                    ->orWhere('whatsapp', 'like', "%{$q}%")
                    ->orWhere('municipio', 'like', "%{$q}%")
                    ->orWhere('uf', 'like', "%{$q}%");
                if ($digits !== '') {
                    $builder->orWhere('cnpj_cpf', 'like', "%{$digits}%")
                        ->orWhere('telefone', 'like', "%{$digits}%")
                        ->orWhere('whatsapp', 'like', "%{$digits}%");
                }
            });
        }

        if ($papel === 'orcavel' || $papel === 'prospect') {
            // Domínio ORCAMENTO_PROSPECT: orçar para cliente OU prospect.
            if ($papel === 'prospect') {
                $query->where('is_prospect', true);
            } else {
                $query->where(function ($builder) {
                    $builder->where('papel_cliente', true)
                        ->orWhere('is_prospect', true);
                });
            }
        } elseif ($papel) {
            $column = 'papel_'.$papel;
            if (in_array($column, [
                'papel_cliente', 'papel_fornecedor', 'papel_colaborador',
                'papel_transportadora', 'papel_banco', 'papel_entidade',
                'papel_vendedor', 'papel_contador',
            ], true)) {
                $query->where($column, true);
            }
        }

        return $query->limit($limit)->get();
    }

    /**
     * Antiduplicidade pré-criação (ORCAMENTO_PROSPECT §3.3).
     *
     * @param  array{nome?: string|null, whatsapp?: string|null, email?: string|null, cnpj_cpf?: string|null}  $data
     * @return list<Parceiro>
     */
    public function buscarCandidatosDuplicados(Empresa $empresa, array $data, int $limit = 8): array
    {
        $nome = trim((string) ($data['nome'] ?? ''));
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $whatsappDigits = preg_replace('/\D/', '', (string) ($data['whatsapp'] ?? ''));
        $cnpjDigits = preg_replace('/\D/', '', (string) ($data['cnpj_cpf'] ?? ''));

        if ($nome === '' && $email === '' && $whatsappDigits === '' && $cnpjDigits === '') {
            return [];
        }

        $query = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where(function ($builder) use ($nome, $email, $whatsappDigits, $cnpjDigits) {
                if ($cnpjDigits !== '') {
                    $builder->orWhere('cnpj_cpf', $cnpjDigits);
                }
                if ($email !== '') {
                    $builder->orWhereRaw('LOWER(email) = ?', [$email]);
                }
                if ($whatsappDigits !== '' && strlen($whatsappDigits) >= 8) {
                    $builder->orWhere('whatsapp', 'like', "%{$whatsappDigits}%")
                        ->orWhere('telefone', 'like', "%{$whatsappDigits}%");
                }
                if ($nome !== '' && mb_strlen($nome) >= 3) {
                    $builder->orWhere('razao_social', 'like', "%{$nome}%")
                        ->orWhere('nome_fantasia', 'like', "%{$nome}%");
                }
            })
            ->orderByDesc('is_prospect')
            ->orderBy('razao_social')
            ->limit($limit);

        return $query->get()->all();
    }

    /**
     * Cadastro mínimo de prospect (30s) — ORCAMENTO_PROSPECT §3.
     * Nome + (WhatsApp OU e-mail) + cidade/UF. Sem papel CLIENTE (exige CNPJ na promoção).
     *
     * @param  array<string, mixed>  $data
     */
    public function createProspectRapido(Empresa $empresa, array $data): Parceiro
    {
        $nome = trim((string) ($data['nome'] ?? ''));
        $whatsapp = $this->digitsOrNull($data['whatsapp'] ?? null) ?? '';
        $email = trim((string) ($data['email'] ?? ''));
        $municipio = trim((string) ($data['municipio'] ?? ''));
        $uf = strtoupper(trim((string) ($data['uf'] ?? '')));
        $cnpj = $this->digitsOrNull($data['cnpj_cpf'] ?? null);
        $origem = trim((string) ($data['origem_lead'] ?? ''));

        if ($nome === '') {
            throw ValidationException::withMessages(['nome' => ['Informe o nome do prospect.']]);
        }
        if ($whatsapp === '' && $email === '') {
            throw ValidationException::withMessages([
                'contato' => ['Informe WhatsApp ou e-mail (ao menos um canal).'],
            ]);
        }
        if ($municipio === '' || $uf === '' || strlen($uf) !== 2) {
            throw ValidationException::withMessages([
                'municipio' => ['Informe cidade e UF (necessário para imposto/frete estimado).'],
            ]);
        }

        return $this->create($empresa, [
            'razao_social' => $nome,
            'tipo_pessoa' => $cnpj !== null && strlen($cnpj) === 11 ? 'PF' : 'PJ',
            'cnpj_cpf' => $cnpj,
            'is_prospect' => true,
            'papel_cliente' => false,
            'limite_credito' => 0,
            'cep' => $this->digitsOrNull($data['cep'] ?? null),
            'logradouro' => $this->nullableString($data['logradouro'] ?? null),
            'numero' => $this->nullableString($data['numero'] ?? null),
            'complemento' => $this->nullableString($data['complemento'] ?? null),
            'bairro' => $this->nullableString($data['bairro'] ?? null),
            'municipio' => $municipio,
            'uf' => $uf,
            'ibge' => $this->digitsOrNull($data['ibge'] ?? null),
            'whatsapp' => $whatsapp !== '' ? $whatsapp : null,
            'telefone' => $whatsapp !== '' ? $whatsapp : null,
            'email' => $email !== '' ? $email : null,
            'origem_lead' => $origem !== '' ? $origem : null,
            'situacao' => 'ATIVO',
        ]);
    }

    public function create(Empresa $empresa, array $data): Parceiro
    {
        $this->validatePapeis($data);
        $this->assertCnpjUnique($empresa->id, $data['cnpj_cpf'] ?? null);
        $contatos = $this->normalizeContatos($data['contatos'] ?? null);
        $contas = $this->normalizeContas($data['contas_bancarias'] ?? null);
        $enderecosEntrega = $this->normalizeEnderecosEntrega($data['enderecos_entrega'] ?? null, $empresa);

        return DB::transaction(function () use ($empresa, $data, $contatos, $contas, $enderecosEntrega) {
            $codigo = $data['codigo'] ?? $this->codigoGenerator->nextCode($empresa->id, 'PAR', 5);

            $attributes = $this->mapAttributes($data);
            $attributes = $this->applyDistanciaCarro($attributes, $data, $empresa);
            $attributes = $this->applyDepartamento($empresa, $data, $attributes);
            $attributes = array_merge($attributes, $this->denormalizeFromRelations($contatos, $contas, $attributes));
            $attributes = $this->applyFiscalRules($attributes, []);

            $parceiro = Parceiro::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                ...$attributes,
            ]);

            $this->syncContatos($parceiro, $contatos);
            $this->syncContas($parceiro, $contas);
            $this->syncEnderecosEntrega($parceiro, $enderecosEntrega);
            $this->openFiscalHistorico($parceiro, 'Cadastro inicial', Auth::id());

            $this->auditLogger->log(
                'CRIAR',
                'parceiro',
                $parceiro->id,
                null,
                $parceiro->fresh(['contatos', 'contasBancarias', 'enderecosEntrega', 'fiscaisHistorico', 'departamentoRef', ...Parceiro::userStampWith()])->toArray()
            );

            return $parceiro->fresh(['contatos', 'contasBancarias', 'enderecosEntrega', 'fiscaisHistorico', 'departamentoRef', ...Parceiro::userStampWith()]);
        });
    }

    public function update(Parceiro $parceiro, array $data): Parceiro
    {
        $this->validatePapeis(array_merge($parceiro->toArray(), $data));

        if (array_key_exists('cnpj_cpf', $data)) {
            $this->assertCnpjUnique($parceiro->empresa_id, $data['cnpj_cpf'], $parceiro->id);
        }

        $hasContatos = array_key_exists('contatos', $data);
        $hasContas = array_key_exists('contas_bancarias', $data);
        $hasEnderecosEntrega = array_key_exists('enderecos_entrega', $data);
        $empresa = $parceiro->empresa ?? Empresa::query()->findOrFail($parceiro->empresa_id);
        $contatos = $hasContatos ? $this->normalizeContatos($data['contatos']) : null;
        $contas = $hasContas ? $this->normalizeContas($data['contas_bancarias']) : null;
        $enderecosEntrega = $hasEnderecosEntrega
            ? $this->normalizeEnderecosEntrega($data['enderecos_entrega'], $empresa)
            : null;

        $before = $parceiro->load(['contatos', 'contasBancarias', 'enderecosEntrega', 'fiscaisHistorico', 'departamentoRef', ...Parceiro::userStampWith()])->toArray();
        $beforeFiscal = $parceiro->only(ParceiroFiscalRules::vigenciaFields());

        return DB::transaction(function () use (
            $parceiro, $data, $hasContatos, $hasContas, $hasEnderecosEntrega,
            $contatos, $contas, $enderecosEntrega, $before, $beforeFiscal
        ) {
            $empresa = $parceiro->empresa ?? Empresa::query()->findOrFail($parceiro->empresa_id);
            $attributes = $this->mapAttributes($data);
            $attributes = $this->applyDistanciaCarro($attributes, $data, $empresa);
            $attributes = $this->applyDepartamento($empresa, $data, $attributes);

            if ($hasContatos || $hasContas) {
                $currentContatos = $hasContatos
                    ? $contatos
                    : $parceiro->contatos->map(fn ($c) => $c->only([
                        'nome', 'funcao', 'telefone', 'whatsapp', 'email', 'principal', 'autorizado_aprovar', 'ordem',
                    ]))->all();
                $currentContas = $hasContas
                    ? $contas
                    : $parceiro->contasBancarias->map(fn ($c) => $c->only([
                        'banco_codigo', 'banco_nome', 'agencia', 'conta', 'pix_chave', 'tipo_conta', 'principal', 'ordem',
                    ]))->all();

                $attributes = array_merge(
                    $attributes,
                    $this->denormalizeFromRelations($currentContatos, $currentContas, $attributes)
                );
            }

            $mergedForRules = array_merge($parceiro->getAttributes(), $attributes);
            $attributes = array_merge($attributes, $this->applyFiscalRules($attributes, $parceiro->getAttributes()));

            // Reavalia com atributos já sincronizados (IE/ind etc.).
            $evalAttrs = array_merge($mergedForRules, $attributes);
            $evaluation = ParceiroFiscalRules::evaluate($evalAttrs);
            $attributes['cadastro_fiscal_completo'] = $evaluation['completo'];

            if ($attributes !== []) {
                $parceiro->update($attributes);
            }

            if ($hasContatos) {
                $this->syncContatos($parceiro, $contatos);
            }

            if ($hasContas) {
                $this->syncContas($parceiro, $contas);
            }

            if ($hasEnderecosEntrega) {
                $this->syncEnderecosEntrega($parceiro, $enderecosEntrega);
            }

            $parceiro->refresh();
            $afterFiscal = $parceiro->only(ParceiroFiscalRules::vigenciaFields());
            if (ParceiroFiscalRules::fiscalChanged($beforeFiscal, $afterFiscal)) {
                $this->rotateFiscalHistorico(
                    $parceiro,
                    $data['motivo_vigencia_fiscal'] ?? 'Alteração de enquadramento fiscal',
                    Auth::id()
                );
            }

            $fresh = $parceiro->fresh(['contatos', 'contasBancarias', 'enderecosEntrega', 'fiscaisHistorico', 'departamentoRef', ...Parceiro::userStampWith()]);
            $this->auditLogger->log('ATUALIZAR', 'parceiro', $parceiro->id, $before, $fresh->toArray());

            return $fresh;
        });
    }

    /**
     * @param  array<string, mixed>  $incoming
     * @param  array<string, mixed>  $current
     * @return array<string, mixed>
     */
    private function applyFiscalRules(array $incoming, array $current): array
    {
        $merged = array_merge($current, $incoming);

        $sync = ParceiroFiscalRules::syncIeInd($incoming, $current);
        $incoming['ie'] = $sync['ie'];
        $incoming['ind_ie_dest'] = $sync['ind_ie_dest'];
        $incoming['ie_status'] = $sync['ie_status'];

        if (array_key_exists('suframa', $incoming) && is_string($incoming['suframa'])) {
            $incoming['suframa'] = trim($incoming['suframa']) === ''
                ? null
                : preg_replace('/\D/', '', $incoming['suframa']);
        }

        $uf = $incoming['uf'] ?? $current['uf'] ?? null;
        $suframa = $incoming['suframa'] ?? $current['suframa'] ?? null;

        if (! array_key_exists('area_incentivada', $incoming)) {
            if (ParceiroFiscalRules::suggestAreaIncentivada(
                is_string($uf) ? $uf : null,
                is_string($suframa) ? $suframa : null
            )) {
                $incoming['area_incentivada'] = true;
            }
        } elseif ($suframa && trim((string) $suframa) !== '') {
            $incoming['area_incentivada'] = true;
        }

        // Status IE OK/BAIXADA → carimba consulta.
        $prevStatus = (string) ($current['ie_status'] ?? ParceiroFiscalRules::IE_STATUS_NAO_VERIFICADA);
        $newStatus = (string) ($incoming['ie_status'] ?? $prevStatus);
        if (
            $newStatus !== $prevStatus
            && in_array($newStatus, [
                ParceiroFiscalRules::IE_STATUS_OK,
                ParceiroFiscalRules::IE_STATUS_BAIXADA,
                ParceiroFiscalRules::IE_STATUS_NAO_HABILITADA,
                ParceiroFiscalRules::IE_STATUS_ISENTA,
            ], true)
        ) {
            $incoming['ie_consultado_em'] = now();
        }

        // Início da vigência do regime atual.
        $prevRegime = $current['regime'] ?? null;
        $newRegime = array_key_exists('regime', $incoming) ? $incoming['regime'] : $prevRegime;
        if ($newRegime !== $prevRegime) {
            $incoming['regime_desde'] = $incoming['regime_desde'] ?? now()->toDateString();
        }
        if ($newRegime && empty($incoming['regime_desde'] ?? $current['regime_desde'] ?? null)) {
            $incoming['regime_desde'] = now()->toDateString();
        }

        if (array_key_exists('finalidade', $incoming) && $incoming['finalidade'] === '') {
            $incoming['finalidade'] = null;
        }

        if (array_key_exists('finalidade', $incoming) && $incoming['finalidade'] !== null) {
            if (! in_array($incoming['finalidade'], ParceiroFiscalRules::FINALIDADES, true)) {
                throw ValidationException::withMessages([
                    'finalidade' => ['Finalidade inválida. Use REVENDA, INDUSTRIALIZACAO ou USO_CONSUMO.'],
                ]);
            }
        }

        // Consumidor final alinhado à finalidade uso/consumo.
        $finalidade = $incoming['finalidade'] ?? $current['finalidade'] ?? null;
        if ($finalidade === 'USO_CONSUMO' && ! array_key_exists('consumidor_final', $incoming)) {
            $incoming['consumidor_final'] = true;
        }

        $evalAttrs = array_merge($merged, $incoming);
        $evaluation = ParceiroFiscalRules::evaluate($evalAttrs);
        $incoming['cadastro_fiscal_completo'] = $evaluation['completo'];

        // Cliente não pode forçar a flag manualmente.
        unset($incoming['apto_emissao_nfe'], $incoming['fiscal_pendencias'], $incoming['fiscal_pendencias_emissao']);

        $tipo = (string) ($incoming['tipo_pessoa'] ?? $current['tipo_pessoa'] ?? 'PJ');
        if ($tipo !== 'PJ') {
            $incoming['cnae'] = null;
            $incoming['cnaes_secundarios'] = null;
        }

        return $incoming;
    }

    private function openFiscalHistorico(Parceiro $parceiro, string $motivo, ?int $userId): void
    {
        ParceiroFiscalHistorico::query()->create([
            'parceiro_id' => $parceiro->id,
            'vigencia_inicio' => now()->toDateString(),
            'vigencia_fim' => null,
            'ie' => $parceiro->ie,
            'im' => $parceiro->im,
            'ind_ie_dest' => $parceiro->ind_ie_dest,
            'ie_status' => $parceiro->ie_status,
            'regime' => $parceiro->regime,
            'finalidade' => $parceiro->finalidade,
            'consumidor_final' => (bool) $parceiro->consumidor_final,
            'suframa' => $parceiro->suframa,
            'area_incentivada' => (bool) $parceiro->area_incentivada,
            'motivo' => $motivo,
            'alterado_por' => $userId,
        ]);
    }

    private function rotateFiscalHistorico(Parceiro $parceiro, string $motivo, ?int $userId): void
    {
        $hoje = now()->toDateString();

        ParceiroFiscalHistorico::query()
            ->where('parceiro_id', $parceiro->id)
            ->whereNull('vigencia_fim')
            ->update(['vigencia_fim' => $hoje]);

        $this->openFiscalHistorico($parceiro, $motivo, $userId);
    }

    private function mapAttributes(array $data): array
    {
        $fields = [
            'tipo_pessoa', 'cnpj_cpf', 'razao_social', 'nome_fantasia', 'ie', 'im',
            'suframa', 'area_incentivada',
            'ind_ie_dest', 'ie_status', 'ie_consultado_em',
            'consumidor_final', 'finalidade', 'regime', 'regime_desde',
            'cnae', 'cnaes_secundarios',
            'situacao', 'motivo_bloqueio',
            'cadastro_fiscal_completo', 'emite_documento_fiscal', 'is_prospect',
            'origem_lead',
            'papel_cliente', 'papel_fornecedor', 'papel_colaborador',
            'papel_transportadora', 'papel_banco', 'papel_entidade',
            'papel_vendedor', 'papel_contador',
            'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf', 'cep', 'ibge',
            'latitude', 'longitude', 'distancia_km',
            'telefone', 'whatsapp', 'email', 'email_xml', 'contato_nome', 'contato_funcao',
            'limite_credito', 'credito_utilizado', 'condicao_pagamento', 'forma_pagamento',
            'vendedor_parceiro_id', 'comissao_percentual',
            'tipo_fornecimento', 'cfop_entrada_padrao',
            'vinculo', 'cargo', 'departamento_id', 'admissao_em', 'desligamento_em',
            'banco_codigo', 'banco_nome', 'agencia', 'conta', 'pix_chave',
            'consulta_snapshot',
        ];

        $mapped = [];
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $value = $data[$field];
                if (in_array($field, ['cnpj_cpf', 'ibge', 'cep', 'cnae'], true) && is_string($value)) {
                    $value = preg_replace('/\D/', '', $value) ?: null;
                }
                if ($field === 'cnaes_secundarios') {
                    $value = $this->normalizeCnaesSecundarios($value);
                }
                if ($field === 'departamento_id') {
                    $value = $value === '' || $value === null ? null : (int) $value;
                }
                $mapped[$field] = $value;
            }
        }

        return PadraoDecimal::canonicalizeFields($mapped, PadraoDecimal::parceiroFieldScales());
    }

    /**
     * Km é EMP×B. O cliente não escolhe distancia_empresa_id.
     *
     * @param  array<string, mixed>  $mapped
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function applyDistanciaCarro(array $mapped, array $data, Empresa $empresa): array
    {
        unset($mapped['distancia_empresa_id'], $mapped['distancia_fonte'], $mapped['distancia_calculada_em']);

        if (! array_key_exists('distancia_km', $data)) {
            return $mapped;
        }

        $km = $mapped['distancia_km'] ?? null;
        if ($km === null || $km === '') {
            $mapped['distancia_km'] = null;
            $mapped['distancia_fonte'] = null;
            $mapped['distancia_calculada_em'] = null;
            $mapped['distancia_empresa_id'] = null;

            return $mapped;
        }

        $fonte = isset($data['distancia_fonte']) ? (string) $data['distancia_fonte'] : \App\Services\Consulta\OpenRouteServiceClient::FONTE;
        $fontesOk = [
            \App\Services\Consulta\OpenRouteServiceClient::FONTE,
            \App\Services\Consulta\OpenRouteServiceClient::FONTE_MESMO_PONTO,
        ];
        if (! in_array($fonte, $fontesOk, true)) {
            $fonte = \App\Services\Consulta\OpenRouteServiceClient::FONTE;
        }

        $mapped['distancia_fonte'] = $fonte;
        $mapped['distancia_empresa_id'] = $empresa->id;
        $mapped['distancia_calculada_em'] = ! empty($data['distancia_calculada_em'])
            ? $data['distancia_calculada_em']
            : now();

        return $mapped;
    }

    /**
     * Resolve departamento_id e espelha o nome em `departamento` (legado).
     * Texto livre só é aceito via import (sem departamento_id) — resolve ou cria.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function applyDepartamento(Empresa $empresa, array $data, array $attributes): array
    {
        $hasId = array_key_exists('departamento_id', $data);
        $hasTexto = array_key_exists('departamento', $data);

        if (! $hasId && ! $hasTexto) {
            return $attributes;
        }

        // API moderna: departamento_id é a fonte da verdade; string não escreve sozinha.
        if ($hasId) {
            $id = $data['departamento_id'];
            if ($id === null || $id === '') {
                $attributes['departamento_id'] = null;
                $attributes['departamento'] = null;

                return $attributes;
            }

            $resolved = $this->departamentoService->resolveId($empresa, $id, null, false);
            $attributes['departamento_id'] = $resolved;
            $attributes['departamento'] = $this->departamentoService->mirrorNome($resolved);

            return $attributes;
        }

        // Import legado: só texto → resolve por código/nome (cria se ausente).
        $texto = is_string($data['departamento'] ?? null) ? trim((string) $data['departamento']) : '';
        if ($texto === '') {
            $attributes['departamento_id'] = null;
            $attributes['departamento'] = null;

            return $attributes;
        }

        $resolved = $this->departamentoService->resolveId($empresa, null, $texto, true);
        $attributes['departamento_id'] = $resolved;
        $attributes['departamento'] = $this->departamentoService->mirrorNome($resolved);

        return $attributes;
    }

    /**
     * @param  mixed  $raw
     * @return list<array{codigo: string, descricao: string|null}>|null
     */
    private function normalizeCnaesSecundarios(mixed $raw): ?array
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (! is_array($raw)) {
            throw ValidationException::withMessages([
                'cnaes_secundarios' => ['CNAEs secundários devem ser uma lista.'],
            ]);
        }

        $out = [];
        foreach ($raw as $item) {
            if (! is_array($item)) {
                continue;
            }
            $codigo = preg_replace('/\D/', '', (string) ($item['codigo'] ?? '')) ?? '';
            if ($codigo === '') {
                continue;
            }
            $out[] = [
                'codigo' => $codigo,
                'descricao' => isset($item['descricao']) ? (string) $item['descricao'] : null,
            ];
        }

        return $out === [] ? null : $out;
    }

    /**
     * @param  list<array<string, mixed>>|null  $contatos
     * @return list<array<string, mixed>>
     */
    private function normalizeContatos(?array $contatos): array
    {
        if ($contatos === null) {
            return [];
        }

        $normalized = [];
        foreach (array_values($contatos) as $index => $row) {
            if (! is_array($row)) {
                continue;
            }

            $nome = trim((string) ($row['nome'] ?? ''));
            $funcao = $this->nullableString($row['funcao'] ?? null);
            $telefone = $this->digitsOrNull($row['telefone'] ?? null);
            $whatsapp = $this->digitsOrNull($row['whatsapp'] ?? null);
            $email = $this->nullableString($row['email'] ?? null);

            if ($nome === '' && $funcao === null && $telefone === null && $whatsapp === null && $email === null) {
                continue;
            }

            if ($nome === '') {
                $nome = 'Contato '.($index + 1);
            }

            $normalized[] = [
                'nome' => $nome,
                'funcao' => $funcao,
                'telefone' => $telefone,
                'whatsapp' => $whatsapp,
                'email' => $email,
                'principal' => (bool) ($row['principal'] ?? false),
                'autorizado_aprovar' => (bool) ($row['autorizado_aprovar'] ?? ($row['principal'] ?? false)),
                'ordem' => (int) ($row['ordem'] ?? $index),
            ];
        }

        return $this->ensureSinglePrincipal($normalized);
    }

    /**
     * @param  list<array<string, mixed>>|null  $contas
     * @return list<array<string, mixed>>
     */
    private function normalizeContas(?array $contas): array
    {
        if ($contas === null) {
            return [];
        }

        $normalized = [];
        foreach (array_values($contas) as $index => $row) {
            if (! is_array($row)) {
                continue;
            }

            $bancoCodigo = $this->nullableString($row['banco_codigo'] ?? null);
            $bancoNome = $this->nullableString($row['banco_nome'] ?? null);
            $agencia = $this->nullableString($row['agencia'] ?? null);
            $conta = $this->nullableString($row['conta'] ?? null);
            $pix = $this->nullableString($row['pix_chave'] ?? null);
            $tipo = $this->nullableString($row['tipo_conta'] ?? null);

            if ($bancoCodigo === null && $bancoNome === null && $agencia === null && $conta === null && $pix === null) {
                continue;
            }

            $normalized[] = [
                'banco_codigo' => $bancoCodigo,
                'banco_nome' => $bancoNome,
                'agencia' => $agencia,
                'conta' => $conta,
                'pix_chave' => $pix,
                'tipo_conta' => $tipo,
                'principal' => (bool) ($row['principal'] ?? false),
                'ordem' => (int) ($row['ordem'] ?? $index),
            ];
        }

        return $this->ensureSinglePrincipal($normalized);
    }

    /**
     * Lista vazia = entrega no mesmo endereço fiscal (não duplica).
     *
     * @param  list<array<string, mixed>>|null  $rows
     * @return list<array<string, mixed>>
     */
    private function normalizeEnderecosEntrega(?array $rows, Empresa $empresa): array
    {
        if ($rows === null) {
            return [];
        }

        $normalized = [];
        foreach (array_values($rows) as $index => $row) {
            if (! is_array($row)) {
                continue;
            }

            $apelido = $this->nullableString($row['apelido'] ?? null);
            $logradouro = $this->nullableString($row['logradouro'] ?? null);
            $numero = $this->nullableString($row['numero'] ?? null);
            $complemento = $this->nullableString($row['complemento'] ?? null);
            $bairro = $this->nullableString($row['bairro'] ?? null);
            $municipio = $this->nullableString($row['municipio'] ?? null);
            $uf = $this->nullableString($row['uf'] ?? null);
            if ($uf !== null) {
                $uf = strtoupper($uf);
            }
            $cep = $this->digitsOrNull($row['cep'] ?? null);
            $ibge = $this->digitsOrNull($row['ibge'] ?? null);
            $coords = PadraoDecimal::canonicalizeFields(
                [
                    'latitude' => $row['latitude'] ?? null,
                    'longitude' => $row['longitude'] ?? null,
                    'distancia_km' => $row['distancia_km'] ?? null,
                ],
                [
                    'latitude' => PadraoDecimal::SCALE_COORD,
                    'longitude' => PadraoDecimal::SCALE_COORD,
                    'distancia_km' => PadraoDecimal::SCALE_DISTANCE,
                ]
            );
            $responsavelNome = $this->nullableString($row['responsavel_nome'] ?? null);
            $responsavelTelefone = $this->digitsOrNull($row['responsavel_telefone'] ?? null);
            $responsavelDocumento = $this->nullableString($row['responsavel_documento'] ?? null);
            $observacoes = $this->nullableString($row['observacoes'] ?? null);

            $hasAny = $apelido !== null
                || $logradouro !== null
                || $numero !== null
                || $complemento !== null
                || $bairro !== null
                || $municipio !== null
                || $uf !== null
                || $cep !== null
                || $ibge !== null
                || $responsavelNome !== null
                || $responsavelTelefone !== null
                || $responsavelDocumento !== null
                || $observacoes !== null;

            if (! $hasAny) {
                continue;
            }

            $prefix = "enderecos_entrega.{$index}";
            $errors = [];

            if ($responsavelNome === null) {
                $errors["{$prefix}.responsavel_nome"] = ['Informe o responsável por receber neste endereço de entrega.'];
            }
            if ($logradouro === null) {
                $errors["{$prefix}.logradouro"] = ['Informe o logradouro do endereço de entrega.'];
            }
            if ($numero === null) {
                $errors["{$prefix}.numero"] = ['Informe o número do endereço de entrega.'];
            }
            if ($bairro === null) {
                $errors["{$prefix}.bairro"] = ['Informe o bairro do endereço de entrega.'];
            }
            if ($municipio === null) {
                $errors["{$prefix}.municipio"] = ['Informe o município do endereço de entrega.'];
            }
            if ($uf === null || strlen($uf) !== 2) {
                $errors["{$prefix}.uf"] = ['Informe a UF (2 letras) do endereço de entrega.'];
            }
            if ($cep === null || strlen($cep) !== 8) {
                $errors["{$prefix}.cep"] = ['Informe o CEP (8 dígitos) do endereço de entrega.'];
            }

            if ($errors !== []) {
                throw ValidationException::withMessages($errors);
            }

            $stamped = $this->applyDistanciaCarro(
                [
                    'distancia_km' => $coords['distancia_km'] ?? null,
                ],
                $row,
                $empresa
            );

            $normalized[] = [
                'apelido' => $apelido,
                'logradouro' => $logradouro,
                'numero' => $numero,
                'complemento' => $complemento,
                'bairro' => $bairro,
                'municipio' => $municipio,
                'uf' => $uf,
                'cep' => $cep,
                'ibge' => $ibge,
                'latitude' => $coords['latitude'],
                'longitude' => $coords['longitude'],
                'distancia_km' => $stamped['distancia_km'] ?? null,
                'distancia_fonte' => $stamped['distancia_fonte'] ?? null,
                'distancia_calculada_em' => $stamped['distancia_calculada_em'] ?? null,
                'distancia_empresa_id' => $stamped['distancia_empresa_id'] ?? null,
                'responsavel_nome' => $responsavelNome,
                'responsavel_telefone' => $responsavelTelefone,
                'responsavel_documento' => $responsavelDocumento,
                'observacoes' => $observacoes,
                'principal' => (bool) ($row['principal'] ?? false),
                'ordem' => (int) ($row['ordem'] ?? $index),
            ];
        }

        return $this->ensureSinglePrincipal($normalized);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function ensureSinglePrincipal(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $principalIndex = null;
        foreach ($rows as $index => $row) {
            if (($row['principal'] ?? false) === true) {
                $principalIndex = $index;
                break;
            }
        }

        if ($principalIndex === null) {
            $principalIndex = 0;
        }

        foreach ($rows as $index => &$row) {
            $row['principal'] = $index === $principalIndex;
            $row['ordem'] = $index;
        }
        unset($row);

        return $rows;
    }

    /**
     * @param  list<array<string, mixed>>  $contatos
     */
    private function syncContatos(Parceiro $parceiro, array $contatos): void
    {
        $parceiro->contatos()->delete();

        foreach ($contatos as $row) {
            $parceiro->contatos()->create($row);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $contas
     */
    private function syncContas(Parceiro $parceiro, array $contas): void
    {
        $parceiro->contasBancarias()->delete();

        foreach ($contas as $row) {
            $parceiro->contasBancarias()->create($row);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $enderecos
     */
    private function syncEnderecosEntrega(Parceiro $parceiro, array $enderecos): void
    {
        $parceiro->enderecosEntrega()->delete();

        foreach ($enderecos as $row) {
            $parceiro->enderecosEntrega()->create($row);
        }
    }

    /**
     * @param  list<array<string, mixed>>  $contatos
     * @param  list<array<string, mixed>>  $contas
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function denormalizeFromRelations(array $contatos, array $contas, array $attributes): array
    {
        $principalContato = collect($contatos)->firstWhere('principal', true) ?? ($contatos[0] ?? null);
        $principalConta = collect($contas)->firstWhere('principal', true) ?? ($contas[0] ?? null);

        if ($principalContato !== null) {
            $attributes['contato_nome'] = $principalContato['nome'] ?? null;
            $attributes['contato_funcao'] = $principalContato['funcao'] ?? null;
            if (! array_key_exists('telefone', $attributes)) {
                $attributes['telefone'] = $principalContato['telefone'] ?? null;
            }
            if (! array_key_exists('whatsapp', $attributes)) {
                $attributes['whatsapp'] = $principalContato['whatsapp'] ?? null;
            }
            if (! array_key_exists('email', $attributes)) {
                $attributes['email'] = $principalContato['email'] ?? null;
            }
        } else {
            $attributes['contato_nome'] = null;
            $attributes['contato_funcao'] = null;
        }

        if ($principalConta !== null) {
            $attributes['banco_codigo'] = $principalConta['banco_codigo'] ?? null;
            $attributes['banco_nome'] = $principalConta['banco_nome'] ?? null;
            $attributes['agencia'] = $principalConta['agencia'] ?? null;
            $attributes['conta'] = $principalConta['conta'] ?? null;
            $attributes['pix_chave'] = $principalConta['pix_chave'] ?? null;
        } else {
            $attributes['banco_codigo'] = null;
            $attributes['banco_nome'] = null;
            $attributes['agencia'] = null;
            $attributes['conta'] = null;
            $attributes['pix_chave'] = null;
        }

        return $attributes;
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function digitsOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $digits = preg_replace('/\D/', '', (string) $value);

        return $digits === '' ? null : $digits;
    }

    private function validatePapeis(array $data): void
    {
        $flags = [
            (bool) ($data['papel_cliente'] ?? false),
            (bool) ($data['papel_fornecedor'] ?? false),
            (bool) ($data['papel_colaborador'] ?? false),
            (bool) ($data['papel_transportadora'] ?? false),
            (bool) ($data['papel_banco'] ?? false),
            (bool) ($data['papel_entidade'] ?? false),
            (bool) ($data['papel_vendedor'] ?? false),
            (bool) ($data['papel_contador'] ?? false),
            // Prospect é papel de domínio (ORCAMENTO_PROSPECT) — não exige CLIENTE.
            (bool) ($data['is_prospect'] ?? false),
        ];

        if (! in_array(true, $flags, true)) {
            throw ValidationException::withMessages([
                'papel' => ['Informe ao menos um papel para o parceiro (ou marque como prospect).'],
            ]);
        }
    }

    private function assertCnpjUnique(int $empresaId, ?string $cnpjCpf, ?int $ignoreId = null): void
    {
        if ($cnpjCpf === null || $cnpjCpf === '') {
            return;
        }

        $digits = preg_replace('/\D/', '', $cnpjCpf);
        $query = Parceiro::withTrashed()
            ->where('empresa_id', $empresaId)
            ->where('cnpj_cpf', $digits);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        if ($query->exists()) {
            throw ValidationException::withMessages([
                'cnpj_cpf' => ['CNPJ/CPF já cadastrado nesta empresa.'],
            ]);
        }
    }
}
