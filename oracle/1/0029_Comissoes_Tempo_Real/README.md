# Objetivos
```markdown
Comissoes em tempo real.

Contextualização

A rotina de comissionamento da Satis é personalizada, e centralizada na tela "Comissão Satis" (tabela mestre AD_DBFECHCOM), nessa tela existe a aba "Comissão Futura" (tabela filha AD_DBFECHCOMNOTASA), essa aba apresenta a  comissão futura dos vendedores, as informações são gravadas nessa tabela na execução do botão de ação "1 - Atualizar Resumo".


Demanda
A demanda está em tornar os dados da aba "Comissão Futura" (tabela filha AD_DBFECHCOMNOTASA) em TEMPO REAL, visto que atualmente os dados são gravados na execução do botão apenas, algo que é feito apenas no fechamento da comissão (1 vez ao mês).

Essa demanda deve ser atendida através da conversão da tabela  AD_DBFECHCOMNOTASA em TABELA COM VIEW.

Após execução a ação acima, o sistema irá criar uma view chamada AD_DBFECHCOMNOTASA, essa view deverá ser atualizada para apresentar a comissão futura em tempo real, isso pode ser feito utilizando o SELECT que é utilizado atualmente para fazer o INSERT na referida tabela pelo botão de ação "1 - Atualizar Resumo". Segue o SELECT a seguir, por favor, atualize a view com esse SELECT.


SELECT FECH.NUFECH , ROWNUM, CAB.NUNOTA, CAB.CODEMP, CAB.NUMNOTA, CAB.DTNEG, CAB.CODPARC, FIN.NUFIN, FIN.DTVENC, FIN.DHBAIXA,
         FIN.VLRDESDOB * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END ,
        ROUND(
        (FIN.VLRDESDOB
        - ((CAB.VLRICMS / (SELECT SUM(VLRDESDOB) FROM TGFFIN WHERE NUNOTA = CAB.NUNOTA)) * FIN.VLRDESDOB)
        - NVL((CASE WHEN CCM.AD_DIMINUIBASE = 'S' THEN 0 ELSE ((CAB.VLRNOTA - CAB.VLRICMS) * (SELECT SUM(PERCCOM) FROM TGFCCM WHERE NUNOTA = CAB.NUNOTA AND AD_DIMINUIBASE = 'S')/100) / (SELECT SUM(VLRDESDOB) FROM TGFFIN WHERE NUNOTA = CAB.NUNOTA) * FIN.VLRDESDOB END),0)
        ) * CCM.PERCCOM / 100,6)
         * CASE WHEN CAB.TIPMOV = 'D' THEN -1 ELSE 1 END ,
         CCM.CODVEND, CAB.TIPMOV,
         ((CAB.VLRICMS / (SELECT SUM(VLRDESDOB) FROM TGFFIN WHERE NUNOTA = CAB.NUNOTA)) * FIN.VLRDESDOB),
        NVL((CASE WHEN CCM.AD_DIMINUIBASE = 'S' THEN 0 ELSE ((CAB.VLRNOTA - CAB.VLRICMS) * (SELECT SUM(PERCCOM) FROM TGFCCM WHERE NUNOTA = CAB.NUNOTA AND AD_DIMINUIBASE = 'S')/100) / (SELECT SUM(VLRDESDOB) FROM TGFFIN WHERE NUNOTA = CAB.NUNOTA) * FIN.VLRDESDOB END),0),
        FIN.VLRDESC
          FROM AD_DBFECHCOM FECH, TGFCAB CAB, TGFPAR PAR, TGFFIN FIN, TSIEMP EMP, TGFTOP TPO, TGFVEN VEN, TGFTPV TPV, TGFCCM CCM
        WHERE CAB.CODPARC = PAR.CODPARC
           AND CAB.NUNOTA = FIN.NUNOTA
           AND CAB.CODEMP = EMP.CODEMP
           AND CAB.CODTIPOPER = TPO.CODTIPOPER
           AND CAB.DHTIPOPER = TPO.DHALTER
           AND CAB.CODTIPVENDA = TPV.CODTIPVENDA
           AND CAB.DHTIPVENDA = TPV.DHALTER
           AND CAB.NUNOTA = CCM.NUNOTA
           AND CCM.CODVEND = VEN.CODVEND
           AND TPO.ATUALCOM = 'C'
           AND NVL(VEN.AD_DESLIGADO,'N') = 'N'
           AND CAB.STATUSNOTA = 'L'
           AND FIN.DTVENC >= FECH.DTINICIO
           AND FECH.NUFECH = 43
           AND NOT EXISTS (SELECT 1 FROM AD_DBFECHCOMNOTAS WHERE NUFIN = FIN.NUFIN AND CODVEND = CCM.CODVEND)
           --AND FIN.DHBAIXA IS NULL
           AND FIN.AD_NUFECH IS NULL


Por fim será necessário comentar  o trecho responsavel por fazer o INSERT na tabela AD_DBFECHCOMNOTASA, que agora será uma VIEW, para tanto atualize o código da procedure DB_ATUALIZA_RESUMO_FECH.




```

### 1. Log's Execução


#### 1.1. 01/04/2024 08:00 as 11:30
```markdown
SATIS - Comissoes em tempo real - 1) Foi implementada uma otimização no sistema por meio da transição da estrutura da tabela adicional AD_DBFECHCOMNOTASA para uma visualização (view). Essa adaptação visa aprimorar a eficiência e a integridade dos dados, além de proporcionar uma melhor gestão e manipulação das informações contidas.2) Além disso, procedemos com uma atualização significativa no comando SELECT da visualização (view) e nos campos associados à tabela adicional AD_DBFECHCOMNOTASA, os quais refletem a estrutura da visualização. Essa intervenção foi realizada com o intuito de corrigir quaisquer inconsistências nos tipos de dados identificados durante a tentativa de exibição da interface da visualização. Essas melhorias garantem uma representação precisa e coerente dos dados, promovendo uma experiência de usuário mais fluida e livre de erros.

```

#### 1.2. 01/04/2024 13:00 as 18:30
```markdown
SATIS - Comissoes em tempo real - 3) Após a implementação da otimização no sistema, realizamos testes para garantir a eficácia e a integridade das mudanças realizadas.4)Verificação da consistência dos dados na tabela adicional AD_DBFECHCOMNOTASA antes e depois da transição para a visualização (view).Comparação entre os dados exibidos na interface da visualização e os dados originais da tabela adicional para garantir que não houve perda ou corrupção de informações.5)Verificação da funcionalidade da visualização (view) após a transição da estrutura da tabela adicional.Execução de consultas utilizando o SELECT atualizado na visualização para confirmar que os resultados retornados estão corretos e consistentes com os requisitos do sistema.6)Após a conclusão dos testes em ambiente de desenvolvimento e validação, a implementação foi levada para o ambiente de produção.

```

