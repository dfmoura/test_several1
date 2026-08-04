<?php

namespace Database\Seeders;

use App\Models\CodigoSequence;
use App\Models\Empresa;
use App\Models\ParametroEmpresa;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Database\Seeder;
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
        'parceiro.ler',
        'parceiro.escrever',
        'parceiro.bancario',
        'credito.escrever',
        'produto.ler',
        'produto.escrever',
        'produto.fiscal',
        'orcamento.ler',
        'orcamento.escrever',
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
        'FISCAL' => ['parceiro.ler', 'produto.ler', 'produto.fiscal'],
        'FINANCEIRO' => ['parceiro.ler', 'parceiro.bancario', 'credito.escrever'],
        'COMERCIAL' => [
            'parceiro.ler',
            'parceiro.escrever',
            'produto.ler',
            'produto.escrever',
            'orcamento.ler',
            'orcamento.escrever',
        ],
        'PRODUCAO' => ['produto.ler'],
        'COMPRAS' => ['parceiro.ler', 'parceiro.escrever', 'produto.ler', 'produto.escrever'],
        'EXPEDICAO' => ['parceiro.ler', 'produto.ler'],
        'CONSULTA' => ['parceiro.ler', 'produto.ler', 'orcamento.ler'],
    ];

    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->seedRolesAndPermissions();
        $emp1 = $this->seedEmpresas();
        $emp2 = Empresa::query()->where('codigo', 'EMP-00002')->firstOrFail();

        $this->seedParametros($emp1, $emp2);
        $this->seedColaboradoresAndUsers($emp1, $emp2);
        $this->call(FiscalCatalogSeeder::class);
        $this->call(ProdutoGrupoSeeder::class);
        $this->seedProdutos($emp1);
        // Garante vínculo grupo_id nos produtos seedados após o cadastro.
        app(\App\Services\Cadastros\ProdutoGrupoService::class)->backfillProdutos();

        $this->seedCliente($emp1);
        $this->seedCodigoSequences($emp1);
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

        return $emp1;
    }

    private function seedParametros(Empresa $emp1, Empresa $emp2): void
    {
        $parametrosEmp1 = [
            ['chave' => 'empresa_default', 'valor' => 'EMP-00001', 'status' => 'APROVADO'],
            ['chave' => 'emp_00002_venda_habilitada', 'valor' => 'NÃO', 'status' => 'APROVADO'],
            ['chave' => 'lai_no_erp', 'valor' => 'NÃO', 'status' => 'APROVADO'],
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

    private function seedProdutos(Empresa $emp1): void
    {
        $grupoIds = \App\Models\ProdutoGrupo::query()->pluck('id', 'codigo');

        $produtos = [
            [
                'codigo' => 'MP-PAP-001',
                'familia' => 'MP',
                'grupo' => 'MP-PAP',
                'grupo_id' => $grupoIds['MP-PAP'] ?? null,
                'descricao_fiscal' => 'PAPEL COUCHE AUTOADESIVO BOBINA',
                'ncm' => '48114190',
                'tipo_item_sped' => '01',
                'unidade_comercial' => 'KG',
                'unidade_interna' => 'M2',
                'fator_conversao' => '0.0450000000',
                'cfop_entrada_padrao' => '2101',
                'atributos' => ['grupo_estoque' => '10'],
            ],
            [
                'codigo' => 'PA-ETQ-001',
                'familia' => 'PA',
                'grupo' => 'PA-ETQ',
                'grupo_id' => $grupoIds['PA-ETQ'] ?? null,
                'descricao_fiscal' => 'ETIQUETAS BOPP',
                'descricao_comercial' => 'Etiquetas em filme plástico autoadesivo',
                'ncm' => '39191090',
                'tipo_item_sped' => '04',
                'unidade_comercial' => 'MIL',
                'csosn' => '102',
                'cfop_saida_padrao' => '5101',
                'preco_tabela' => '180.000000',
                'atributos' => ['grupo_estoque' => '80'],
            ],
            [
                'codigo' => 'REV-RIB-001',
                'familia' => 'REV',
                'grupo' => 'REV-RIB',
                'grupo_id' => $grupoIds['REV-RIB'] ?? null,
                'descricao_fiscal' => 'RIBBON CERA 110x300',
                'ncm' => '96121000',
                'tipo_item_sped' => '00',
                'unidade_comercial' => 'UN',
                'csosn' => '102',
                'cfop_entrada_padrao' => '2102',
                'cfop_saida_padrao' => '5102',
                'preco_tabela' => '45.000000',
                'atributos' => ['grupo_estoque' => '60'],
            ],
            [
                'codigo' => 'SVC-001',
                'familia' => 'SVC',
                'grupo' => 'SVC',
                'grupo_id' => $grupoIds['SVC'] ?? null,
                'descricao_fiscal' => 'REBOBINACAO / ACERTO DE BOBINA',
                'tipo_item_sped' => '09',
                'unidade_comercial' => 'UN',
                'csosn' => '400',
                'preco_tabela' => '250.000000',
            ],
        ];

        foreach ($produtos as $data) {
            Produto::query()->updateOrCreate(
                ['empresa_id' => $emp1->id, 'codigo' => $data['codigo']],
                $data
            );
        }
    }

    private function seedCliente(Empresa $emp1): void
    {
        Parceiro::query()->firstOrCreate(
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
                'logradouro' => 'Av. Brasil',
                'numero' => '500',
                'bairro' => 'Centro',
                'municipio' => 'Uberlandia',
                'uf' => 'MG',
                'cep' => '38400100',
                'email' => 'compras@cliente-exemplo.com.br',
            ]
        );

        // PAR-00010 é código explícito do seed — sequência precisa ficar à frente.
        $seq = CodigoSequence::query()->firstOrCreate(
            ['empresa_id' => $emp1->id, 'prefixo' => 'PAR'],
            ['proximo' => 11]
        );
        if ((int) $seq->proximo < 11) {
            $seq->update(['proximo' => 11]);
        }
    }

    private function seedCodigoSequences(Empresa $emp1): void
    {
        $sequences = [
            ['empresa_id' => $emp1->id, 'prefixo' => 'MP-PAP', 'proximo' => 2],
            ['empresa_id' => $emp1->id, 'prefixo' => 'PA-ETQ', 'proximo' => 2],
            ['empresa_id' => $emp1->id, 'prefixo' => 'REV-RIB', 'proximo' => 2],
            ['empresa_id' => $emp1->id, 'prefixo' => 'SVC', 'proximo' => 2],
        ];

        foreach ($sequences as $seq) {
            CodigoSequence::query()->updateOrCreate(
                ['empresa_id' => $seq['empresa_id'], 'prefixo' => $seq['prefixo']],
                ['proximo' => $seq['proximo']]
            );
        }
    }
}
