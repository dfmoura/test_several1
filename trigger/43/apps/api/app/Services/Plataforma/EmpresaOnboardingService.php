<?php

namespace App\Services\Plataforma;

use App\Models\Departamento;
use App\Models\ContaAtivacao;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\ParametroEmpresa;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\User;
use App\Services\Cadastros\BemPatrimonialService;
use App\Services\Cadastros\DepartamentoService;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Comercial\FacasMapaService;
use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use App\Services\Consulta\BrasilApiClient;
use App\Services\Consulta\GeoEnderecoService;
use App\Services\Financeiro\AdiantamentoService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

/**
 * Alta pública: 1) conta de acesso (USR)  2) mensalidade da conta FLEXORC.
 * EMP (até 3) entra depois, logado, pelo master. Isolamento: empresa_id + empresa_user.
 */
class EmpresaOnboardingService
{
    public static function maxEmpresasPorConta(): int
    {
        return ContaAtivacao::maxEmpresasPorConta();
    }

    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly OrcamentoCatalogoAdminService $catalogo,
        private readonly FacasMapaService $facas,
        private readonly BemPatrimonialService $patrimonio,
        private readonly DepartamentoService $departamentos,
        private readonly EmpresaAtivacaoService $ativacao,
        private readonly NaturezaGerencialService $naturezas,
        private readonly BrasilApiClient $brasilApiClient,
        private readonly GeoEnderecoService $geoEnderecoService,
    ) {}

    /**
     * História 1 — só a conta de acesso. Sem EMP, sem catálogo, sem cobrança.
     *
     * @param  array<string, mixed>  $data
     * @return array{user: User, token: string}
     */
    public function registrarConta(array $data): array
    {
        $email = strtolower(trim((string) $data['admin_email']));
        if (User::withTrashed()->where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'admin_email' => 'Este e-mail já está em uso.',
            ]);
        }

        return DB::transaction(function () use ($data, $email) {
            $user = User::query()->create([
                'name' => $data['admin_name'],
                'email' => $email,
                'password' => $data['admin_password'],
                'codigo' => $this->codigos->nextCode(null, 'USR'),
                'ativo' => true,
            ]);

            $admin = Role::query()->where('name', 'ADMIN')->where('guard_name', 'web')->first();
            if ($admin) {
                $user->assignRole($admin);
            }

            $this->ativacao->provisionarConta($user);

            $token = $user->createToken('api')->plainTextToken;

            return compact('user', 'token');
        });
    }

    /**
     * História 2 — EMP na conta autenticada (primeira ou seguinte, com vínculo).
     *
     * @param  array<string, mixed>  $data
     * @return array{empresa: Empresa, user: User}
     */
    public function abrirEmpresa(User $user, array $data, bool $completarOrigem = true): array
    {
        if (! $user->can('empresas.gerir') && ! $user->hasRole('ADMIN')) {
            throw ValidationException::withMessages([
                'empresa' => 'Somente o administrador da conta pode cadastrar empresas.',
            ]);
        }

        $max = ContaAtivacao::maxEmpresasPorConta();
        if ($user->empresas()->count() >= $max) {
            throw ValidationException::withMessages([
                'empresa' => "Esta conta admite no máximo {$max} empresas.",
            ]);
        }

        $cnpj = preg_replace('/\D/', '', (string) ($data['cnpj'] ?? '')) ?? '';
        if (strlen($cnpj) !== 14) {
            throw ValidationException::withMessages(['cnpj' => 'CNPJ deve conter 14 dígitos.']);
        }

        if (Empresa::withTrashed()->where('cnpj', $cnpj)->exists()) {
            $existente = Empresa::withTrashed()->where('cnpj', $cnpj)->first();
            $codigo = $existente?->codigo ?: '';
            $nome = $existente?->razao_social ?: '';
            $demo = in_array($codigo, ['EMP-00001', 'EMP-00002'], true);

            throw ValidationException::withMessages([
                'cnpj' => $demo
                    ? "Este CNPJ já é o demo {$codigo} ({$nome}). Use outro CNPJ para abrir uma empresa nova."
                    : "Este CNPJ já possui empresa nesta plataforma ({$codigo}).",
            ]);
        }

        $out = DB::transaction(function () use ($user, $data, $cnpj) {
            $email = $user->email;
            $primeira = ! $user->empresas()->exists();

            $empresa = Empresa::query()->create([
                'codigo' => $this->codigos->nextCode(null, 'EMP'),
                'cnpj' => $cnpj,
                'razao_social' => $data['razao_social'],
                'nome_fantasia' => $data['nome_fantasia'] ?? $data['razao_social'],
                'ie' => $data['ie'] ?? null,
                'regime' => $data['regime'] ?? 'SIMPLES_NACIONAL',
                'crt' => (int) ($data['crt'] ?? 1),
                'email' => $data['email'] ?? $email,
                'telefone' => $data['telefone'] ?? null,
                'logradouro' => $data['logradouro'] ?? null,
                'numero' => $data['numero'] ?? null,
                'complemento' => $data['complemento'] ?? null,
                'bairro' => $data['bairro'] ?? null,
                'municipio' => $data['municipio'],
                'uf' => strtoupper((string) $data['uf']),
                'cep' => preg_replace('/\D/', '', (string) ($data['cep'] ?? '')) ?: null,
                'ibge' => $data['ibge'] ?? null,
                'venda_ativa' => true,
                'estoque_ativo' => false,
                'situacao' => 'ATIVA',
                'cadastro_fiscal_completo' => false,
            ]);

            $this->naturezas->seedCatalog();
            $this->seedParametrosSinal($empresa);
            $this->seedContaFinanceira($empresa);
            $this->catalogo->seedFromJson(null, false, $empresa->id);
            $this->facas->seedFromJson(null, false, $empresa->id);
            $this->departamentos->ensureCanonicos($empresa);
            $this->patrimonio->seedModeloInicial($empresa);
            $this->ativacao->provisionar($empresa);
            $this->ativacao->herdarPagamentoDaConta($user, $empresa);

            $admDepId = Departamento::query()
                ->where('empresa_id', $empresa->id)
                ->whereRaw('LOWER(nome) = ?', [mb_strtolower('Administrativo')])
                ->value('id');

            $parceiro = Parceiro::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $this->codigos->nextCode($empresa->id, 'PAR'),
                'tipo_pessoa' => 'PF',
                'razao_social' => $user->name,
                'nome_fantasia' => $user->name,
                'papel_colaborador' => true,
                'cargo' => 'Administrador',
                'departamento_id' => $admDepId,
                'departamento' => 'Administrativo',
                'email' => $email,
                'telefone' => $data['telefone'] ?? null,
                'municipio' => $data['municipio'],
                'uf' => strtoupper((string) $data['uf']),
                'situacao' => 'ATIVO',
                'cadastro_fiscal_completo' => false,
            ]);

            ParceiroContato::query()->create([
                'parceiro_id' => $parceiro->id,
                'nome' => $user->name,
                'email' => $email,
                'whatsapp' => $data['telefone'] ?? null,
                'funcao' => 'Administrador',
                'autorizado_aprovar' => false,
                'principal' => true,
            ]);

            $user->empresas()->attach($empresa->id, ['padrao' => $primeira]);

            $updates = ['empresa_default_id' => $user->empresa_default_id ?? $empresa->id];
            if ($user->parceiro_id === null) {
                $updates['parceiro_id'] = $parceiro->id;
            }
            $user->update($updates);

            return ['empresa' => $empresa, 'user' => $user->fresh(['empresas', 'roles'])];
        });

        if ($completarOrigem) {
            $out['empresa'] = $this->completarEnderecoEOrigem($out['empresa'], $cnpj);
        }

        return $out;
    }

    /**
     * Atalho compatível: conta + primeira empresa na mesma requisição.
     *
     * @param  array<string, mixed>  $data
     * @return array{empresa: Empresa, user: User, token: string}
     */
    public function registrar(array $data): array
    {
        $cnpj = preg_replace('/\D/', '', (string) ($data['cnpj'] ?? '')) ?? '';

        $out = DB::transaction(function () use ($data) {
            $conta = $this->registrarConta($data);
            $emp = $this->abrirEmpresa($conta['user'], $data, false);

            return [
                'empresa' => $emp['empresa'],
                'user' => $emp['user'],
                'token' => $conta['token'],
            ];
        });

        $out['empresa'] = $this->completarEnderecoEOrigem($out['empresa'], $cnpj);

        return $out;
    }

    /**
     * Depois do commit: completa endereço pela Receita se faltar rua/CEP,
     * depois geocodifica a planta (Nominatim → CEP v2). Falha não desfaz a alta.
     */
    private function completarEnderecoEOrigem(Empresa $empresa, string $cnpj): Empresa
    {
        try {
            $this->preencherEnderecoDaReceita($empresa, $cnpj);
            $empresa->refresh();

            if ($empresa->temOrigemOperacional()) {
                return $empresa;
            }

            $geo = $this->geoEnderecoService->resolver(
                (string) ($empresa->logradouro ?? ''),
                (string) ($empresa->numero ?? ''),
                (string) ($empresa->municipio ?? ''),
                (string) ($empresa->uf ?? ''),
                $empresa->cep !== null ? (string) $empresa->cep : null,
            );

            if ($geo['latitude'] && $geo['longitude']) {
                $empresa->update([
                    'origem_latitude' => $geo['latitude'],
                    'origem_longitude' => $geo['longitude'],
                ]);
            }
        } catch (\Throwable) {
            // Alta já commitada. Origem pode ser localizada depois na ficha.
        }

        return $empresa->fresh() ?? $empresa;
    }

    private function preencherEnderecoDaReceita(Empresa $empresa, string $cnpj): void
    {
        $logradouro = trim((string) ($empresa->logradouro ?? ''));
        $cep = preg_replace('/\D/', '', (string) ($empresa->cep ?? '')) ?? '';
        if ($logradouro !== '' && strlen($cep) === 8) {
            return;
        }

        try {
            $receita = $this->brasilApiClient->getCnpj($cnpj);
        } catch (\Throwable) {
            return;
        }

        $patch = [];
        foreach (['logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'cep', 'ibge', 'telefone'] as $campo) {
            $atual = trim((string) ($empresa->{$campo} ?? ''));
            $vindo = trim((string) ($receita[$campo] ?? ''));
            if ($atual !== '' || $vindo === '') {
                continue;
            }
            if ($campo === 'cep') {
                $digits = preg_replace('/\D/', '', $vindo) ?? '';
                $patch[$campo] = strlen($digits) === 8 ? $digits : null;
                continue;
            }
            $patch[$campo] = $vindo;
        }

        $ufAtual = strtoupper(trim((string) ($empresa->uf ?? '')));
        $ufReceita = strtoupper(trim((string) ($receita['uf'] ?? '')));
        if ($ufAtual === '' && strlen($ufReceita) === 2) {
            $patch['uf'] = $ufReceita;
        }

        if ($patch !== []) {
            $empresa->update($patch);
        }
    }

    private function seedParametrosSinal(Empresa $empresa): void
    {
        $params = [
            [AdiantamentoService::PARAM_OBRIGATORIO, 'SIM'],
            [AdiantamentoService::PARAM_PERCENTUAL, '50'],
            ['lai_no_erp', 'NÃO'],
        ];
        foreach ($params as [$chave, $valor]) {
            ParametroEmpresa::query()->firstOrCreate(
                ['empresa_id' => $empresa->id, 'chave' => $chave],
                ['valor' => $valor, 'status' => 'APROVADO', 'versao' => 1]
            );
        }
    }

    private function seedContaFinanceira(Empresa $empresa): void
    {
        EmpresaContaFinanceira::query()->create([
            'codigo' => $this->codigos->nextCode(null, 'CFIN'),
            'empresa_id' => $empresa->id,
            'tipo' => EmpresaContaFinanceira::TIPO_BANCO,
            'descricao' => 'Conta principal (PIX / sinal)',
            'principal' => true,
            'ativa' => true,
            'ordem' => 0,
            'observacao' => 'Informe a chave PIX desta empresa para cobrar o sinal dos orçamentos.',
        ]);
    }
}
