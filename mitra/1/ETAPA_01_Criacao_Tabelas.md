# ETAPA 01 - Criação das Tabelas

## Prompt para o Gemini no Mitralab:

```
Crie as tabelas SQL para um sistema de planejamento orçamentário.

**Estrutura necessária:**

**1. Tabela CENTRO_RESULTADO (CR)**
- id_cr: PK
- nome_cr: texto
- email_gestor: texto (e-mail do responsável)
- ativo: boolean

**2. Tabela CONTA_CONTABIL**
- id_conta: PK
- codigo_conta: texto
- descricao: texto
- tipo: enum (Receita / Despesa)
- ativa: boolean

**3. Tabela HISTORICO_CONTABIL**
- id: PK
- id_cr: FK -> CENTRO_RESULTADO
- id_conta: FK -> CONTA_CONTABIL
- mes: int (1-12)
- ano: int
- valor_realizado: decimal

**4. Tabela VERSAO**
- id_versao: PK
- nome_versao: texto
- ano_base: int
- status: texto (Aberta, Em Aprovacao, Fechada)
- data_criacao: date
- ultimo_mes_realizado: int (1-12)
- observacoes: texto

**5. Tabela STATUS_CR_VERSAO**
- id: PK
- id_versao: FK -> VERSAO
- id_cr: FK -> CENTRO_RESULTADO
- status: enum (Pendente_Preenchimento, Enviado_Aprovacao, Aprovado, Rejeitado)
- data_submissao: datetime
- data_aprovacao: datetime
- justificativa_rejeicao: texto

**6. Tabela FORECAST (planejamento)**
- id: PK
- id_versao: FK -> VERSAO
- id_cr: FK -> CENTRO_RESULTADO
- id_conta: FK -> CONTA_CONTABIL
- mes: int (1-12)
- valor_planejado: decimal

**7. Tabela NOTIFICACAO**
- id: PK
- id_versao: FK -> VERSAO
- id_cr: FK -> CENTRO_RESULTADO
- email_gestor: texto
- data_envio: datetime
- lida: boolean

Use Oracle SQL. Inclua constraints de foreign key e índices apropriados.
```

**Ordem de execução:**

1. Execute no Mitralab
2. Revise se todas as tabelas foram criadas
3. Teste com dados de exemplo
