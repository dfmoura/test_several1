# ETAPA 02 - Cadastros Básicos (Dados Mestre)

## Prompt para o Gemini:

```
Crie procedures/funções SQL para os cadastros básicos do sistema orçamentário:

**1. Gestão de Centros de Resultado (CR)**
- Inserir CR: recebe (nome_cr, email_gestor)
- Listar CRs: retorna (id_cr, nome_cr, email_gestor, ativo)
- Atualizar CR: recebe (id_cr, nome_cr, email_gestor, ativo)
- Desativar CR: recebe id_cr

**2. Gestão de Contas Contábeis**
- Inserir conta: recebe (codigo_conta, descricao, tipo, ativa)
- Listar contas: retorna todas as contas ativas
- Atualizar conta: recebe (id_conta, codigo_conta, descricao, tipo, ativa)
- Desativar conta: recebe id_conta

**3. Gestão de Histórico Contábil**
- Importar histórico: recebe array de (id_cr, id_conta, mes, ano, valor)
- Listar histórico por CR: recebe id_cr e retorna histórico do ano anterior
- Retornar médias históricas: retorna média por conta e mês

Use Oracle SQL com procedures/function. Retorne dados estruturados em formato JSON ou cursor.
```

**Nota:** Histórico pode ser importado via CSV.
