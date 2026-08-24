<?php

namespace Database\Seeders;

use App\Models\BemPatrimonial;
use App\Models\CodigoSequence;
use App\Models\Departamento;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\OrcCatalogoMaquina;
use App\Models\ParametroEmpresa;
use App\Models\Parceiro;
use App\Models\ParceiroContato;
use App\Models\User;
use App\Services\Cadastros\DepartamentoService;
use Illuminate\Database\Seeder;
use App\Support\PlatformRbac;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    private const PERMISSIONS = [
        'empresas.gerir',
        'parametros.gerir',
        'usuarios.gerir',
        'ia.provedores.gerir',
        'fiscal.hubs.gerir',
        'parceiro.ler',
        'parceiro.escrever',
        'parceiro.bancario',
        'credito.escrever',
        'produto.ler',
        'produto.escrever',
        'produto.fiscal',
        'patrimonio.ler',
        'patrimonio.escrever',
        'departamento.ler',
        'departamento.escrever',
        'natureza_gerencial.ler',
        'natureza_gerencial.escrever',
        'orcamento.ler',
        'orcamento.escrever',
        'orcamento.catalogo.gerir',
        // BL-033
        'compras.ler',
        'compras.escrever',
        'estoque.ler',
        'estoque.escrever',
        'estoque.aprovar',
        'estoque.aprovar_gestor',
        'financeiro.ler',
        'financeiro.escrever',
        // BL-044
        'producao.ler',
        'producao.escrever',
        // BL-049
        'faturamento.ler',
        'faturamento.escrever',
        // BL-060
        'expedicao.ler',
        'expedicao.escrever',
        // BL-061
        'comissao.ler',
        'comissao.escrever',
        // BL-079 — matriz de aceite de implantação
        'implantacao.ler',
        'implantacao.validar_dev',
        'implantacao.validar_cliente',
    ];

    private const ROLES = [
        'ADMIN',
        'FISCAL',
        'FINANCEIRO',
        'COMERCIAL',
        'PRODUCAO',
        'COMPRAS',
        'EXPEDICAO',
        'CONSULTA',
    ];

    /** @var array<string, list<string>> */
    private const ROLE_PERMISSIONS = [
        'ADMIN' => self::PERMISSIONS,
        'FISCAL' => [
            'parceiro.ler',
            'produto.ler',
            'produto.fiscal',
            'compras.ler',
            'estoque.ler',
            'faturamento.ler',
            'faturamento.escrever',
            'financeiro.ler',
            'producao.ler',
            'expedicao.ler',
            'comissao.ler',
        ],
        'FINANCEIRO' => [
            'parceiro.ler',
            'parceiro.bancario',
            'credito.escrever',
            'patrimonio.ler',
            'patrimonio.escrever',
            'departamento.ler',
            'departamento.escrever',
            'natureza_gerencial.ler',
            'natureza_gerencial.escrever',
            'financeiro.ler',
            'financeiro.escrever',
            'estoque.ler',
            'compras.ler',
            'producao.ler',
            'faturamento.ler',
            'faturamento.escrever',
            'expedicao.ler',
            'comissao.ler',
            'comissao.escrever',
        ],
        'COMERCIAL' => [
            'parceiro.ler',
            'parceiro.escrever',
            'produto.ler',
            'produto.escrever',
            'departamento.ler',
            'departamento.escrever',
            'patrimonio.ler',
            'patrimonio.escrever',
            'orcamento.ler',
            'orcamento.escrever',
            'orcamento.catalogo.gerir',
            'financeiro.ler',
            'producao.ler',
            'faturamento.ler',
            'faturamento.escrever',
            'expedicao.ler',
            'comissao.ler',
        ],
        'PRODUCAO' => [
            'produto.ler',
            'patrimonio.ler',
            'compras.ler',
            'estoque.ler',
            'estoque.escrever',
            'producao.ler',
            'producao.escrever',
            'faturamento.ler',
            'expedicao.ler',
            'expedicao.escrever',
        ],
        'COMPRAS' => [
            'parceiro.ler',
            'parceiro.escrever',
            'produto.ler',
            'produto.escrever',
            'patrimonio.ler',
            'departamento.ler',
            'compras.ler',
            'compras.escrever',
            'estoque.ler',
            'estoque.escrever',
        ],
        'EXPEDICAO' => [
            'parceiro.ler',
            'produto.ler',
            'producao.ler',
            'faturamento.ler',
            'expedicao.ler',
            'expedicao.escrever',
        ],
        'CONSULTA' => [
            'parceiro.ler',
            'produto.ler',
            'orcamento.ler',
            'patrimonio.ler',
            'departamento.ler',
            'natureza_gerencial.ler',
            'compras.ler',
            'estoque.ler',
            'financeiro.ler',
            'producao.ler',
            'faturamento.ler',
            'expedicao.ler',
            'comissao.ler',
            'implantacao.ler',
        ],
    ];

    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // FLEXORC: seed de plataforma (RBAC + catálogos globais). Sem demo RLP /
        // EMP-00001 — o primeiro USR nasce via plataforma:criar-conta (ou flag lab
        // de alta pública) / plataforma:alinhar-primeiro-cadastro. Catálogo ORC/facas nascem por EMP no onboarding.
        $this->seedRolesAndPermissions();
        $this->seedGlobalSequences();
        $this->call(FiscalCatalogSeeder::class);
        $this->call(ProdutoGrupoSeeder::class);
        $this->call(NaturezaGerencialSeeder::class);
        app(\App\Services\Cadastros\ProdutoGrupoService::class)->backfillProdutos();
    }

    /** Sequências prontas para o primeiro /cadastro (USR-00001 / EMP-00001). */
    private function seedGlobalSequences(): void
    {
        CodigoSequence::query()->firstOrCreate(
            ['empresa_id' => null, 'prefixo' => 'USR'],
            ['proximo' => 1]
        );
        CodigoSequence::query()->firstOrCreate(
            ['empresa_id' => null, 'prefixo' => 'EMP'],
            ['proximo' => 1]
        );
        CodigoSequence::query()->firstOrCreate(
            ['empresa_id' => null, 'prefixo' => 'CFIN'],
            ['proximo' => 1]
        );
    }

    private function seedRolesAndPermissions(): void
    {
        foreach (self::PERMISSIONS as $permission) {
            Permission::query()->firstOrCreate(
                ['name' => $permission, 'guard_name' => 'web'],
                ['name' => $permission, 'guard_name' => 'web']
            );
        }

        foreach (self::ROLES as $roleName) {
            $role = Role::query()->firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'web'],
                ['name' => $roleName, 'guard_name' => 'web']
            );

            $role->syncPermissions(self::ROLE_PERMISSIONS[$roleName] ?? []);
        }

        PlatformRbac::ensure();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    private function seedEmpresas(): Empresa
    {
        $emp1 = Empresa::withTrashed()->firstOrCreate(
            ['codigo' => 'EMP-00001'],
            [
                'cnpj' => '01423183000110',
                'razao_social' => 'RLP ETIQUETAS AUTO ADESIVOS LTDA',
                'nome_fantasia' => 'RETA ETIQUETAS',
                'ie' => '7023251210034',
                'ie_status' => 'OK',
                'regime' => 'SIMPLES_NACIONAL',
                'crt' => 1,
                'regime_desde' => now()->toDateString(),
                'cnae' => '1813099',
                'email' => 'contato@rlp.com.br',
                'telefone' => '3432383955',
                'logradouro' => 'MARCOS DE FREITAS COSTA',
                'numero' => '385',
                'bairro' => 'DANIEL FONSECA',
                'municipio' => 'UBERLANDIA',
                'uf' => 'MG',
                'cep' => '38400328',
                'ibge' => '3170206',
                'venda_ativa' => true,
                'estoque_ativo' => true,
                'logo_path' => '/branding/logo.png',
                'situacao' => 'ATIVA',
                'cadastro_fiscal_completo' => true,
            ]
        );

        if ($emp1->trashed()) {
            $emp1->restore();
        }

        $emp1->forceFill([
            'origem_latitude' => '-18.9219317',
            'origem_longitude' => '-48.2943462',
        ])->save();

        $emp2 = Empresa::withTrashed()->firstOrCreate(
            ['codigo' => 'EMP-00002'],
            [
                'cnpj' => '58820046000137',
                'razao_social' => 'ADESIVOS, ETIQUETAS E ROTULOS UDI LTDA',
                'nome_fantasia' => 'UDI ETIQUETAS',
                'regime' => 'SIMPLES_NACIONAL',
                'crt' => 1,
                'regime_desde' => now()->toDateString(),
                'cnae' => '1813099',
                'telefone' => '3491807742',
                'logradouro' => 'SOSTHENES GUIMARAES',
                'numero' => '65',
                'bairro' => 'MORADA DA COLINA',
                'municipio' => 'UBERLANDIA',
                'uf' => 'MG',
                'cep' => '38411160',
                'ibge' => '3170206',
                'venda_ativa' => false,
                'estoque_ativo' => false,
                'situacao' => 'ATIVA',
                'cadastro_fiscal_completo' => false,
            ]
        );

        if ($emp2->trashed()) {
            $emp2->restore();
        }

        CodigoSequence::query()->firstOrCreate(
            ['empresa_id' => null, 'prefixo' => 'EMP'],
            ['proximo' => 3]
        );

        $this->seedContasFinanceiras($emp1);
        $this->seedContasFinanceiras($emp2);

        return $emp1;
    }

    /**
     * Conta financeira por EMP — necessária para o PIX do sinal. Não inventa agência/conta.
     */
    private function seedContasFinanceiras(Empresa $empresa): void
    {
        if (EmpresaContaFinanceira::withTrashed()->where('empresa_id', $empresa->id)->exists()) {
            return;
        }

        $codigo = app(\App\Services\Codigo\CodigoGenerator::class)->nextCode(null, 'CFIN');

        EmpresaContaFinanceira::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'tipo' => EmpresaContaFinanceira::TIPO_BANCO,
            'descricao' => 'Conta principal (PIX / sinal)',
            'tipo_conta' => 'CORRENTE',
            'pix_chave' => null,
            'principal' => true,
            'ativa' => true,
            'ordem' => 0,
            'observacao' => 'Preencher agência/conta/PIX na ficha da empresa',
        ]);
    }

    private function seedParametros(Empresa $emp1, Empresa $emp2): void
    {
        $parametrosEmp1 = [
            ['chave' => 'empresa_default', 'valor' => 'EMP-00001', 'status' => 'APROVADO'],
            ['chave' => 'emp_00002_venda_habilitada', 'valor' => 'NÃO', 'status' => 'APROVADO'],
            ['chave' => 'lai_no_erp', 'valor' => 'NÃO', 'status' => 'APROVADO'],
            ['chave' => 'valor_minimo_capitalizar_bem', 'valor' => '1000', 'status' => 'APROVADO'],
            ['chave' => 'politica_nf_antes_expedir', 'valor' => 'SIM', 'status' => 'APROVADO'],
        ];

        foreach ($parametrosEmp1 as $param) {
            ParametroEmpresa::query()->firstOrCreate(
                ['empresa_id' => $emp1->id, 'chave' => $param['chave']],
                ['valor' => $param['valor'], 'status' => $param['status'], 'versao' => 1]
            );
        }

        foreach (['emp_00002_venda_habilitada', 'lai_no_erp'] as $chave) {
            $base = collect($parametrosEmp1)->firstWhere('chave', $chave);
            ParametroEmpresa::query()->firstOrCreate(
                ['empresa_id' => $emp2->id, 'chave' => $chave],
                ['valor' => $base['valor'], 'status' => $base['status'], 'versao' => 1]
            );
        }
    }

    private function seedColaboradoresAndUsers(Empresa $emp1, Empresa $emp2): void
    {
        $adminPassword = (string) config('erp.admin_password', 'Admin@123');
        $demoPassword = (string) config('erp.demo_password', 'Demo@123');
        $adminEmail = (string) config('erp.admin_email', 'admin@rlp.com.br');

        $users = [
            ['codigo' => 'PAR-00001', 'usr' => 'USR-00001', 'email' => $adminEmail, 'name' => 'Administrador RLP', 'password' => $adminPassword, 'role' => 'ADMIN', 'cargo' => 'TI'],
            ['codigo' => 'PAR-00002', 'usr' => 'USR-00002', 'email' => 'comercial@rlp.com.br', 'name' => 'Comercial RLP', 'password' => $demoPassword, 'role' => 'COMERCIAL', 'cargo' => 'Comercial'],
            ['codigo' => 'PAR-00003', 'usr' => 'USR-00003', 'email' => 'financeiro@rlp.com.br', 'name' => 'Financeiro RLP', 'password' => $demoPassword, 'role' => 'FINANCEIRO', 'cargo' => 'Financeiro'],
            ['codigo' => 'PAR-00004', 'usr' => 'USR-00004', 'email' => 'fiscal@rlp.com.br', 'name' => 'Fiscal RLP', 'password' => $demoPassword, 'role' => 'FISCAL', 'cargo' => 'Fiscal'],
            ['codigo' => 'PAR-00005', 'usr' => 'USR-00005', 'email' => 'producao@rlp.com.br', 'name' => 'Producao RLP', 'password' => $demoPassword, 'role' => 'PRODUCAO', 'cargo' => 'Producao'],
            ['codigo' => 'PAR-00006', 'usr' => 'USR-00006', 'email' => 'compras@rlp.com.br', 'name' => 'Compras RLP', 'password' => $demoPassword, 'role' => 'COMPRAS', 'cargo' => 'Compras'],
            ['codigo' => 'PAR-00007', 'usr' => 'USR-00007', 'email' => 'consulta@rlp.com.br', 'name' => 'Consulta RLP', 'password' => $demoPassword, 'role' => 'CONSULTA', 'cargo' => 'Consulta'],
        ];

        foreach ($users as $index => $spec) {
            $parceiro = Parceiro::query()->firstOrCreate(
                ['empresa_id' => $emp1->id, 'codigo' => $spec['codigo']],
                [
                    'tipo_pessoa' => 'PJ',
                    'razao_social' => $spec['name'],
                    'nome_fantasia' => $spec['name'],
                    'papel_colaborador' => true,
                    'cargo' => $spec['cargo'],
                    'departamento' => 'Operacional',
                    'situacao' => 'ATIVO',
                    'cadastro_fiscal_completo' => true,
                ]
            );

            $user = User::query()->withTrashed()->firstOrCreate(
                ['email' => $spec['email']],
                [
                    'name' => $spec['name'],
                    'password' => $spec['password'],
                    'codigo' => $spec['usr'],
                    'ativo' => true,
                    'parceiro_id' => $parceiro->id,
                    'empresa_default_id' => $emp1->id,
                ]
            );

            if ($user->trashed()) {
                $user->restore();
            }

            // Com SEED_ON_BOOT, garante senha/ativo conhecidos mesmo se o usuário já existia.
            $user->update([
                'name' => $spec['name'],
                'password' => $spec['password'],
                'codigo' => $spec['usr'],
                'parceiro_id' => $parceiro->id,
                'empresa_default_id' => $emp1->id,
                'ativo' => true,
            ]);

            $user->syncRoles([$spec['role']]);

            $user->empresas()->syncWithoutDetaching([
                $emp1->id => ['padrao' => true],
            ]);

            if ($spec['role'] === 'ADMIN') {
                $user->empresas()->syncWithoutDetaching([
                    $emp2->id => ['padrao' => false],
                ]);
            }
        }

        CodigoSequence::query()->firstOrCreate(
            ['empresa_id' => $emp1->id, 'prefixo' => 'PAR'],
            ['proximo' => 8]
        );
        CodigoSequence::query()->firstOrCreate(
            ['empresa_id' => null, 'prefixo' => 'USR'],
            ['proximo' => 8]
        );
    }

    private function seedDepartamentos(Empresa $emp1, Empresa $emp2): void
    {
        $service = app(DepartamentoService::class);
        $service->ensureCanonicos($emp1);
        $service->ensureCanonicos($emp2);

        $operacional = Departamento::query()
            ->where('empresa_id', $emp1->id)
            ->whereRaw('LOWER(nome) = ?', ['operacional'])
            ->first();

        if ($operacional) {
            Parceiro::query()
                ->where('empresa_id', $emp1->id)
                ->where('papel_colaborador', true)
                ->where(function ($q) use ($operacional) {
                    $q->whereNull('departamento_id')
                        ->orWhere('departamento', 'Operacional');
                })
                ->update([
                    'departamento_id' => $operacional->id,
                    'departamento' => $operacional->nome,
                ]);
        }
    }

    private function seedCliente(Empresa $emp1): void
    {
        $vendedor = Parceiro::query()->firstOrCreate(
            ['empresa_id' => $emp1->id, 'codigo' => 'PAR-00011'],
            [
                'tipo_pessoa' => 'PF',
                'razao_social' => 'VENDEDOR EXEMPLO',
                'nome_fantasia' => 'Vendedor Exemplo',
                'papel_vendedor' => true,
                'situacao' => 'ATIVO',
                'is_prospect' => false,
                'comissao_percentual' => '3.0000',
            ]
        );
        if (! $vendedor->papel_vendedor) {
            $vendedor->papel_vendedor = true;
            $vendedor->comissao_percentual = $vendedor->comissao_percentual ?: '3.0000';
            $vendedor->save();
        }

        $cliente = Parceiro::query()->firstOrCreate(
            ['empresa_id' => $emp1->id, 'codigo' => 'PAR-00010'],
            [
                'tipo_pessoa' => 'PJ',
                'cnpj_cpf' => '11222333000181',
                'razao_social' => 'CLIENTE EXEMPLO LTDA',
                'nome_fantasia' => 'Cliente Exemplo',
                'papel_cliente' => true,
                'situacao' => 'ATIVO',
                'cadastro_fiscal_completo' => true,
                'limite_credito' => '50000.00',
                'credito_utilizado' => '0.00',
                'vendedor_parceiro_id' => $vendedor->id,
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
                'logradouro' => 'Av. Brasil',
                'numero' => '500',
                'bairro' => 'Centro',
                'municipio' => 'Uberlandia',
                'uf' => 'MG',
                'cep' => '38400100',
                'email' => 'compras@cliente-exemplo.com.br',
                'whatsapp' => '34988880010',
                'contato_nome' => 'Compras Exemplo',
            ]
        );
        if (! $cliente->vendedor_parceiro_id) {
            $cliente->vendedor_parceiro_id = $vendedor->id;
            $cliente->save();
        }

        ParceiroContato::query()->firstOrCreate(
            ['parceiro_id' => $cliente->id, 'principal' => true],
            [
                'nome' => 'Compras Exemplo',
                'funcao' => 'Compras',
                'whatsapp' => '34988880010',
                'email' => 'compras@cliente-exemplo.com.br',
                'autorizado_aprovar' => true,
                'ordem' => 0,
            ]
        );

        // PAR-00010/00011 são códigos explícitos do seed — sequência precisa ficar à frente.
        $seq = CodigoSequence::query()->firstOrCreate(
            ['empresa_id' => $emp1->id, 'prefixo' => 'PAR'],
            ['proximo' => 12]
        );
        if ((int) $seq->proximo < 12) {
            $seq->update(['proximo' => 12]);
        }
    }

    /**
     * Bens demo — ativos físicos. Uma BEM por grupo canônico do ORC (G10) + 1 informático.
     * Grupo hora-máquina é ponte opcional (tarifas), não o cadastro do bem.
     * Idempotente por codigo; não inventa NF/série/valor.
     */
    private function seedBensPatrimoniais(Empresa $emp1): void
    {
        $grupoId = static fn (string $nome): ?int => OrcCatalogoMaquina::query()
            ->where('nome', $nome)
            ->value('id');

        $depId = static function (string $nome) use ($emp1): ?int {
            $id = Departamento::query()
                ->where('empresa_id', $emp1->id)
                ->whereRaw('LOWER(nome) = ?', [mb_strtolower($nome)])
                ->value('id');

            if ($id) {
                return (int) $id;
            }

            $created = app(DepartamentoService::class)->create($emp1, [
                'nome' => $nome,
                'ativo' => true,
            ]);

            return (int) $created['id'];
        };

        $bens = [
            [
                'codigo' => 'BEM-00001',
                'descricao' => 'Impressora flexográfica Betaflex',
                'categoria' => BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA,
                'marca' => 'Betaflex',
                'modelo' => null,
                'numero_serie' => null,
                'local' => 'Produção',
                'departamento_id' => $depId('Produção'),
                'responsavel' => 'Produção',
                'status' => BemPatrimonial::STATUS_ATIVO,
                'orc_catalogo_maquina_id' => $grupoId('BETA'),
                'capitalizado' => true,
                'observacao' => 'Máquina física · grupo ORC BETA. Série/NF a informar na implantação.',
            ],
            [
                'codigo' => 'BEM-00002',
                'descricao' => 'Impressora Reflexo 160',
                'categoria' => BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA,
                'marca' => 'Reflexo',
                'modelo' => '160',
                'numero_serie' => null,
                'local' => 'Produção',
                'departamento_id' => $depId('Produção'),
                'responsavel' => 'Produção',
                'status' => BemPatrimonial::STATUS_ATIVO,
                'orc_catalogo_maquina_id' => $grupoId('160'),
                'capitalizado' => true,
                'observacao' => 'Máquina física · grupo ORC 160. Série/NF a informar na implantação.',
            ],
            [
                'codigo' => 'BEM-00003',
                'descricao' => 'Nobreak / UPS sala TI',
                'categoria' => BemPatrimonial::CATEGORIA_INFORMATICA,
                'marca' => null,
                'modelo' => null,
                'numero_serie' => null,
                'local' => 'TI / Escritório',
                'departamento_id' => $depId('TI / Escritório'),
                'responsavel' => 'TI',
                'status' => BemPatrimonial::STATUS_ATIVO,
                'orc_catalogo_maquina_id' => null,
                'capitalizado' => true,
                'observacao' => 'Equipamento de infraestrutura — sem vínculo com catálogo ORC',
            ],
            [
                'codigo' => 'BEM-00004',
                'descricao' => 'Impressora Reflexo 250',
                'categoria' => BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA,
                'marca' => 'Reflexo',
                'modelo' => '250',
                'numero_serie' => null,
                'local' => 'Produção',
                'departamento_id' => $depId('Produção'),
                'responsavel' => 'Produção',
                'status' => BemPatrimonial::STATUS_ATIVO,
                'orc_catalogo_maquina_id' => $grupoId('250'),
                'capitalizado' => true,
                'observacao' => 'Máquina física · grupo ORC 250 (alias REFLEXO 250). Série/NF a informar na implantação.',
            ],
            [
                'codigo' => 'BEM-00005',
                'descricao' => 'Impressora Etirama',
                'categoria' => BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA,
                'marca' => 'Etirama',
                'modelo' => null,
                'numero_serie' => null,
                'local' => 'Produção',
                'departamento_id' => $depId('Produção'),
                'responsavel' => 'Produção',
                'status' => BemPatrimonial::STATUS_ATIVO,
                'orc_catalogo_maquina_id' => $grupoId('ETIRAMA'),
                'capitalizado' => true,
                'observacao' => 'Máquina física · grupo ORC ETIRAMA. Série/NF a informar na implantação.',
            ],
            [
                'codigo' => 'BEM-00006',
                'descricao' => 'Impressora Batida',
                'categoria' => BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA,
                'marca' => 'Batida',
                'modelo' => null,
                'numero_serie' => null,
                'local' => 'Produção',
                'departamento_id' => $depId('Produção'),
                'responsavel' => 'Produção',
                'status' => BemPatrimonial::STATUS_ATIVO,
                'orc_catalogo_maquina_id' => $grupoId('BATIDA'),
                'capitalizado' => true,
                'observacao' => 'Máquina física · grupo ORC BATIDA (até 2 cores no motor ORC). Série/NF a informar na implantação.',
            ],
            [
                'codigo' => 'BEM-00007',
                'descricao' => 'Impressora Modular SPX',
                'categoria' => BemPatrimonial::CATEGORIA_MAQUINA_GRAFICA,
                'marca' => 'Modular',
                'modelo' => 'SPX',
                'numero_serie' => null,
                'local' => 'Produção',
                'departamento_id' => $depId('Produção'),
                'responsavel' => 'Produção',
                'status' => BemPatrimonial::STATUS_ATIVO,
                'orc_catalogo_maquina_id' => $grupoId('MODULAR'),
                'capitalizado' => true,
                'observacao' => 'Máquina física · grupo ORC MODULAR (alias MODULAR SPX). Série/NF a informar na implantação.',
            ],
        ];

        foreach ($bens as $data) {
            BemPatrimonial::withTrashed()->firstOrCreate(
                ['codigo' => $data['codigo']],
                [
                    'empresa_id' => $emp1->id,
                    ...$data,
                ]
            );
        }

        CodigoSequence::query()->updateOrCreate(
            ['empresa_id' => null, 'prefixo' => 'BEM'],
            ['proximo' => 8]
        );
    }
}
