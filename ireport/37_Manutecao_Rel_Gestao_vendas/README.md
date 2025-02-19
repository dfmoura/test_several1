# Demanda Técnica - Implementação de Controle de Acesso no Relatório '144 - GESTÃO DE VENDAS'

## Identificação
**ID da Demanda:** 225  

## Objetivo
Implementar controle de acesso no **select** do relatório **'144 - GESTÃO DE VENDAS'** com base na hierarquia de usuários do setor comercial. O acesso será segmentado conforme os papéis definidos:  
- **Vendedor**: Acesso apenas aos seus próprios dados.  
- **Coordenador**: Acesso aos dados dos vendedores sob sua coordenação.  
- **Gerente**: Acesso aos dados dos coordenadores e vendedores sob sua gestão.  

A implementação deve seguir a mesma lógica já existente em outras ferramentas do setor comercial.  

## Regras de Controle de Acesso
A consulta SQL deverá garantir que os dados sejam filtrados corretamente de acordo com a relação hierárquica entre os usuários. O critério de acesso será baseado no campo `CODVEND` da tabela `TGFVEN`, considerando os seguintes níveis:

1. **Vendedor**: Terá acesso apenas aos seus próprios registros.  
2. **Coordenador**: Poderá visualizar os registros dos vendedores que lhe estão subordinados.  
3. **Gerente**: Poderá visualizar os registros dos coordenadores e vendedores sob sua supervisão.  
4. **Gestor Geral**: Terá acesso irrestrito ao relatório.

A implementação será realizada conforme a seguinte cláusula SQL:

```sql
AND (
    CODVEND = (SELECT CODVEND FROM TSIUSU WHERE CODUSU = STP_GET_CODUSULOGADO) 
    OR CODVEND IN (
        SELECT VEN.CODVEND 
        FROM TGFVEN VEN, TSIUSU USU 
        WHERE USU.CODVEND = VEN.CODGER 
        AND USU.CODUSU = STP_GET_CODUSULOGADO
    )
    OR CODVEND IN (
        SELECT VEN.CODVEND 
        FROM TGFVEN VEN, TSIUSU USU 
        WHERE USU.CODVEND = VEN.AD_COORDENADOR 
        AND USU.CODUSU = STP_GET_CODUSULOGADO
    )
    OR (
        SELECT AD_GESTOR_META 
        FROM TSIUSU 
        WHERE CODUSU = STP_GET_CODUSULOGADO
    ) = 'S'
)
```

## Log de Atividade  

**Data:** 19/02/2025  
**Horário:** 12:30 às 15:00  

Foi realizada a atualização da cláusula **SELECT** no relatório **'144 - GESTÃO DE VENDAS'** e seus respectivos sub-relatórios, garantindo a aplicação correta da hierarquia de acessos conforme a estrutura definida (**Gerente << Coordenador << Vendedor**).  

Além disso, foram efetuadas as permissões específicas para os usuários **FRANCIELLE.FERREIRA** e **KIRLEY.MARTINS**, concedendo-lhes acesso ao relatório. A alteração foi validada para assegurar a integridade dos filtros de acesso e evitar exposição indevida de informações.  
