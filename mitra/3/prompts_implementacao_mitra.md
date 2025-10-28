# PROMPTS DE IMPLEMENTAÇÃO - SISTEMA DE PLANEJAMENTO ORÇAMENTÁRIO

## Estratégia para MitraLab.io com MySQL

---

## FASE 1: ESTRUTURA DO BANCO DE DADOS

### PROMPT 1: Criar Modelo de Dados

```
Criar o modelo de banco de dados MySQL para um sistema de planejamento orçamentário com as seguintes entidades:

TABELA: centros_resultado
- id (int, auto_increment, pk)
- nome (varchar 200)
- gestor_email (varchar 255)
- ativo (tinyint, default 1)
- created_at (timestamp)

TABELA: conta_contabil
- id (int, auto_increment, pk)
- codigo (varchar 20, unique)
- descricao (varchar 255)
- tipo (enum: 'Receita', 'Despesa')
- ativa (tinyint, default 1)
- created_at (timestamp)

TABELA: versao_orcamento
- id (int, auto_increment, pk)
- nome (varchar 255)
- ano_base (int)
- mes_ultimo_realizado (int, 1-12)
- observacoes (text)
- status (enum: 'Aberta', 'Aprovacao', 'Fechada')
- created_at (timestamp)
- updated_at (timestamp)

TABELA: historico_contabil
- id (int, auto_increment, pk)
- centro_resultado_id (int, fk)
- conta_contabil_id (int, fk)
- mes (int, 1-12)
- ano (int)
- valor (decimal 15,2)
- created_at (timestamp)

TABELA: forecast_orcamento
- id (int, auto_increment, pk)
- versao_id (int, fk)
- centro_resultado_id (int, fk)
- conta_contabil_id (int, fk)
- mes (int, 1-12)
- valor (decimal 15,2)
- created_at (timestamp)
- updated_at (timestamp)

TABELA: status_cr_versao
- id (int, auto_increment, pk)
- versao_id (int, fk)
- centro_resultado_id (int, fk)
- status (enum: 'Pendente_Preenchimento', 'Enviado_Aprovacao', 'Rejeitado', 'Aprovado')
- justificativa_rejeicao (text)
- ultima_submissao (timestamp)
- created_at (timestamp)
- updated_at (timestamp)


Criar as foreign keys apropriadas e índices para performance nas consultas de histórico e forecast por mês e CR.
```

---

## FASE 1.5: DADOS DE EXEMPLO

### PROMPT 1.0: Popular Tabelas com Dados de Exemplo

```
Criar script SQL para popular as tabelas principais com dados de exemplo:

1. CENTROS DE RESULTADO (centros_resultado):
INSERT INTO centros_resultado (nome, gestor_email, ativo, created_at) VALUES
('Vendas', 'vendas@empresa.com', 1, NOW()),
('Marketing', 'marketing@empresa.com', 1, NOW()),
('TI', 'ti@empresa.com', 1, NOW()),
('RH', 'rh@empresa.com', 1, NOW()),
('Financeiro', 'financeiro@empresa.com', 1, NOW()),
('Produção', 'producao@empresa.com', 1, NOW()),
('Comercial', 'comercial@empresa.com', 1, NOW()),
('Jurídico', 'juridico@empresa.com', 1, NOW());

2. CONTAS CONTÁBEIS (conta_contabil):
INSERT INTO conta_contabil (codigo, descricao, tipo, ativa, created_at) VALUES
-- RECEITAS
('3.01.01', 'Receita de Vendas', 'Receita', 1, NOW()),
('3.01.02', 'Receita de Serviços', 'Receita', 1, NOW()),
('3.02.01', 'Receita Financeira', 'Receita', 1, NOW()),

-- DESPESAS OPERACIONAIS
('4.01.01', 'Salários e Ordenados', 'Despesa', 1, NOW()),
('4.01.02', 'Encargos Sociais', 'Despesa', 1, NOW()),
('4.01.03', 'Benefícios Funcionários', 'Despesa', 1, NOW()),
('4.02.01', 'Aluguel', 'Despesa', 1, NOW()),
('4.02.02', 'Energia Elétrica', 'Despesa', 1, NOW()),
('4.02.03', 'Telefone/Internet', 'Despesa', 1, NOW()),
('4.02.04', 'Material de Escritório', 'Despesa', 1, NOW()),
('4.03.01', 'Marketing Digital', 'Despesa', 1, NOW()),
('4.03.02', 'Propaganda', 'Despesa', 1, NOW()),
('4.03.03', 'Eventos e Feiras', 'Despesa', 1, NOW()),
('4.04.01', 'Manutenção de Equipamentos', 'Despesa', 1, NOW()),
('4.04.02', 'Licenças de Software', 'Despesa', 1, NOW()),
('4.04.03', 'Consultoria TI', 'Despesa', 1, NOW()),
('4.05.01', 'Treinamentos', 'Despesa', 1, NOW()),
('4.05.02', 'Recrutamento', 'Despesa', 1, NOW()),
('4.05.03', 'Benefícios Corporativos', 'Despesa', 1, NOW()),
('4.06.01', 'Honorários Advocatícios', 'Despesa', 1, NOW()),
('4.06.02', 'Registros e Licenças', 'Despesa', 1, NOW()),
('4.07.01', 'Matéria-Prima', 'Despesa', 1, NOW()),
('4.07.02', 'Mão de Obra Direta', 'Despesa', 1, NOW()),
('4.07.03', 'Custos Indiretos', 'Despesa', 1, NOW()),
('4.08.01', 'Comissões de Vendas', 'Despesa', 1, NOW()),
('4.08.02', 'Viagens Comerciais', 'Despesa', 1, NOW()),
('4.08.03', 'Material Promocional', 'Despesa', 1, NOW());

3. HISTÓRICO CONTÁBIL (historico_contabil) - Dados do ano anterior:
-- Gerar dados aleatórios para cada CR e conta para os 12 meses do ano anterior
-- Exemplo para alguns registros:
INSERT INTO historico_contabil (centro_resultado_id, conta_contabil_id, mes, ano, valor, created_at) VALUES
-- Vendas - Receita de Vendas (meses 1-12)
(1, 1, 1, 2023, 150000.00, NOW()),
(1, 1, 2, 2023, 165000.00, NOW()),
(1, 1, 3, 2023, 180000.00, NOW()),
(1, 1, 4, 2023, 170000.00, NOW()),
(1, 1, 5, 2023, 190000.00, NOW()),
(1, 1, 6, 2023, 200000.00, NOW()),
(1, 1, 7, 2023, 185000.00, NOW()),
(1, 1, 8, 2023, 210000.00, NOW()),
(1, 1, 9, 2023, 195000.00, NOW()),
(1, 1, 10, 2023, 220000.00, NOW()),
(1, 1, 11, 2023, 205000.00, NOW()),
(1, 1, 12, 2023, 230000.00, NOW()),

-- Marketing - Marketing Digital (meses 1-12)
(2, 10, 1, 2023, 15000.00, NOW()),
(2, 10, 2, 2023, 18000.00, NOW()),
(2, 10, 3, 2023, 20000.00, NOW()),
(2, 10, 4, 2023, 16000.00, NOW()),
(2, 10, 5, 2023, 22000.00, NOW()),
(2, 10, 6, 2023, 25000.00, NOW()),
(2, 10, 7, 2023, 19000.00, NOW()),
(2, 10, 8, 2023, 28000.00, NOW()),
(2, 10, 9, 2023, 21000.00, NOW()),
(2, 10, 10, 2023, 30000.00, NOW()),
(2, 10, 11, 2023, 24000.00, NOW()),
(2, 10, 12, 2023, 32000.00, NOW()),

-- TI - Licenças de Software (meses 1-12)
(3, 13, 1, 2023, 5000.00, NOW()),
(3, 13, 2, 2023, 5000.00, NOW()),
(3, 13, 3, 2023, 5000.00, NOW()),
(3, 13, 4, 2023, 5000.00, NOW()),
(3, 13, 5, 2023, 5000.00, NOW()),
(3, 13, 6, 2023, 5000.00, NOW()),
(3, 13, 7, 2023, 5000.00, NOW()),
(3, 13, 8, 2023, 5000.00, NOW()),
(3, 13, 9, 2023, 5000.00, NOW()),
(3, 13, 10, 2023, 5000.00, NOW()),
(3, 13, 11, 2023, 5000.00, NOW()),
(3, 13, 12, 2023, 5000.00, NOW());

-- Continuar com mais registros para outras combinações CR/Conta...

4. VERSÃO DE ORÇAMENTO (versao_orcamento):
INSERT INTO versao_orcamento (nome, ano_base, mes_ultimo_realizado, observacoes, status, created_at, updated_at) VALUES
('Orçamento 2024 - Base', 2024, 12, 'Orçamento baseado no histórico de 2023', 'Aberta', NOW(), NOW());

5. STATUS DOS CRs PARA A VERSÃO (status_cr_versao):
-- Criar registro para cada CR ativo com status inicial
INSERT INTO status_cr_versao (versao_id, centro_resultado_id, status, created_at, updated_at) VALUES
(1, 1, 'Pendente_Preenchimento', NOW(), NOW()),
(1, 2, 'Pendente_Preenchimento', NOW(), NOW()),
(1, 3, 'Pendente_Preenchimento', NOW(), NOW()),
(1, 4, 'Pendente_Preenchimento', NOW(), NOW()),
(1, 5, 'Pendente_Preenchimento', NOW(), NOW()),
(1, 6, 'Pendente_Preenchimento', NOW(), NOW()),
(1, 7, 'Pendente_Preenchimento', NOW(), NOW()),
(1, 8, 'Pendente_Preenchimento', NOW(), NOW());

INSTRUÇÕES:
- Execute este script após criar a estrutura do banco
- Ajuste os valores conforme a realidade da empresa
- Adicione mais registros de histórico para ter dados mais realistas
- Use estes dados para testar todas as funcionalidades do sistema
```

---

## FASE 1.6: CADASTROS BÁSICOS (DADOS-MESTRE)

### PROMPT 1.1: Cadastro de Centros de Resultado

```
Criar tela de cadastro e gestão de Centros de Resultado com:

STRUCTURE:
1. Tabela listando todos os CRs com colunas:
   - ID (auto)
   - Nome do CR
   - Email do Gestor
   - Status (Ativo/Inativo)
   - Criado em
   - Ações

2. Modal de Edição/Criação com campos:
   - Nome do CR (obrigatório, text)
   - Email do Gestor (obrigatório, validar formato email)
   - Status: checkbox "Ativo" (checked por padrão)
   - Campo "Observações" (opcional, textarea)

FUNCIONALIDADES:
- Botão "Novo CR" → abre modal vazio
- Botão "Editar" em cada linha → abre modal preenchido
- Botão "Inativar" → muda ativo=0 (não aparece mais em versões futuras)
- Botão "Reativar" para CRs inativos
- Validação: não permitir criar com mesmo nome
- Validação: obrigatório preencher email válido
- Botão "Salvar" → INSERT ou UPDATE na tabela centros_resultado

OUTROS:
- Botão "Exportar CSV" para exportar lista
- Filtro/busca por nome ou email
- Exibir quantidade total de CRs ativos no topo
- Alerta de confirmação antes de inativar CR que já tem dados históricos
```

---

### PROMPT 1.2: Cadastro de Contas Contábeis

```
Criar tela de cadastro e gestão de Contas Contábeis com:

STRUCTURE:
1. Tabela listando todas as contas com colunas:
   - Código da Conta
   - Descrição
   - Tipo (Receita/Despesa) com badge colorido
   - Status (Ativa/Inativa)
   - Criado em
   - Ações

2. Modal de Edição/Criação com campos:
   - Código da Conta (obrigatório, text, máx 20 caracteres)
   - Descrição (obrigatório, text)
   - Tipo: dropdown/select (Receita ou Despesa)
   - Checkbox "Conta Ativa" (checked por padrão)
   - Observações (opcional, textarea)

FUNCIONALIDADES:
- Botão "Nova Conta" → abre modal vazio
- Botão "Editar" em cada linha → abre modal preenchido
- Botão "Inativar" → muda ativa=0
- Validação: código UNIQUE (não pode repetir)
- Validação: código formatado (ex: "3.01.01", "4.02.15")
- Botão "Importar CSV":
  - Upload arquivo CSV com colunas: codigo, descricao, tipo
  - Preview dos dados
  - Validação de formato antes de importar
  - Botão "Confirmar Importação"
- Ordenação automática por código da conta
- Contador no topo: "X contas ativas, Y inativas"

OUTROS:
- Filtros: Tipo (Receita/Despesa), Status (Ativa/Inativa)
- Busca por código ou descrição
- Botão "Exportar CSV"
- Aviso antes de inativar conta que já tem histórico/forecast
- Visual: Badge verde para Receita, vermelho para Despesa
```

---

### PROMPT 1.3: Importação de Histórico Contábil

```
Criar tela completa de importação do histórico contábil:

STRUCTURE:
1. Upload de Arquivo:
   - Botão "Selecionar Arquivo CSV/Excel"
   - Aceitar formatos: .csv, .xlsx
   - Limite de tamanho: 10MB

2. Preview dos Dados:
   - Exibir tabela com as primeiras 10 linhas
   - Colunas esperadas: Centro_Resultado_Nome (ou ID), Conta_Codigo, Mes, Ano, Valor
   - Mostrar quantidade total de linhas: "X registros serão importados"

3. Mapeamento de Colunas:
   - Se arquivo não tiver cabeçalhos exatos, permitir mapear:
     * Dropdown "Coluna do CR"
     * Dropdown "Coluna da Conta"
     * Dropdown "Coluna do Mês"
     * Dropdown "Coluna do Ano"
     * Dropdown "Coluna do Valor"

4. Opções de Importação:
   - Radio: "Substituir histórico completo"
   - Radio: "Somente adicionar novos registros"
   - Checkbox: "Validar antes de importar" (padrão: checked)

VALIDAÇÕES:
- CR existe no banco (match por nome ou ID)
- Conta contábil existe (match por código)
- Mês entre 1-12
- Ano é um ano válido (ex: < ano atual)
- Valor é numérico e >= 0
- Não duplicar registro (CR+Conta+Mes+Ano)

PROCESSAMENTO:
- Botão "Iniciar Importação":
  1. Exibir loading/spinner
  2. Processar linha por linha
  3. Exibir progresso: "Processando linha X de Y"
  4. Se erro em alguma linha: pausar, exibir linha com problema
  5. Opções: "Corrigir linha", "Ignorar e continuar", "Cancelar"
  6. Ao final: exibir resumo:
     * "X registros importados com sucesso"
     * "Y registros ignorados (duplicatas)"
     * "Z erros encontrados"

RESULTADO:
- Tabela final exibindo:
  * Ano importado
  * Quantidade de registros por CR
  * Valor total importado
  * Status (Sucesso/Erros)
- Opção "Ver Detalhes" para consultar registros
- Botão "Exportar Log de Importação"
- Botão "Nova Importação"

EXTRA:
- Histórico de importações anteriores:
  * Data/hora da importação
  * Usuário que importou
  * Quantidade de registros
  * Status da operação
```

---

### PROMPT 1.4: Tela de Configurações Gerais

```
Criar tela de configurações e manutenção do sistema:

SEÇÕES:

1. Configurações de Orçamento:
   - Ano atual para cálculos
   - Formato de moeda (R$ por padrão)
   - Número de casas decimais
   - Primeiro mês do exercício fiscal (dropdown 1-12)
   - Permissões:
     * Permitir gestor editar após submeter? (sim/não)
     * Exigir aprovação de todos CRs antes de consolidar? (sim/não)

2. Notificações:
   - Email do remetente de notificações
   - Assunto dos emails automáticos
   - Template de email de abertura de versão
   - Template de email de rejeição
   - Checkbox: "Enviar notificações automáticas"

3. Manutenção:
   - Botão "Backup do Banco de Dados" (exportar estrutura + dados)
   - Botão "Limpar Dados de Teste" (apaga versões antigas ou de testes)
   - Botão "Reindexar Banco" (otimiza performance)
   - Área de logs do sistema

4. Estatísticas:
   - Total de CRs cadastrados
   - Total de contas contábeis ativas
   - Total de versões criadas (todas)
   - Total de versões abertas
   - Último backup realizado
   - Espaço em disco usado

5. Acesso Rápido:
   - Links para todas as telas de cadastro
   - Link para importação de histórico
   - Link para gestão de versões
```

---

## FASE 2: TELAS E FUNCIONALIDADES

### PROMPT 2: Tela de Gestão de Versões

```
Criar tela de gestão de versões orçamentárias com:

1. Listagem principal mostrando:
   - Nome da versão
   - Ano base
   - Status da versão
   - % de CRs preenchidos (ex: "37/50")
   - Data de criação

2. Formulário modal "Criar Nova Versão" com campos:
   - Nome da versão (ex: "Orçamento 2026 - Base")
   - Ano base (input number)
   - Último mês realizado (select 1-12)
   - Observações/Premissas (textarea)

3. Ações disponíveis:
   - Botão "Criar Versão": cria versão nova, cria registros em status_cr_versao para TODOS os CRs ativos com status "Pendente_Preenchimento", exibe notificação de sucesso
   - Botão "Fechar Versão": muda status para "Fechada", trava todas edições
   - Indicador visual de % de preenchimento (barra de progresso)

4. Filtros: Ano, Status

Use componente Grid/Table nativo do Mitra para listagem com paginação.
```

---

### PROMPT 3: Tela de Preenchimento de Orçamento

```
Criar tela de preenchimento de orçamento com:

STRUCTURE:
- Header fixo com: Nome da versão, Nome do CR selecionado
- Seletor de CR (dropdown com todos os CRs ativos)
- Matriz de edição (linhas = contas contábeis, colunas = meses Jan-Dez)

FUNCIONALIDADES:
1. Matriz dinâmica tipo spreadsheet:
   - Linha Y: Contas contábeis (filtrar apenas despesas para começar)
   - Coluna X: Meses (Jan, Fev, Mar... Dez)
   - Cada célula: input numérico para valor planejado

2. Linha de histórico abaixo de cada conta:
   - Mostrar "Realizado Ano Passado" por mês (buscar de historico_contabil)

3. Cálculos automáticos:
   - Total por conta (soma dos 12 meses)
   - Total mensal do CR (soma de todas as contas daquele mês)
   - Total anual do CR (soma total)

4. Controles de edição:
   - Campos editáveis APENAS se versão.status = "Aberta"
   - Se versão.status = "Fechada": campos readonly

5. Botões de ação:
   - "Salvar Rascunho": salva valores mas mantém status "Pendente_Preenchimento"
   - "Finalizar Preenchimento": muda status para "Preenchido", trava edição, exibe confirmação
   - Em caso de sucesso: exibe modal "Orçamento preenchido com sucesso!"

REGRAS:
- Usar componente Grid/Table nativo
- Validações: valores numéricos positivos
- Máscara de moeda para os valores
- Auto-save opcional (debounce após digitação)
- Loading state durante salvamento
```

---

### PROMPT 4: Tela de Visualização do CR

```
Criar tela para visualizar orçamento preenchido por um CR:

STRUCTURE:
1. Seletor de Versão (dropdown)
2. Seletor de CR (dropdown filtrado por CRs com status "Preenchido")
3. Grade igual à tela de preenchimento (readonly) mostrando valores preenchidos
4. Card de Status com informações:
   - Nome do CR
   - Status atual
   - Data/hora da última atualização

FEATURES:
- Exibir linha de comparação com histórico (mesma lógica da tela de preenchimento)
- Highlight de valores que diferem muito do histórico (+/- 30%)
- Botão "Exportar Excel" da grade do CR
- Botão "Voltar para Edição" (se versão ainda aberta)
```

---

### PROMPT 5: Tela de Consolidado da Versão

```
Criar tela de consolidação DRE projetado:

STRUCTURE:
1. Filtro: selecionar versão
2. Filtro de ano (caso versão tenha múltiplos anos)

DADOS EXIBIDOS:
1. KPIs em cards no topo:
   - Receita Total Planejada (soma de todas contas tipo 'Receita')
   - Despesa Total Planejada (soma de todas contas tipo 'Despesa')
   - Resultado Planejado (Receita - Despesa)
   - Valores mensais e acumulado no ano

2. Tabela DRE consolidado:
   - Agrupar contas por tipo
   - Linhas: Receitas, Custos, Despesas Operacionais, etc.
   - Colunas: Meses (Jan-Dez) + Total Ano
   - Formatação: moeda brasileira, valores positivos/negativos

3. Indicador de Status:
   - Card mostrando: "X preenchidos / Y total de CRs"
   - Lista de CRs pendentes (se houver)
   - Barra de progresso visual

AÇÕES:
- Botão "Exportar DRE": gera CSV/Excel com dados consolidados
- Botão "Fechar Versão" (só aparece se 100% preenchido)
- Gráfico opcional: linha temporal mensal de Receita vs Despesa

CÁLCULOS:
- Agregar forecast por CR e contar
- Somar apenas CRs com status = "Preenchido"
- Por linha de conta contábil, somar todos os CRs
- Por mês, somar todas as contas
```

---

### PROMPT 6: Dashboard de Status dos CRs

```
Criar dashboard simples de acompanhamento:

STRUCTURE:
1. Filtro por versão
2. Tabela de CRs com colunas:
   - Nome do CR
   - Status atual
   - Data/hora última atualização
   - % preenchido (calculado: quantas contas já têm valores / total de contas)

VISUAL:
- Badges coloridos por status:
  - Azul: Pendente_Preenchimento
  - Verde: Preenchido

AÇÕES:
- Link "Visualizar" para cada CR (abre tela de visualização)
- Filtros: Status, Ano

FUNCIONALIDADE:
- Atualizar automaticamente quando status muda
- Highlight de CRs em pendência há muito tempo
- Exportar lista para CSV
```

---

## FASE 3: FLUXO E VALIDAÇÕES

### PROMPT 7: Implementar Lógica de Status e Workflow

```
Implementar toda a lógica de controle de status e workflow:

REGRA 1: Quando versão é criada:
- Criar registro em status_cr_versao para CADA centro_resultado ativo
- Status inicial: "Pendente_Preenchimento"
- Timestamp created_at = now()

REGRA 2: Quando usuário clica "Finalizar Preenchimento":
- Validar se existe pelo menos 1 valor preenchido
- Mudar status_cr_versao.status para "Preenchido"
- Travar edição: forecast só pode ser lido (não editado)
- Atualizar campo ultima_submissao = now()

REGRA 3: Bloqueios por status:
- IF status == "Preenchido" AND versao.status != "Fechada":
  - Campo readonly para edição
  - Botão "Voltar para Edição" disponível

- IF versao.status == "Fechada":
  - Todos os campos readonly para todos
  - Impossível editar forecast de CRs preenchidos

REGRA 4: Validação de versão:
- Usuário pode editar qualquer CR se versão estiver "Aberta"
- Usuário não pode editar se versão estiver "Fechada"

Implementar essas regras em todas as telas e endpoints/actions.
```

---

### PROMPT 8: Implementar Cálculos e Consolidações

```
Implementar todas as agregações e cálculos necessários:

1. Calcular Total por Conta:
   SELECT conta_contabil_id, SUM(valor) as total
   FROM forecast_orcamento
   WHERE versao_id = ? AND centro_resultado_id = ?
   GROUP BY conta_contabil_id

2. Calcular Total Mensal do CR:
   SELECT mes, SUM(valor) as total_mes
   FROM forecast_orcamento
   WHERE versao_id = ? AND centro_resultado_id = ?
   GROUP BY mes
   ORDER BY mes

3. Calcular Total Anual do CR:
   SELECT SUM(valor) as total_anual
   FROM forecast_orcamento
   WHERE versao_id = ? AND centro_resultado_id = ?

4. Calcular Consolidação Geral da Versão:
   SELECT
     conta.tipo,
     SUM(f.valor) as total,
     DATE_FORMAT(CONCAT(?,'-',f.mes,'-01'), '%M') as mes
   FROM forecast_orcamento f
   INNER JOIN conta_contabil conta ON f.conta_contabil_id = conta.id
   INNER JOIN status_cr_versao stat ON f.versao_id = stat.versao_id
                                       AND f.centro_resultado_id = stat.centro_resultado_id
   WHERE f.versao_id = ?
     AND stat.status = 'Preenchido'
   GROUP BY conta.tipo, f.mes
   ORDER BY f.mes

5. Calcular Percentual de Preenchimento:
   SELECT
     COUNT(*) FILTER (WHERE status = 'Preenchido') as preenchidos,
     COUNT(*) as total,
     (COUNT(*) FILTER (WHERE status = 'Preenchido') * 100.0 / COUNT(*)) as percentual
   FROM status_cr_versao
   WHERE versao_id = ?

6. Verificar se pode fechar versão:
   SELECT COUNT(*) FROM status_cr_versao
   WHERE versao_id = ? AND status != 'Preenchido'
   # Se retornar 0, pode fechar

Implementar como queries/funções reutilizáveis no Mitra.
Criar indicadores visuais baseados nesses cálculos.
```

---

## FASE 4: OTIMIZAÇÕES

### PROMPT 10: Validações Globais de Negócio

```
Implementar todas as validações de negócio e regras de integridade:

VALIDAÇÃO 1: Ao Salvar Forecast
- Validar: valor >= 0 (não aceitar negativo)
- Validar: valor é numérico (não aceitar texto)
- Validar: valor dentro de limite razoável (ex: < 1 bilhão)

VALIDAÇÃO 2: Ao Finalizar Preenchimento
- Verificar: pelo menos 80% das contas têm valores preenchidos
- Verificar: versão ainda está "Aberta" (não fechada)
- Verificar: há pelo menos 1 mês com valor > 0
- Exibir confirmação: "Tem certeza que deseja finalizar? Após finalização não será possível editar."

VALIDAÇÃO 3: Ao Criar Versão
- Verificar: não existe versão "Aberta" para o mesmo ano
- Validar: ano >= ano atual
- Validar: mês_ultimo_realizado entre 1-12
- Verificar: existem CRs ativos cadastrados
- Verificar: existem contas contábeis ativas

VALIDAÇÃO 4: Ao Fechar Versão
- Verificar: todos os CRs têm status "Preenchido"
- Exibir aviso: "Fechar versão torna os dados imutáveis. Confirmar?"
- Ao confirmar: mudar status para "Fechada"
- Travar todas as edições de forecast dessa versão
- Criar backup automático da consolidação

VALIDAÇÃO 5: Integridade dos Dados
- Antes de consolidar: verificar se todos os valores estão corretos
- Detectar valores extremos (acima de +/-50% do histórico) e alertar
- Verificar consistência: total anual = soma dos meses
- Validar que não há células vazias quando status = "Preenchido"

IMPLEMENTAÇÃO:
- Criar função helper: validarForecast(valor, centro_resultado_id, conta_id)
- Criar função helper: podeFinalizar(versao_id, centro_resultado_id)
- Criar função helper: podeFecharVersao(versao_id)

MENSAGENS DE ERRO:
- Exibir mensagens claras em português
- Exemplo: "Não é possível finalizar. Versão já está fechada."
- Exemplo: "Validação falhou: 60% das contas estão vazias. Mínimo: 80%"
```

---

## INSTRUÇÕES FINAIS

### COMO USAR ESSES PROMPTS NO MITRALAB:

1. **Execute na ordem**: Comece pelo PROMPT 1 (banco de dados)
2. **Valide cada fase**: Teste antes de avançar para próxima
3. **Customize se necessário**: Ajuste nomes de campos ou estruturas conforme sua necessidade
4. **Teste fluxo completo**: Certifique-se que salvamento → finalização → consolidação funciona
5. **Verifique performance**: Use índices adequados para queries de consolidação

### DICAS IMPORTANTES:

- Use componentes nativos de Grid/Table do Mitra para as matrizes
- Implemente paginação para versões e CRs (caso haja muitos)
- Use transactions para garantir consistência (criar versão + criar status_cr_versao)
- Adicione loading states em todas ações que fazem chamadas ao servidor
- Implemente tratamento de erros e mensagens amigáveis em português

### ORDEM DE IMPLEMENTAÇÃO RECOMENDADA:

**FASE PREPARATÓRIA (Cadastros - Dados-mestre):**

1. PROMPT 1 → Banco de dados (estrutura completa)
2. PROMPT 1.0 → Popular tabelas com dados de exemplo
3. PROMPT 1.1 → Cadastro de CRs
4. PROMPT 1.2 → Cadastro de Contas Contábeis
5. PROMPT 1.3 → Importação de Histórico Contábil
6. PROMPT 1.4 → Configurações Gerais

**FASE OPERACIONAL (Funcionalidades principais):** 7. PROMPT 2 → Gestão de versões 8. PROMPT 3 → Preenchimento de orçamento 9. PROMPT 7 → Lógica de status e workflow 10. PROMPT 4 → Visualização do CR 11. PROMPT 8 → Cálculos e consolidações 12. PROMPT 5 → Tela consolidado DRE 13. PROMPT 6 → Dashboard status CRs 14. PROMPT 9 → Salvar rascunho (auto-save) 15. PROMPT 10 → Validações globais de negócio

---

**BOA SORTE! 🚀**
