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

