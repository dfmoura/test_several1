# Objetivos
```markdown
Estornar liberação de limites:
Possibilitar que o liberador possa estornar a liberação de limites

- Criar um botão de ação na tabela TSILIB "correspondete a tela Liberação de Limites"

- Reabrir pedido (TGFCAB.STATUSNOTA = A) e estornar a liberação em questão (TSILIB.DHLIB = NULL e TSILIB.VLRLIBERADO = 0), 
CASO o pedido não esteja faturado (não deve existir registro na TGFVAR com o campo NUNOTAORIG = TSILIB.NUCHAVE) 
e 
não esteja liberado para logística "campo adicional da TGFCAB".

```

### 1. Log's Execução

#### 1.1. 22/03/2024 13:30 as 11:30
```markdown
Satis - Estorno Liberação - 1) Desenvolvemos uma consulta SQL otimizada para extrair os dados da interface de usuário, alinhada com as preferências e seleções específicas realizadas pelo mesmo, garantindo uma recuperação eficiente das informações requeridas. 2) Elaboramos a estrutura completa da procedure destinada a realizar a operação de estorno. Essa estruturação compreende desde a definição dos parâmetros necessários até a lógica de execução detalhada, assegurando um processo robusto e eficaz de reversão de ações.


```

#### 1.1. 25/03/2024 08:00 as 11:30
```markdown
Satis - Estorno Liberação - 3) Implementou-se na rotina uma verificação em cascata. Primeiramente, o sistema verifica se o pedido não está faturado, identificando a ausência de registros na tabela TGFVAR com o campo NUNOTAORIG igual a TSILIB.NUCHAVE. Em seguida, é realizada uma segunda verificação para determinar se a liberação foi autorizada pela logística. Somente após essas condições serem atendidas, o sistema procederá com o estorno da operação.
```

#### 1.1. 25/03/2024 13:00 as 18:00
```markdown
Satis - Estorno Liberação - 4) Foram conduzidos testes rigorosos para avaliar a funcionalidade e a integridade da nova rotina 'STP_ESTORNOLIB_SATIS', desenvolvida com base nas consultas SQL otimizadas e na estruturação completa da procedure destinada ao estorno, conforme mencionado anteriormente. Os testes abrangeram uma variedade de cenários, incluindo casos em que o pedido não estava faturado e a liberação foi autorizada pela logística, garantindo que o sistema seguisse corretamente com o estorno apenas nessas condições. Além disso, foram realizados testes de desempenho para verificar a eficiência da recuperação das informações e a robustez do processo de reversão de ações. Após a conclusão bem-sucedida dos testes, a rotina 'STP_ESTORNOLIB_SATIS' foi considerada pronta para ser implementada em ambiente de produção, demonstrando sua confiabilidade e adequação às necessidades do sistema.
```
