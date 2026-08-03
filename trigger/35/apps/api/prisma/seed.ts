import { PrismaClient, ParametroStatusRatificacao, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERFIS = [
  { codigo: 'ADMIN', nome: 'Administrador', descricao: 'Parametrização e gestão de usuários' },
  { codigo: 'FISCAL', nome: 'Fiscal', descricao: 'NF-e/NFS-e e cadastros fiscais' },
  { codigo: 'FINANCEIRO', nome: 'Financeiro', descricao: 'Títulos, cobrança, crédito e bancos' },
  { codigo: 'COMERCIAL', nome: 'Comercial', descricao: 'ORC/PED e cadastro comercial de clientes' },
  { codigo: 'PRODUCAO', nome: 'Produção', descricao: 'OP/OS e movimentação de estoque' },
  { codigo: 'COMPRAS', nome: 'Compras', descricao: 'OC, XML entrada e fornecedores' },
  { codigo: 'EXPEDICAO', nome: 'Expedição', descricao: 'Romaneio e confirmação de entrega' },
  { codigo: 'CONSULTA', nome: 'Consulta', descricao: 'Somente leitura (contador/auditoria)' },
] as const;

const PERMISSOES = [
  { codigo: 'plt.usuario.gerir', modulo: 'M11', descricao: 'Gerir usuários e perfis' },
  { codigo: 'plt.parametro.gerir', modulo: 'M11', descricao: 'Alterar parâmetros da empresa' },
  { codigo: 'plt.parametro.ler', modulo: 'M11', descricao: 'Consultar parâmetros' },
  { codigo: 'plt.auditoria.ler', modulo: 'M11', descricao: 'Consultar trilha de auditoria' },
  { codigo: 'plt.empresa.trocar', modulo: 'M11', descricao: 'Trocar empresa da sessão' },
  { codigo: 'cad.parceiro.escrever', modulo: 'M01', descricao: 'Cadastrar/editar parceiros' },
  { codigo: 'cad.parceiro.ler', modulo: 'M01', descricao: 'Consultar parceiros' },
  { codigo: 'cad.produto.escrever', modulo: 'M01', descricao: 'Cadastrar/editar produtos' },
  { codigo: 'cad.produto.ler', modulo: 'M01', descricao: 'Consultar produtos' },
  { codigo: 'cad.bancario.escrever', modulo: 'M01', descricao: 'Alterar dados bancários de parceiro' },
  { codigo: 'cad.unidade.gerir', modulo: 'M01', descricao: 'Gerir unidades e fatores' },
  { codigo: 'com.orcamento.escrever', modulo: 'M02', descricao: 'Criar/editar orçamentos' },
  { codigo: 'com.pedido.escrever', modulo: 'M02', descricao: 'Operar pedidos' },
  { codigo: 'fin.credito.alterar', modulo: 'M06', descricao: 'Alterar limite de crédito' },
  { codigo: 'fin.titulo.operar', modulo: 'M06', descricao: 'Operar títulos e baixas' },
  { codigo: 'fis.nf.emitir', modulo: 'M05', descricao: 'Emitir NF' },
  { codigo: 'fis.nf.ler', modulo: 'M05', descricao: 'Consultar documentos fiscais' },
  { codigo: 'est.saldo.ler', modulo: 'M04', descricao: 'Consultar saldos de estoque' },
  { codigo: 'est.movimento.escrever', modulo: 'M04', descricao: 'Movimentar estoque' },
  { codigo: 'prd.op.operar', modulo: 'M03', descricao: 'Operar OP/OS' },
  { codigo: 'int.wa.enviar', modulo: 'M09', descricao: 'Enviar mensagem WhatsApp (template)' },
  { codigo: 'ger.export.baixar', modulo: 'M10', descricao: 'Baixar pacote export contador' },
  { codigo: 'est.inventario.aprovar', modulo: 'M04', descricao: 'Aprovar inventário / AJU (SoD)' },
  { codigo: 'fis.nf.cancelar', modulo: 'M05', descricao: 'Cancelar NF / emitir CC-e' },
  { codigo: 'cpr.ler', modulo: 'M07', descricao: 'Consultar compras (COT/OC/XML)' },
  { codigo: 'cpr.escrever', modulo: 'M07', descricao: 'Operar cotação, OC e entrada XML' },
  { codigo: 'cpr.alcada.aprovar', modulo: 'M07', descricao: 'Aprovar OC acima da alçada / urgente' },
  { codigo: 'cpr.entrada.avulsa', modulo: 'M07', descricao: 'Entrada XML sem OC (exceção)' },
] as const;

/** Matriz mínima perfil → permissões (expansível na Fase 1) */
const PERFIL_PERMISSOES: Record<string, string[]> = {
  ADMIN: PERMISSOES.map((p) => p.codigo),
  FISCAL: [
    'plt.parametro.ler',
    'plt.auditoria.ler',
    'plt.empresa.trocar',
    'cad.parceiro.ler',
    'cad.produto.ler',
    'est.saldo.ler',
    'est.inventario.aprovar',
    'fis.nf.emitir',
    'fis.nf.ler',
    'fis.nf.cancelar',
  ],
  FINANCEIRO: [
    'plt.parametro.ler',
    'plt.auditoria.ler',
    'plt.empresa.trocar',
    'cad.parceiro.ler',
    'cad.bancario.escrever',
    'est.saldo.ler',
    'est.inventario.aprovar',
    'fin.credito.alterar',
    'fin.titulo.operar',
    'int.wa.enviar',
    'ger.export.baixar',
    'cpr.ler',
    'cpr.alcada.aprovar',
  ],
  COMERCIAL: [
    'plt.parametro.ler',
    'plt.empresa.trocar',
    'cad.parceiro.escrever',
    'cad.parceiro.ler',
    'cad.produto.escrever',
    'cad.produto.ler',
    'est.saldo.ler',
    'com.orcamento.escrever',
    'com.pedido.escrever',
    'int.wa.enviar',
  ],
  PRODUCAO: [
    'plt.parametro.ler',
    'plt.empresa.trocar',
    'cad.produto.ler',
    'est.saldo.ler',
    'est.movimento.escrever',
    'prd.op.operar',
    'cpr.ler',
  ],
  COMPRAS: [
    'plt.parametro.ler',
    'plt.empresa.trocar',
    'cad.parceiro.escrever',
    'cad.parceiro.ler',
    'cad.produto.escrever',
    'cad.produto.ler',
    'cad.unidade.gerir',
    'est.saldo.ler',
    'est.movimento.escrever',
    'cpr.ler',
    'cpr.escrever',
  ],
  EXPEDICAO: [
    'plt.parametro.ler',
    'plt.empresa.trocar',
    'com.pedido.escrever',
    'cad.parceiro.ler',
    'est.saldo.ler',
    'est.movimento.escrever',
    'int.wa.enviar',
  ],
  CONSULTA: [
    'plt.parametro.ler',
    'plt.auditoria.ler',
    'plt.empresa.trocar',
    'cad.parceiro.ler',
    'cad.produto.ler',
    'est.saldo.ler',
    'fis.nf.ler',
    'ger.export.baixar',
  ],
};

const PARAMETROS_EMP00001: Array<{
  chave: string;
  valor: string;
  tipo: string;
  descricao: string;
  statusRatificacao: ParametroStatusRatificacao;
}> = [
  {
    chave: 'empresa_default',
    valor: 'EMP-00001',
    tipo: 'STRING',
    descricao: 'Empresa padrão da operação',
    statusRatificacao: ParametroStatusRatificacao.RATIFICADO,
  },
  {
    chave: 'emp_00002_venda_habilitada',
    valor: 'false',
    tipo: 'BOOLEAN',
    descricao: 'Venda em EMP-00002 (off até Contador+Direção)',
    statusRatificacao: ParametroStatusRatificacao.FIXO,
  },
  {
    chave: 'lai_no_erp',
    valor: 'false',
    tipo: 'BOOLEAN',
    descricao: 'LAI proibido no ERP (decisão fechada)',
    statusRatificacao: ParametroStatusRatificacao.FIXO,
  },
  {
    chave: 'politica_nf_antes_expedir',
    valor: 'true',
    tipo: 'BOOLEAN',
    descricao: 'Exigir NF autorizada antes de expedir',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'valor_minimo_capitalizar_bem',
    valor: '1000.00',
    tipo: 'DECIMAL',
    descricao: 'Valor mínimo para capitalizar bem (R$)',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'folga_expedicao_dias',
    valor: '2',
    tipo: 'INTEGER',
    descricao: 'Folga de expedição em dias úteis no PED',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'comissao_base',
    valor: 'FATURADO',
    tipo: 'STRING',
    descricao: 'Base de comissão: FATURADO | RECEBIDO',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'comissao_percentual_padrao',
    valor: '0',
    tipo: 'DECIMAL',
    descricao: 'Percentual padrão de comissão (definir com direção)',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'regua_cobranca',
    valor: 'D-3,D+1,D+7,D+15',
    tipo: 'STRING',
    descricao: 'Régua de cobrança WhatsApp',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'decimal_casas_dinheiro',
    valor: '2',
    tipo: 'INTEGER',
    descricao: 'Casas decimais para dinheiro',
    statusRatificacao: ParametroStatusRatificacao.RATIFICADO,
  },
  {
    chave: 'decimal_casas_quantidade',
    valor: '4',
    tipo: 'INTEGER',
    descricao: 'Casas decimais para quantidade',
    statusRatificacao: ParametroStatusRatificacao.RATIFICADO,
  },
  {
    chave: 'imposto_estimado_pct',
    valor: '6',
    tipo: 'DECIMAL',
    descricao: 'Alíquota % estimada no ORC (Simples) — validar com contador',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'alcada_desconto_comercial_pct',
    valor: '5',
    tipo: 'DECIMAL',
    descricao: 'Teto % desconto perfil COMERCIAL',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'desconto_max_pct_comercial',
    valor: '5',
    tipo: 'DECIMAL',
    descricao: 'Alçada máxima desconto comercial (COMERCIAL)',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'gordura_max_pct_comercial',
    valor: '10',
    tipo: 'DECIMAL',
    descricao: 'Alçada máxima gordura comercial (COMERCIAL)',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'bank_cobranca_habilitada',
    valor: 'true',
    tipo: 'BOOLEAN',
    descricao: 'Kill-switch emissão COB bancária',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'whatsapp_envio_habilitado',
    valor: 'true',
    tipo: 'BOOLEAN',
    descricao: 'Kill-switch envio WhatsApp',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'compras_alcada_valor_max',
    valor: '5000',
    tipo: 'DECIMAL',
    descricao: 'Teto OC sem aprovação FINANCEIRO/ADMIN (R$)',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'estoque_permite_saldo_negativo',
    valor: 'false',
    tipo: 'BOOLEAN',
    descricao: 'Permitir saída com saldo insuficiente (dia-1 = bloqueia)',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'focus_emissao_habilitada',
    valor: 'true',
    tipo: 'BOOLEAN',
    descricao: 'Kill-switch emissão Focus (UC-FIS-001 EX2)',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'focus_ambiente',
    valor: 'HOMOLOGACAO_STUB',
    tipo: 'STRING',
    descricao: 'Ambiente Focus: HOMOLOGACAO_STUB | SANDBOX | PRODUCAO',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
  {
    chave: 'natureza_receita_venda_padrao',
    valor: '1.01',
    tipo: 'STRING',
    descricao: 'Natureza gerencial padrão receita venda (grupos 1–5; validar contador)',
    statusRatificacao: ParametroStatusRatificacao.PENDENTE_RATIFICACAO,
  },
];

async function main() {
  const emp1 = await prisma.empresa.upsert({
    where: { codigo: 'EMP-00001' },
    update: {},
    create: {
      codigo: 'EMP-00001',
      razaoSocial: 'RLP ETIQUETAS AUTO ADESIVOS LTDA',
      nomeFantasia: 'RLP Etiquetas',
      cnpj: '01423183000110',
      uf: 'MG',
      regimeTributario: 'SIMPLES_NACIONAL',
      vendaAtiva: true,
      estoqueAtivo: true,
    },
  });

  const emp2 = await prisma.empresa.upsert({
    where: { codigo: 'EMP-00002' },
    update: {},
    create: {
      codigo: 'EMP-00002',
      razaoSocial: 'RLP ETIQUETAS AUTO ADESIVOS LTDA',
      nomeFantasia: 'RLP CNPJ 2',
      cnpj: '58820046000137',
      uf: 'MG',
      regimeTributario: 'SIMPLES_NACIONAL',
      vendaAtiva: false,
      estoqueAtivo: true,
    },
  });

  for (const p of PERFIS) {
    await prisma.perfil.upsert({
      where: { codigo: p.codigo },
      update: { nome: p.nome, descricao: p.descricao },
      create: p,
    });
  }

  for (const perm of PERMISSOES) {
    await prisma.permissao.upsert({
      where: { codigo: perm.codigo },
      update: { descricao: perm.descricao, modulo: perm.modulo },
      create: perm,
    });
  }

  const perfisDb = await prisma.perfil.findMany();
  const permsDb = await prisma.permissao.findMany();
  const perfilByCodigo = Object.fromEntries(perfisDb.map((p) => [p.codigo, p]));
  const permByCodigo = Object.fromEntries(permsDb.map((p) => [p.codigo, p]));

  for (const [perfilCodigo, permCodigos] of Object.entries(PERFIL_PERMISSOES)) {
    const perfil = perfilByCodigo[perfilCodigo];
    if (!perfil) continue;
    for (const codigo of permCodigos) {
      const perm = permByCodigo[codigo];
      if (!perm) continue;
      await prisma.perfilPermissao.upsert({
        where: {
          perfilId_permissaoId: { perfilId: perfil.id, permissaoId: perm.id },
        },
        update: {},
        create: { perfilId: perfil.id, permissaoId: perm.id },
      });
    }
  }

  // SoD: ADMIN x operação financeira rotina; COMERCIAL x alterar crédito
  const admin = perfilByCodigo['ADMIN'];
  const financeiro = perfilByCodigo['FINANCEIRO'];
  const comercial = perfilByCodigo['COMERCIAL'];
  if (admin && financeiro) {
    await prisma.sodPar.upsert({
      where: { perfilAId_perfilBId: { perfilAId: admin.id, perfilBId: financeiro.id } },
      update: { motivo: 'ADMIN não deve ser login de rotina financeira' },
      create: {
        perfilAId: admin.id,
        perfilBId: financeiro.id,
        motivo: 'ADMIN não deve ser login de rotina financeira',
      },
    });
  }
  if (comercial && financeiro) {
    // Par de ações incompatíveis documentado; perfis podem coexistir com controle compensatório.
    // Mantemos registro informativo no seed para a UI/API de SoD na Fase 0.1+
  }

  for (const param of PARAMETROS_EMP00001) {
    await prisma.parametroEmpresa.upsert({
      where: { empresaId_chave: { empresaId: emp1.id, chave: param.chave } },
      update: {
        valor: param.valor,
        tipo: param.tipo,
        descricao: param.descricao,
        statusRatificacao: param.statusRatificacao,
      },
      create: { empresaId: emp1.id, ...param },
    });
  }

  // Parâmetros fixos também em EMP-00002
  for (const chave of ['emp_00002_venda_habilitada', 'lai_no_erp'] as const) {
    const base = PARAMETROS_EMP00001.find((p) => p.chave === chave)!;
    await prisma.parametroEmpresa.upsert({
      where: { empresaId_chave: { empresaId: emp2.id, chave } },
      update: { valor: base.valor, statusRatificacao: base.statusRatificacao },
      create: { empresaId: emp2.id, ...base },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@rlp.local';
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@RLP2026!';
  const opEmail = process.env.SEED_OPERADOR_EMAIL ?? 'operador@rlp.local';
  const opPass = process.env.SEED_OPERADOR_PASSWORD ?? 'Operador@RLP2026!';

  const adminHash = await bcrypt.hash(adminPass, 12);
  const opHash = await bcrypt.hash(opPass, 12);

  const adminUser = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: { senhaHash: adminHash, status: 'ATIVO', nome: 'Admin RLP' },
    create: {
      email: adminEmail,
      nome: 'Admin RLP',
      senhaHash: adminHash,
      status: 'ATIVO',
      mfaObrigatorio: false,
    },
  });

  const opUser = await prisma.usuario.upsert({
    where: { email: opEmail },
    update: { senhaHash: opHash, status: 'ATIVO', nome: 'Operador Comercial' },
    create: {
      email: opEmail,
      nome: 'Operador Comercial',
      senhaHash: opHash,
      status: 'ATIVO',
    },
  });

  const perfilAdmin = perfilByCodigo['ADMIN']!;
  const perfilComercial = perfilByCodigo['COMERCIAL']!;

  await prisma.usuarioPerfil.upsert({
    where: { usuarioId_perfilId: { usuarioId: adminUser.id, perfilId: perfilAdmin.id } },
    update: {},
    create: { usuarioId: adminUser.id, perfilId: perfilAdmin.id },
  });
  await prisma.usuarioPerfil.upsert({
    where: { usuarioId_perfilId: { usuarioId: opUser.id, perfilId: perfilComercial.id } },
    update: {},
    create: { usuarioId: opUser.id, perfilId: perfilComercial.id },
  });

  for (const user of [adminUser, opUser]) {
    await prisma.usuarioEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId: user.id, empresaId: emp1.id } },
      update: { padrao: true, acessoAtivo: true },
      create: { usuarioId: user.id, empresaId: emp1.id, padrao: true, acessoAtivo: true },
    });
    await prisma.usuarioEmpresa.upsert({
      where: { usuarioId_empresaId: { usuarioId: user.id, empresaId: emp2.id } },
      update: { padrao: false, acessoAtivo: true },
      create: { usuarioId: user.id, empresaId: emp2.id, padrao: false, acessoAtivo: true },
    });
  }

  await prisma.auditLog.create({
    data: {
      empresaId: emp1.id,
      usuarioId: adminUser.id,
      acao: 'SEED',
      entidade: 'sistema',
      entidadeId: 'fase-0',
      paraJson: { mensagem: 'Seed Fase 0 aplicado' } as Prisma.InputJsonValue,
      sucesso: true,
    },
  });

  // ----- M01 seed: unidades, fornecedores XML, produtos amostra -----
  const unidades = [
    { codigo: 'UN', nome: 'Unidade', casasDecimais: 0 },
    { codigo: 'KG', nome: 'Quilograma', casasDecimais: 4 },
    { codigo: 'M', nome: 'Metro linear', casasDecimais: 4 },
    { codigo: 'M2', nome: 'Metro quadrado', casasDecimais: 4 },
    { codigo: 'ROL', nome: 'Rolo', casasDecimais: 0 },
    { codigo: 'MIL', nome: 'Milheiro', casasDecimais: 4 },
  ] as const;

  for (const u of unidades) {
    await prisma.unidadeMedida.upsert({
      where: { codigo: u.codigo },
      update: { nome: u.nome, casasDecimais: u.casasDecimais, ativo: true },
      create: u,
    });
  }

  const unByCodigo = Object.fromEntries(
    (await prisma.unidadeMedida.findMany()).map((u) => [u.codigo, u]),
  );

  const fornecedoresSeed = [
    {
      cnpj: '03514129000106',
      razao: 'AUTO ADESIVOS PARANA LTDA',
      fantasia: 'Colacril',
      uf: 'PR',
      mun: 'Curitiba',
      cep: '80000000',
    },
    {
      cnpj: '43999630000124',
      razao: 'AVERY DENNISON DO BRASIL LTDA',
      fantasia: 'Avery Dennison',
      uf: 'SP',
      mun: 'Sao Paulo',
      cep: '01000000',
    },
    {
      cnpj: '34661762000150',
      razao: 'FEDRIGONI BRASIL PAPEIS LTDA',
      fantasia: 'Fedrigoni',
      uf: 'SP',
      mun: 'Sao Paulo',
      cep: '01000000',
    },
    {
      cnpj: '02744462000149',
      razao: 'CAMALLON INDUSTRIA DE TINTAS LTDA',
      fantasia: 'Camallon',
      uf: 'MG',
      mun: 'Belo Horizonte',
      cep: '30000000',
    },
  ];

  let parSeq = 1n;
  for (const f of fornecedoresSeed) {
    const codigo = `PAR-${parSeq.toString().padStart(5, '0')}`;
    parSeq += 1n;
    const existing = await prisma.parceiro.findFirst({
      where: { empresaId: emp1.id, cnpjCpf: f.cnpj },
    });
    if (existing) continue;
    await prisma.parceiro.create({
      data: {
        empresaId: emp1.id,
        codigo,
        tipoPessoa: 'PJ',
        cnpjCpf: f.cnpj,
        razaoSocial: f.razao,
        nomeFantasia: f.fantasia,
        indIEDest: 'CONTRIBUINTE',
        inscricaoEstadual: 'ISENTO',
        papelFornecedor: true,
        cadastroFiscalCompleto: true,
        ehProspect: false,
        enderecos: {
          create: {
            tipo: 'FISCAL',
            logradouro: 'Endereco a confirmar cartao CNPJ',
            numero: 'S/N',
            bairro: 'Centro',
            municipio: f.mun,
            uf: f.uf,
            cep: f.cep,
            principal: true,
          },
        },
      },
    });
  }

  await prisma.sequenciaCodigo.upsert({
    where: { empresaId_prefixo: { empresaId: emp1.id, prefixo: 'PAR' } },
    update: { proximo: parSeq },
    create: { empresaId: emp1.id, prefixo: 'PAR', proximo: parSeq },
  });

  // cliente prospect + cliente completo
  if (!(await prisma.parceiro.findFirst({ where: { empresaId: emp1.id, codigo: 'PAR-00010' } }))) {
    await prisma.parceiro.create({
      data: {
        empresaId: emp1.id,
        codigo: 'PAR-00010',
        tipoPessoa: 'PJ',
        razaoSocial: 'CLIENTE PROSPECT EXEMPLO LTDA',
        nomeFantasia: 'Prospect Exemplo',
        papelCliente: true,
        ehProspect: true,
        cadastroFiscalCompleto: false,
      },
    });
  }
  if (!(await prisma.parceiro.findFirst({ where: { empresaId: emp1.id, codigo: 'PAR-00011' } }))) {
    await prisma.parceiro.create({
      data: {
        empresaId: emp1.id,
        codigo: 'PAR-00011',
        tipoPessoa: 'PJ',
        cnpjCpf: '11222333000181',
        razaoSocial: 'CLIENTE FISCAL COMPLETO LTDA',
        nomeFantasia: 'Cliente Completo',
        papelCliente: true,
        ehProspect: false,
        indIEDest: 'NAO_CONTRIBUINTE',
        cadastroFiscalCompleto: true,
        enderecos: {
          create: {
            tipo: 'FISCAL',
            logradouro: 'Rua Exemplo',
            numero: '100',
            bairro: 'Centro',
            municipio: 'Uberlandia',
            codigoIbge: '3170206',
            uf: 'MG',
            cep: '38400000',
            principal: true,
          },
        },
        contatos: {
          create: {
            nome: 'Compras',
            email: 'compras@cliente.local',
            principal: true,
          },
        },
      },
    });
  }
  await prisma.sequenciaCodigo.upsert({
    where: { empresaId_prefixo: { empresaId: emp1.id, prefixo: 'PAR' } },
    update: { proximo: 12n },
    create: { empresaId: emp1.id, prefixo: 'PAR', proximo: 12n },
  });

  const kg = unByCodigo['KG']!;
  const m = unByCodigo['M']!;
  const un = unByCodigo['UN']!;
  const mil = unByCodigo['MIL']!;

  async function upsertProduto(data: {
    codigo: string;
    familia: 'MP' | 'EMB' | 'REV' | 'PA' | 'SVC';
    descricao: string;
    ncm?: string;
    ue: bigint;
    uc: bigint;
    controlaEstoque?: boolean;
    mascaraJson?: object;
    csosn?: string;
    preco?: string;
  }) {
    const existing = await prisma.produto.findFirst({
      where: { empresaId: emp1.id, codigo: data.codigo },
    });
    if (existing) return existing;
    return prisma.produto.create({
      data: {
        empresaId: emp1.id,
        codigo: data.codigo,
        familia: data.familia,
        descricao: data.descricao,
        ncm: data.ncm,
        unidadeEstoqueId: data.ue,
        unidadeComercialId: data.uc,
        controlaEstoque: data.controlaEstoque ?? data.familia !== 'SVC',
        mascaraJson: data.mascaraJson,
        csosnPadrao: data.csosn,
        precoTabela: data.preco,
      },
    });
  }

  const mp = await upsertProduto({
    codigo: 'MP-00001',
    familia: 'MP',
    descricao: 'FILME BOPP AUTOADESIVO BRANCO',
    ncm: '39199090',
    ue: kg.id,
    uc: m.id,
    mascaraJson: { larguraMm: 330, gramatura: null, material: 'BOPP' },
  });
  const fatorExiste = await prisma.fatorConversao.findFirst({ where: { produtoId: mp.id } });
  if (!fatorExiste) {
    await prisma.fatorConversao.create({
      data: {
        produtoId: mp.id,
        unidadeDeId: kg.id,
        unidadeParaId: m.id,
        fator: '45.0000000000',
      },
    });
  }

  await upsertProduto({
    codigo: 'PA-ETQ-001',
    familia: 'PA',
    descricao: 'ETIQUETAS BOPP (familia fiscal saida)',
    ncm: '39191090',
    ue: mil.id,
    uc: mil.id,
    csosn: '102',
    preco: '180.0000',
  });

  await upsertProduto({
    codigo: 'REV-00001',
    familia: 'REV',
    descricao: 'RIBBON CERA 110x300 (revenda)',
    ncm: '96121000',
    ue: un.id,
    uc: un.id,
    csosn: '102',
    preco: '45.0000',
  });

  await upsertProduto({
    codigo: 'SVC-00001',
    familia: 'SVC',
    descricao: 'SERVICO DE IMPRESSAO FLEXOGRAFICA',
    ue: un.id,
    uc: un.id,
    controlaEstoque: false,
    csosn: '400',
    preco: '250.0000',
  });

  await prisma.sequenciaCodigo.upsert({
    where: { empresaId_prefixo: { empresaId: emp1.id, prefixo: 'MP' } },
    update: { proximo: 2n },
    create: { empresaId: emp1.id, prefixo: 'MP', proximo: 2n },
  });
  await prisma.sequenciaCodigo.upsert({
    where: { empresaId_prefixo: { empresaId: emp1.id, prefixo: 'PA' } },
    update: { proximo: 2n },
    create: { empresaId: emp1.id, prefixo: 'PA', proximo: 2n },
  });
  await prisma.sequenciaCodigo.upsert({
    where: { empresaId_prefixo: { empresaId: emp1.id, prefixo: 'REV' } },
    update: { proximo: 2n },
    create: { empresaId: emp1.id, prefixo: 'REV', proximo: 2n },
  });
  await prisma.sequenciaCodigo.upsert({
    where: { empresaId_prefixo: { empresaId: emp1.id, prefixo: 'SVC' } },
    update: { proximo: 2n },
    create: { empresaId: emp1.id, prefixo: 'SVC', proximo: 2n },
  });
  await prisma.sequenciaCodigo.upsert({
    where: { empresaId_prefixo: { empresaId: emp1.id, prefixo: 'FAC' } },
    update: {},
    create: { empresaId: emp1.id, prefixo: 'FAC', proximo: 1n },
  });

  // Saldos iniciais de homologação (entrada inicial se ainda zerado)
  async function seedSaldoInicial(
    codigoProduto: string,
    quantidade: string,
    custoUnitario: string,
  ) {
    const prod = await prisma.produto.findFirst({
      where: { empresaId: emp1.id, codigo: codigoProduto },
    });
    if (!prod) return;
    const saldo = await prisma.saldoEstoque.findUnique({
      where: {
        empresaId_produtoId: { empresaId: emp1.id, produtoId: prod.id },
      },
    });
    if (saldo && Number(saldo.quantidade) > 0) return;

    const year = new Date().getFullYear();
    const seqKey = `MOV${year}`;
    const seq = await prisma.sequenciaCodigo.upsert({
      where: { empresaId_prefixo: { empresaId: emp1.id, prefixo: seqKey } },
      update: {},
      create: { empresaId: emp1.id, prefixo: seqKey, proximo: 1n },
    });
    const n = seq.proximo;
    const codigo = `MOV-${year}-${n.toString().padStart(5, '0')}`;
    await prisma.sequenciaCodigo.update({
      where: { id: seq.id },
      data: { proximo: n + 1n },
    });

    await prisma.movimentoEstoque.create({
      data: {
        empresaId: emp1.id,
        codigo,
        produtoId: prod.id,
        tipo: 'ENTRADA',
        motivo: 'ENTRADA_INICIAL',
        quantidade,
        custoUnitario,
        custoTotal: (Number(quantidade) * Number(custoUnitario)).toFixed(4),
        saldoApos: quantidade,
        custoMedioApos: custoUnitario,
        motivoTexto: 'Seed DEV — saldo inicial homologação',
      },
    });
    await prisma.saldoEstoque.upsert({
      where: {
        empresaId_produtoId: { empresaId: emp1.id, produtoId: prod.id },
      },
      update: { quantidade, custoMedio: custoUnitario },
      create: {
        empresaId: emp1.id,
        produtoId: prod.id,
        quantidade,
        custoMedio: custoUnitario,
      },
    });
  }

  await seedSaldoInicial('MP-00001', '100.0000', '12.5000');
  await seedSaldoInicial('PA-ETQ-001', '50.0000', '90.0000');
  await seedSaldoInicial('REV-00001', '20.0000', '28.0000');

  const clienteCompleto = await prisma.parceiro.findFirst({
    where: { empresaId: emp1.id, codigo: 'PAR-00011' },
  });
  if (
    clienteCompleto &&
    !(await prisma.faca.findFirst({ where: { empresaId: emp1.id, codigo: 'FAC-00001' } }))
  ) {
    await prisma.faca.create({
      data: {
        empresaId: emp1.id,
        codigo: 'FAC-00001',
        descricao: 'Faca retangular 50x30mm',
        modeloRef: 'ETQ-50x30',
        parceiroClienteId: clienteCompleto.id,
        jaCobrado: false,
      },
    });
    await prisma.sequenciaCodigo.upsert({
      where: { empresaId_prefixo: { empresaId: emp1.id, prefixo: 'FAC' } },
      update: { proximo: 2n },
      create: { empresaId: emp1.id, prefixo: 'FAC', proximo: 2n },
    });
  }

  // limite crédito cliente completo
  const clienteCred = await prisma.parceiro.findFirst({
    where: { empresaId: emp1.id, codigo: 'PAR-00011' },
  });
  if (clienteCred) {
    await prisma.limiteCreditoParceiro.upsert({
      where: { parceiroId: clienteCred.id },
      update: { limite: '50000.00' },
      create: {
        empresaId: emp1.id,
        parceiroId: clienteCred.id,
        limite: '50000.00',
      },
    });
    // atualiza preço se produto já existia sem preço
    await prisma.produto.updateMany({
      where: { empresaId: emp1.id, codigo: 'PA-ETQ-001', precoTabela: null },
      data: { precoTabela: '180.0000' },
    });
    await prisma.produto.updateMany({
      where: { empresaId: emp1.id, codigo: 'SVC-00001', precoTabela: null },
      data: { precoTabela: '250.0000' },
    });
  }

  console.log('Seed OK:', {
    empresas: [emp1.codigo, emp2.codigo],
    admin: adminEmail,
    operador: opEmail,
    m01: 'unidades+parceiros+produtos+fac',
    m02: 'params imposto/alcada + credito cliente',
    m04: 'saldos iniciais MP/PA/REV + perm est.saldo.ler',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
