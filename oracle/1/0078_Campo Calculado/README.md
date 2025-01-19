# Detalhamento da Atividade Realizada

## Contexto  
A atividade consistiu na criação e validação de um campo calculado no Oracle SQL para apresentar o saldo de pedidos de compra, considerando apenas os pedidos cuja previsão de entrega seja inferior à data fim da referência do MRP.

---

## 13/01/2025, 8:30 às 12:50  
Foi realizada a criação de um campo calculado no banco de dados Oracle SQL, com o objetivo de exibir o saldo de pedidos de compra. Este campo foi projetado para identificar exclusivamente os pedidos que possuem previsão de entrega inferior à data de término definida como referência no planejamento de necessidades de materiais (MRP). Durante este período, foram analisados os critérios de inclusão dos dados, e a lógica de cálculo foi cuidadosamente implementada para garantir a precisão das informações apresentadas.

---

## 13/01/2025, 13:40 às 18:35  
Na segunda etapa, foram realizados testes e validações do campo calculado criado. Os resultados foram cruzados com dados existentes para garantir a consistência das informações e a conformidade com os requisitos do MRP. Além disso, foram realizadas otimizações na consulta SQL para melhorar a performance e a eficiência do processamento, considerando o impacto no ambiente de produção e o volume de dados envolvidos. O processo foi concluído com a validação final e a documentação técnica do desenvolvimento.

---

## Código SQL  

```sql
WITH DTA AS (
    SELECT
        imr.codprod,
        MAX(mps.dtfinped) AS dtfinped
    FROM TPRMPS mps
    INNER JOIN TPRIMPS imr ON mps.numps = imr.numps
    WHERE mps.dtfinped IS NOT NULL
    GROUP BY imr.codprod
)
SELECT
    SUM(ITE.QTDNEG - ITE.QTDENTREGUE) AS qtd_pendente
FROM TGFCAB CAB
INNER JOIN TGFITE ITE ON CAB.NUNOTA = ITE.NUNOTA
LEFT JOIN DTA ON ITE.CODPROD = DTA.codprod
WHERE 
    ITE.CODPROD = TPRIMPS.codprod
    AND ITE.PENDENTE = 'S' 
    AND CAB.STATUSNOTA = 'L'
    AND CAB.DTPREVENT < DTA.dtfinped
GROUP BY ITE.CODPROD;
