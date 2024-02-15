# Objetivos
```markdown

Controle de acesso nas Ferramentas comerciais.

Diogo conforme alinhado por reunião, segue minha sugestão para tratarmos as “travas” de acessos a resultados de vendedores.
Dentro do cadastro de usuários criarmos uma Flag – PERMITIR ACESSO TOTAL AOS RESULTADOS. Com isso o usuário que tiver isso marcado acessa tudo em relatórios e dash

Caso ele não tiver será utilizado dentro da tela de usuários uma tela adicional que mostra qual CR, EQUIPE ou campo que for determinado como filtro. 

(
VEN.CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) -- CONSULTA VENDEDOR
OR VEN.CODVEND IN (SELECT VEN.CODVEND FROM TGFVEN VEN, TSIUSU USU WHERE USU.CODVEND = VEN.CODGER AND USU.CODUSU = STP_GET_CODUSULOGADO) --CONSULTA GERENTE
OR (SELECT AD_GESTOR_META FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) = 'S' -- CONSULTA MASTER
)


```

### 1. Log's Execução

#### 1.1. 12/02/2024 13:00 as 18:30
```markdown

Satis - Controle de Acesso - Foram implantadas medidas de controle de acesso para as seguintes ferramentas comerciais: - Dash Comparativo Metas Comerciais - Relatório Orçado x Realizado (Metas) - Dash Análise de Metas Comerciais O mecanismo de controle de acesso segue uma hierarquia definida da seguinte forma: 1) Acesso Completo: Os usuários marcados como 'Gestor de Meta' = 'S' (ativado) na guia geral do cadastro de usuários possuem acesso completo às funcionalidades das ferramentas.   
2) Acesso de Gerente: Os usuários gerentes têm permissão para visualizar a movimentação com base nos vendedores que estão sob sua gestão. 3) Acesso de Vendedor: Os usuários vendedores têm acesso restrito e podem visualizar apenas sua própria movimentação. É importante ressaltar que é necessário que tanto os vendedores quanto os gerentes estejam devidamente vinculados ao cadastro de usuários para garantir o correto funcionamento dessas medidas de controle de acesso.

```
