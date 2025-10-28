# ETAPA 03 - Gestão de Versões

## Prompt para o Gemini:

```
Crie procedures/funções SQL para gestão de versões orçamentárias:

**1. Criar Nova Versão**
- Procedure: CRIAR_VERSAO
- Input: (nome_versao, ano_base, ultimo_mes_realizado, observacoes)
- Ação:
  1. Insere na tabela VERSAO com status 'Aberta'
  2. Para cada CR ativo, cria registro em STATUS_CR_VERSAO com status 'Pendente_Preenchimento'
  3. Para cada CR ativo, cria registro em NOTIFICACAO
  4. Retorna ID da versão criada

**2. Listar Versões**
- Function: LISTAR_VERSOES
- Retorna: (id_versao, nome_versao, ano_base, status, data_criacao, total_crs, crs_aprovados)

**3. Fechar Versão**
- Procedure: FECHAR_VERSAO
- Input: id_versao
- Ação:
  1. Valida se todos os CRs estão 'Aprovado'
  2. Se sim, atualiza status da versão para 'Fechada'
  3. Se não, retorna erro listando CRs pendentes

**4. Status dos CRs por Versão**
- Function: STATUS_CRS_POR_VERSAO(id_versao)
- Retorna: (nome_cr, email_gestor, status, data_submissao, data_aprovacao)

Use Oracle SQL. Trate erros e retorne mensagens via FUNC.SQL.
```

**Regra:** Versão só fecha se TODOS os CRs estiverem 'Aprovado'.
