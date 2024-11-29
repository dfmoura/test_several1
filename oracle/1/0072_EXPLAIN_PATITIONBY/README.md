### Explicação do código SQL com `PARTITION BY`

O código faz uma consulta na tabela `TGFCAB` para calcular a soma do valor das notas (`VLRNOTA`) para cada empresa (`CODEMP`) usando a cláusula `PARTITION BY` no cálculo da soma com a função analítica `SUM`.

#### Descrição detalhada:


1. **Função Analítica `SUM`**:
   - Após reunir os dados com a subquery, a consulta principal usa a função `SUM` como uma função analítica:
     ```sql
     SUM(VLRNOTA) OVER (PARTITION BY CODEMP) AS SOMA_VLRNOTA
     ```
   - **`SUM(VLRNOTA)`**: Calcula a soma do valor das notas.
   - **`OVER`**: Define que esta soma será calculada como uma operação analítica, mantendo os registros originais.
   - **`PARTITION BY CODEMP`**: Agrupa os dados por empresa (`CODEMP`), ou seja, a soma será calculada separadamente para cada código de empresa.

   O resultado é que para cada registro, será exibida a soma total de `VLRNOTA` de todos os registros que pertencem à mesma empresa (`CODEMP`), sem colapsar os dados.

2. **Colunas Selecionadas**:
   - A consulta principal retorna:
     - `CODEMP`: Código da empresa.
     - `NUNOTA`: Número da nota.
     - `VLRNOTA`: Valor da nota.
     - `SOMA_VLRNOTA`: Soma total do valor das notas para cada empresa.

---

### Exemplo do Resultado:

Se `TGFCAB` contiver os seguintes dados:

| CODEMP | NUNOTA | VLRNOTA |
|--------|--------|---------|
| 1      | 1001   | 200.00  |
| 1      | 1002   | 300.00  |
| 2      | 2001   | 150.00  |
| 2      | 2002   | 350.00  |

O resultado seria algo como:

| CODEMP | NUNOTA | VLRNOTA | SOMA_VLRNOTA |
|--------|--------|---------|--------------|
| 1      | 1001   | 200.00  | 500.00       |
| 1      | 1002   | 300.00  | 500.00       |
| 2      | 2001   | 150.00  | 500.00       |
| 2      | 2002   | 350.00  | 500.00       |

#### Importância do `PARTITION BY`:
- Ele divide os dados em "partições" (neste caso, uma partição para cada `CODEMP`).
- A função analítica é aplicada dentro de cada partição, calculando resultados independentes para cada empresa sem interferir nos dados de outras empresas.

Se o `PARTITION BY` fosse omitido, a soma seria calculada para todos os registros juntos, resultando na soma total de todas as empresas em cada linha.