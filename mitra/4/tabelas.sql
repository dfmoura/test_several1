criar o sistema SisOrcam

começar somente criando as tabelas:

tabela: versao_orcamento
campo:
id_versao_orcamento (pk)
nome_versao
ano_base
pronto (sim,não)
status (andamento, aprovado)
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
observacao (comentário opcional do aprovador)
aprovado_por (email ou id do usuário aprovador)
data_envio (quando foi enviado para aprovação)
data_aprovacao (quando foi aprovado ou reprovado)
criado_em
atualizado_em

tabela: aprovador (quero colocar o usurio que deixei como membro do mitra varandasdorio1@gmail.com)
campo
id_aprovador (pk)
nome
email
criado_em
atualizado_em

