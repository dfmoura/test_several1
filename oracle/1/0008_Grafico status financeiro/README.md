# Objetivos
```markdown

1.1) *Grafico status financeiro
- Dividir a fatia de aberto em duas
- Sendo "Aberto - Atraso" e "Aberto - Regurar"
- Atraso = (vencimento + 3) < data atual


1.2)Devoluções
- Campo obrigatório para motivo de devoluções
- Disponibilizar o campo no layout de devoluções de venda, como obrigatório (tela configurador do layout de notas)
- Ajustar dash para apresenta-lo na tabela de de devoluções

1.3)Notas Excluídas
Criar coluna de notas excluídas junto com o agrupamento de (aprovadas + canceladas + devolvidas)
Notas excluídas (TGFCAB_EXC) com tipo de movimento 'V' e 'D' cujo nunota não conste na tabela TGFCAN


```
     
### 1. Log's Execução
#### 1.1. 04/01/2024 09:00 as 11:00 e 14:00 as 18:00
```markdown
GM - Custo x Rentabilidade - Realizada uma edição no seletor de status, resultando na segmentação do campo 'STATUS' em duas categorias distintas: 'Aberto - Atraso' e 'Aberto - Regular', conforme os critérios estabelecidos.

GM - Custo x Rentabilidade - Adicionalmente, os ajustes foram aplicados nos dois componentes do nível inferior, conhecidos como 'Detalhe'. O SELECT foi atualizado nesses componentes, permitindo a modificação correspondente conforme as necessidades específicas de cada contexto.
```
#### 1.1. 04/01/2024 11:00 as 11:40
```markdown
GM - Custo x Rentabilidade - Implementei uma melhoria significativa no sistema, introduzindo um novo campo denominado 'AD_MOTIVO_DEV' na tabela 'tgfcab'. Além disso, realizei a incorporação desse novo campo nos layouts das telas relacionadas a devoluções, aprimorando assim a experiência do usuário. Para garantir uma visualização otimizada, também ajustei a cláusula SELECT para exibir o campo 'AD_MOTIVO_DEV' sempre que o registro estiver associado a uma operação de devolução.

```
#### 1.1. 04/01/2024 11:40 as 13:00
```markdown
UT - Analise de Vendas - Implementei uma melhoria significativa no sistema, introduzindo um novo campo denominado 'AD_MOTIVO_DEV' na tabela 'tgfcab'. Além disso, realizei a incorporação desse novo campo nos layouts das telas relacionadas a devoluções, aprimorando assim a experiência do usuário. Para garantir uma visualização otimizada, também ajustei a cláusula SELECT para exibir o campo 'AD_MOTIVO_DEV' sempre que o registro estiver associado a uma operação de devolução.

```


