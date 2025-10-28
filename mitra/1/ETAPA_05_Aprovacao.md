# ETAPA 05 - Aprovação/Rejeição

## Prompt para o Gemini:

```
Crie procedures SQL para controladoria aprovar/rejeitar CRs:

**1. Aprovar CR**
- Procedure: APROVAR_CR
- Input: (id_versao, id_cr)
- Ação:
  1. Altera status para 'Aprovado'
  2. Registra data_aprovacao
  3. Verifica se todos os CRs foram aprovados
  4. Se sim, atualiza versão para 'Em Aprovacao' (pronta para consolidar)

**2. Rejeitar CR**
- Procedure: REJEITAR_CR
- Input: (id_versao, id_cr, justificativa)
- Ação:
  1. Altera status para 'Rejeitado'
  2. Registra justificativa_rejeicao
  3. Permite que gestor edite novamente (libera edição)
  4. Notifica gestor por e-mail

**3. Visualizar CR para Aprovação**
- Function: VISUALIZAR_CR_APROVACAO(id_versao, id_cr)
- Retorna: mesma estrutura de VISUALIZAR_MEU_ORCAMENTO mas com dados bloqueados

**4. Listar CRs Pendentes**
- Function: CRS_PENDENTES_APROVACAO(id_versao)
- Retorna: CRs com status 'Enviado_Aprovacao'

Use Oracle SQL. Validar permissão de controladoria antes de executar.
```

**Validação:** Apenas usuário com perfil "Controladoria" pode aprovar.
