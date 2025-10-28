# Prompts para Desenvolvimento Cadenciado

## ETAPA 1: Criação do Schema do Banco de Dados

```
Crie o schema MySQL para o Sistema de Gestão de Orçamento com as seguintes tabelas:

1. versao_orcamento: id, nome, descricao, data_criacao, status
2. responsavel: id, nome, email, cargo, ativo
3. cr: id, codigo, nome, id_versao, id_responsavel
4. plano_contas: id, codigo, descricao, tipo
5. cr_conta: id, id_cr, id_plano_conta, valor_orcado, valor_aprovado, observacao

Adicione as FOREIGN KEYS apropriadas.
```

---

## ETAPA 2: População de Dados de Teste

```
Popule o banco com dados de teste coerentes:

- 2 versões de orçamento (Orçamento 2025, Revisão 2025)
- 5 responsáveis com emails e cargos distintos
- 8 CRs distribuídos entre as versões
- 15 contas no plano de contas (mix receita/despesa)
- Valores orçados variados para cr_conta (5-10 registros por CR)

Inclua alguns valores aprovados também.
```

---

## ETAPA 3: API Backend - Endpoints CRUD Básicos

```
Crie APIs REST para:

1. Versão de Orçamento: GET, POST, PUT, DELETE
2. Responsável: GET, POST, PUT, DELETE
3. CR: GET, POST, PUT, DELETE (com filtro por versão)
4. Plano de Contas: GET, POST (somente leitura após criação)
5. CR Conta: GET, POST, PUT (filtro por CR)

Use framework web simples (Flask/FastAPI/Express) com MySQL.
```

---

## ETAPA 4: API Backend - Consultas Agregadas

```
Crie endpoints de consulta consolidada:

1. GET /versao/{id}/total-por-cr → soma por CR
2. GET /versao/{id}/total-por-conta → soma por conta
3. GET /cr/{id}/resumo → valores orçados vs aprovados
4. GET /versao/{id}/status-crs → lista CRs com status

Retorne JSON estruturado.
```

---

## ETAPA 5: API Backend - Workflow de Aprovação

```
Implemente o fluxo de aprovação:

1. Endpoint para submeter CR (atualiza status)
2. Endpoint para aprovar/rejeitar (gestor)
3. Validação: só permite aprovar se todos os valores preenchidos
4. Registro em histórico_aprovacao
5. GET /cr/{id}/historico

Usar transações para garantir integridade.
```

---

## ETAPA 6: Frontend - Páginas Iniciais

```
Crie interface web com:

1. Lista de versões de orçamento (cards)
2. Detalhes da versão (grid de CRs)
3. Tela de CR (lista de contas com valores)

HTML/CSS básico ou framework (Bootstrap/Tailwind).
Inclua formulários simples.
```

---

## ETAPA 7: Frontend - Funcionalidades de Edição

```
Adicione ao frontend:

1. Formulário de criação/edição de CR
2. Tela de edição de valores orçados (cr_conta)
3. Validação: não permitir valores negativos
4. Botão de submissão/aprovação

Implemente feedback visual (success/error).
```

---

## ETAPA 8: Frontend - Relatórios e Consolidação

```
Crie telas de relatórios:

1. Dashboard da versão (totais consolidados)
2. Gráfico de barras: valores por CR
3. Exportação: CSV dos dados principais
4. Comparação entre versões (se houver múltiplas)

Use bibliotecas de gráficos (Chart.js/D3).
```

---

## ETAPA 9: Validações e Permissões

```
Implemente segurança básica:

1. Validação de campos obrigatórios
2. Verificação de permissões (autor vs aprovador)
3. Bloqueio de edição após aprovação
4. Logs de alterações

Adicione mensagens de erro claras.
```

---

## ETAPA 10: Testes e Documentação

```
Finalize o sistema:

1. Teste unitário: operações CRUD
2. Teste de integração: fluxo completo
3. Documentação da API (Swagger/markdown)
4. README com instruções de instalação

Garanta que todos os fluxos principais funcionam.
```
