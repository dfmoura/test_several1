criar o sistema orcamento

começar somente criando as tabelas:

tabela: versao_orcamento
campo:
id_versao_orcamento (pk)
nome_versao
ano_base
pronto (sim,não)
criado_em
atualizado_em


tabela: cr
campo:
id_cr (pk)
nome_cr
status (ativo,inativo)
criado_em
atualizado_em

tabelas: contas_contabil
id_conta_contabil (pk)
descricao
tipo (receita,despesa)
status (ativo,inativo)
criado_em
atualizado_em

tabela: lancamento_orcamento
id_orcamento  (pk)
id_versao_orcamento (fk)
id_cr (fk)
id_conta_contabil (fk)
mes (1 a 12)
valor_orçamento


tabela: fluxo_aprovacao_orcamento
campo:
id_fluxo_aprovacao (pk)
id_versao_orcamento (fk) — referência à versão do orçamento
id_aprovador (fk)
status_aprovacao (pendente, aprovado, reprovado)
criado_em
atualizado_em

tabela: aprovador 
campo
id_aprovador (pk)
id_user (fk) (quero que utilize o usuario do workspace mitra varandasdorio1@gmail.com)
nome
criado_em
atualizado_em

