# Criando uma Linha com Cor Condicional no iReport 4.0.1

Neste tutorial, vamos aprender como criar uma linha no **iReport 4.0.1** que altera sua cor com base no valor de um campo, utilizando expressões. O objetivo é garantir que, dependendo do valor de um campo específico, a linha altere sua aparência.

## Etapas

### 1. **Criação de Duas Linhas Sobrepostas**

Primeiro, criamos duas linhas sobrepostas no relatório. A ideia aqui é ter duas linhas que serão exibidas com cores diferentes, dependendo da condição aplicada. Uma linha será exibida quando o valor do campo atender a uma condição e a outra será exibida quando o valor for inferior ou igual a essa condição.

### 2. **Adicionando Expressões Condicionais**

A seguir, vamos adicionar as expressões nas propriedades de **"Print When Expression"** para cada uma das linhas. A expressão decide qual linha será impressa com base no valor do campo.

#### Expressão 1 - Quando o valor do campo é maior que 70:
Esta expressão será utilizada para a primeira linha. Quando o valor de `total` for maior que 70, essa linha será impressa.

```java
$F{total}.compareTo(new java.math.BigDecimal(70)) > 0
```

#### Expressão 2 - Quando o valor do campo é menor ou igual a 70:
A segunda linha será impressa quando o valor do campo `total` for menor ou igual a 70. A expressão para essa condição é a seguinte:

```java
$F{total}.compareTo(new java.math.BigDecimal(70)) <= 0
```

### 3. **Definindo as Cores das Linhas**

Com as linhas sobrepostas e as expressões condicionais configuradas, agora podemos configurar as cores das linhas.

- Para a linha com a condição `$F{total}.compareTo(new java.math.BigDecimal(70)) > 0`, podemos definir a cor para **verde** (ou qualquer cor que deseje).
- Para a linha com a condição `$F{total}.compareTo(new java.math.BigDecimal(70)) <= 0`, podemos definir a cor para **vermelho** (ou qualquer outra cor desejada).

### 4. **Resultado Esperado**

Ao executar o relatório, as linhas irão alternar de acordo com o valor do campo `total`:

- Se o valor de `total` for superior a 70, a linha verde será exibida.
- Se o valor de `total` for igual ou inferior a 70, a linha vermelha será exibida.

## Conclusão

Este processo permite personalizar a aparência do seu relatório de forma dinâmica, alterando as cores com base nos dados. O uso das expressões `compareTo` no iReport oferece flexibilidade para realizar comparações numéricas e determinar qual linha será exibida de acordo com a condição definida.
```

Este markdown detalha claramente cada etapa do processo, desde a criação das linhas até a configuração das expressões e cores.