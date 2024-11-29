# Demanda

### Automatizar a TOP e Série do Faturamento por Contrato

- **Criar campo** na tela de contratos (TCSCON) para indicar a TOP e outro campo (texto) para indicar a série do contrato.
- **Reiniciar a unidade de dados** assim que criar esses campos, pois caso contrário pode bloquear o uso da tela.

### Criar evento para atualizar a TOP e Série da nota faturada a partir do contrato

- Quando o contrato tiver mais de um produto/serviço, o faturamento do contrato deve gerar uma única nota com todos os produtos/serviços.
- Caso a personalização altere a TOP/Série antes da inserção do último produto, o sistema pode gerar notas separadas.
- **Evento a ser criado na TGFITE**: 
  - Disparado na inclusão de itens em notas originadas de contrato (`NVL(TGFCAB.NUMCONTRATO,0) <>0`).
  - O evento atualiza a TOP e Série do contrato **apenas quando o total de itens incluídos na nota for igual ao total de itens do contrato (TCSPSC)**.
- Para atualizar a TOP do contrato (`TGFCAB.CODTIPOPER`), também deve ser atualizado o campo `TGFCAB.DHTIPOPER` com a data mais recente da TOP (`MAX(DHALTER) FROM TGFTOP`).

---

# Entendimento

Criar um evento `AFTER insert` na tabela `TGFITE`, que será executado apenas quando o total de itens do contrato na tabela `TCSPSC` for igual ao total de itens da nota sendo faturada.

Este evento deve garantir que:

1. **Itens correspondam exclusivamente** aos itens relacionados ao contrato.
2. Se a condição for satisfeita, as seguintes atualizações ocorrerão:
   - **Atualizar a TOP (Tipo de Operação)** da nota conforme a TOP do contrato:
     - Atualizar o campo `CODTIPOPER` na tabela `TGFCAB`.
     - Atualizar o campo `DHTIPOOPER` com a data e hora mais recente da `TGFTOP`.
   - **Atualizar a série da nota** de acordo com a série da nota do contrato:
     - Atualizar o campo `SERIENOTA` na tabela `TGFCAB`.
   - **Atualizar o TIPMOV** na `TGFCAB` com o `TIPMOV` da `TGFTOP`, apenas se for diferente do `TIPMOV` da nota em faturamento.

---

# Esboço

```sql
ANTES OU DEPOIS
  DE INCLUIR
  DE ATUALIZAR
  DE EXCLUIR

IF NÚMERO DO CONTRATO DA NOTA É DIFERENTE DE 0 E SE O CONTRATO TIVER TOP PADRÃO THEN
  -- SIGNIFICA QUE A NOTA TEVE ORIGEM EM CONTRATO

  P_ITENS_NOTA = CONTAR A QUANTIDADE DE ITENS DA NOTA
  P_ITENS_CON = CONTAR A QUANTIDADE DE ITENS DO CONTRATO

  IF P_ITENS_NOTA = P_ITENS_CON THEN
    UPDATE TGFCAB SET CODTIPOPER = P_TOP, DHTIPOPER = P_DATATOP, TIPMOV = P_TIPMOV, SERIENOTA = P_SERIE 
    WHERE NUNOTA = FIELD_NUNOTA
  END IF;
END IF;


`-------------------
### Evento Final
`


CREATE OR REPLACE PROCEDURE STP_ATU_CONTRATO_FAT_SATIS (
    P_TIPOEVENTO INT,    -- Identifica o tipo de evento
    P_IDSESSAO VARCHAR2, -- Identificador da execução
    P_CODUSU INT         -- Código do usuário logado
) AS
    BEFORE_INSERT INT;
    AFTER_INSERT  INT;
    BEFORE_DELETE INT;
    AFTER_DELETE  INT;
    BEFORE_UPDATE INT;
    AFTER_UPDATE  INT;
    BEFORE_COMMIT INT;

    v_total_tgfite INT;
    v_total_tcspsc INT;
    V_NUMCONTRATO INT;
    V_NUNOTA INT;
    V_TOP INT;
    V_SERIENOTA VARCHAR2(300);
    V_DHALTER DATE;
    V_TIPMOV VARCHAR2(30);
BEGIN
    -- Definir valores para os tipos de eventos
    BEFORE_INSERT  := 0;
    AFTER_INSERT   := 1;
    BEFORE_DELETE  := 2;
    AFTER_DELETE   := 3;
    BEFORE_UPDATE  := 4;
    AFTER_UPDATE   := 5;
    BEFORE_COMMIT  := 10;

    IF  P_TIPOEVENTO = AFTER_INSERT OR P_TIPOEVENTO = AFTER_UPDATE THEN
        V_NUNOTA := EVP_GET_CAMPO_INT(P_IDSESSAO, 'NUNOTA');
        SELECT NUMCONTRATO INTO V_NUMCONTRATO FROM TGFCAB WHERE NUNOTA = V_NUNOTA;
        SELECT AD_TOPCONTRATO, AD_SERIECONTRATO INTO V_TOP, V_SERIENOTA FROM TCSCON WHERE NUMCONTRATO = V_NUMCONTRATO;

        IF NVL(V_NUMCONTRATO, 0) <> 0 AND NVL(V_TOP, 0) <> 0 AND V_SERIENOTA IS NOT NULL THEN
            -- Contar o total de linhas de TGFITE para o contrato atual na sessão (em transação)
            SELECT COUNT(*)
            INTO v_total_tgfite
            FROM TGFITE ITE
            INNER JOIN TGFCAB CAB ON ITE.NUNOTA = CAB.NUNOTA
            WHERE CAB.NUNOTA = V_NUNOTA;

            -- Contar o total de linhas de TCSPSC para o mesmo contrato
            SELECT COUNT(*)
            INTO v_total_tcspsc
            FROM TCSPSC
            WHERE NUMCONTRATO = v_numcontrato;

            -- Comparar os totais de TGFITE (sessão atual) e TCSPSC
            IF v_total_tgfite = v_total_tcspsc THEN
                SELECT MAX(DHALTER) INTO V_DHALTER FROM TGFTOP WHERE CODTIPOPER = V_TOP;
                SELECT TIPMOV INTO V_TIPMOV 
                FROM TGFTOP 
                WHERE CODTIPOPER = V_TOP 
                  AND DHALTER = (SELECT MAX(DHALTER) FROM TGFTOP WHERE CODTIPOPER = V_TOP)
                GROUP BY TIPMOV;

                UPDATE TGFCAB SET CODTIPOPER = V_TOP, DHTIPOPER = V_DHALTER, SERIENOTA = V_SERIENOTA, TIPMOV = V_TIPMOV
                WHERE NUNOTA = V_NUNOTA;
            END IF;
            COMMIT;
        END IF;
    END IF;
END;
/
