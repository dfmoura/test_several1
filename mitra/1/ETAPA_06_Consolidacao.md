# ETAPA 06 - Consolidação e Relatórios

## Prompt para o Gemini:

```
Crie procedures/funções SQL para consolidação e exportação:

**1. Consolidar Versão**
- Function: CONSOLIDAR_VERSAO(id_versao)
- Retorna DRE projetado:
  - Por mês: Receita total, Despesa total, Resultado
  - Por grupo de conta (agrupado por tipo)
  - Total acumulado no ano

**2. Exportar DRE**
- Function: EXPORTAR_DRE_CSV(id_versao)
- Retorna resultado em formato CSV:
  - Linhas: Grupos de contas (Receita, Custo, Despesa)
  - Colunas: Jan, Fev, Mar, ... Dez, Total

**3. KPI Dashboard**
- Function: KPIS_VERSAO(id_versao)
- Retorna:
  - Receita total planejada (ano)
  - Despesa total planejada (ano)
  - Resultado planejado (ano)
  - Quantidade de CRs aprovados
  - Lista de CRs pendentes

**4. Comparativo Histórico vs Planejado**
- Function: COMPARATIVO_HISTORICO(id_versao, id_cr)
- Retorna para cada conta:
  - Valor realizado (ano passado)
  - Valor planejado (novo)
  - Variação (absoluta e %)

Use Oracle SQL. Use FUNC.SQL para formatação de mensagens de erro.
```

**Formato exportação:** CSV com separador vírgula, UTF-8.
