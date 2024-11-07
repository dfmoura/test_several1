# Especificação Técnica para Criação de Relatório com Filtro Multilist

## Objetivo
Criar um relatório no **iReport** que permita filtrar dados com base em grupos de produtos maiores e menores, utilizando parâmetros específicos. O relatório deverá ser ajustado para exibir os dados de acordo com os filtros aplicados.

## Ferramenta Utilizada
- **iReport**: ferramenta de criação de relatórios.

## Parâmetros do Relatório
Os seguintes parâmetros deverão ser configurados como `String` no iReport:

- `$P{GRUPOMAIOR}`: Lista de códigos do grupo maior.
- `$P{GRUPOMENOR}`: Lista de códigos do grupo menor.
- `$P{USARGRUPOMAIOR}`: Indicador (`S` para sim, `N` para não) de uso do filtro de grupo maior.
- `$P{USARGRUPOMENOR}`: Indicador (`S` para sim, `N` para não) de uso do filtro de grupo menor.

Esses parâmetros permitirão definir se o relatório deverá ou não considerar os grupos maiores ou menores na consulta.

## Consulta SQL

A consulta SQL deve ser configurada no **source** do iReport da seguinte forma:

```sql
SELECT
    codgrupoprod,
    descrgrupoprod
FROM
    tgfgru
WHERE
    (
        $P{USARGRUPOMAIOR} = 'S'
        AND codgrupoprod IN ($P!{GRUPOMAIOR})
    )
    OR
    (
        $P{USARGRUPOMENOR} = 'S'
        AND codgrupoprod IN ($P!{GRUPOMENOR})
    )
    OR
    (
        ($P{USARGRUPOMAIOR} IS NULL OR $P{USARGRUPOMAIOR} = 'N')
        AND ($P{USARGRUPOMENOR} IS NULL OR $P{USARGRUPOMENOR} = 'N')
    )
    OR
    (
        ($P{USARGRUPOMAIOR} = 'S')
        AND ($P{USARGRUPOMENOR} = 'S')
    )
```

### Explicação dos Filtros
1. **Filtro de Grupo Maior**: Se `$P{USARGRUPOMAIOR} = 'S'`, o relatório filtra os registros onde `codgrupoprod` pertence à lista `$P{GRUPOMAIOR}`.
2. **Filtro de Grupo Menor**: Se `$P{USARGRUPOMENOR} = 'S'`, o relatório filtra os registros onde `codgrupoprod` pertence à lista `$P{GRUPOMENOR}`.
3. **Sem Filtro**: Se ambos `$P{USARGRUPOMAIOR}` e `$P{USARGRUPOMENOR}` forem `NULL` ou `N`, o relatório trará todos os registros sem filtro.
4. **Filtro Conjunto**: Se ambos os parâmetros `$P{USARGRUPOMAIOR}` e `$P{USARGRUPOMENOR}` estiverem definidos como `S`, ambos os filtros serão aplicados.

## Layout do Relatório
Ajustar o layout do relatório no iReport para:

- Exibir os campos `codgrupoprod` e `descrgrupoprod`.
- Incluir cabeçalho e rodapé conforme o padrão utilizado.
- Garantir a disposição adequada dos filtros selecionados.

## Dashboard e Integração com iReport

1. **Criar Dashboard**: Configurar um dashboard que utilize o relatório criado como componente.
2. **Endereçar o Relatório no Dashboard**: Incorporar o caminho do relatório iReport ao componente do dashboard.
3. **Importar Parâmetros**: Garantir que os parâmetros do iReport sejam passados e aplicados corretamente no dashboard.

## Conclusão
Após a implementação dos ajustes no layout e a configuração dos parâmetros, o relatório estará pronto para uso no dashboard, permitindo a filtragem dos dados de acordo com as necessidades de grupos maiores e menores.
