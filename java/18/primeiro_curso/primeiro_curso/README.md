### Primeiro Botão de Ação

Este documento explica o código fornecido que implementa um botão de ação no contexto de um projeto Java.

---

#### Descrição Geral

O código cria uma classe `PrimeiroBotaoDeAcao` que implementa a interface `AcaoRotinaJava`. Esta interface é utilizada em aplicações da plataforma Sankhya para definir botões de ação personalizados. Ao clicar no botão associado, a lógica definida na implementação será executada.

---

#### Explicação por Bloco

1. **Pacote e Importações**
   ```java
   package br.com.satyuacode.primeiro_curso;
   ```
   Define o pacote em que a classe está localizada.

   ```java
   import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
   import br.com.sankhya.extensions.actionbutton.ContextoAcao;
   ```
   Importa as interfaces e classes necessárias da API Sankhya para criar um botão de ação.

---

2. **Declaração da Classe**
   ```java
   public class PrimeiroBotaoDeAcao implements AcaoRotinaJava {
   ```
   Declara a classe `PrimeiroBotaoDeAcao` e indica que ela implementa a interface `AcaoRotinaJava`. Isso significa que a classe deve fornecer uma implementação para o método `doAction`.

---

3. **Implementação do Método `doAction`**
   ```java
   @Override
   public void doAction(ContextoAcao contextoAcao) throws Exception {
       System.out.println("Satya Code - Primeiro Projeto");
       contextoAcao.setMensagemRetorno("Nosso primeiro projeto");
   }
   ```
    - **`@Override`**: Indica que o método sobrescreve um definido na interface `AcaoRotinaJava`.
    - **`doAction(ContextoAcao contextoAcao)`**: Método obrigatório, executado quando o botão é acionado.
        - **`System.out.println`**: Exibe a mensagem "Satya Code - Primeiro Projeto" no console.
        - **`contextoAcao.setMensagemRetorno`**: Define a mensagem de retorno exibida ao usuário no contexto da aplicação, informando que o projeto foi executado com sucesso.

---

#### Resultado Esperado

Quando o botão associado a esta ação for clicado:
1. Uma mensagem será exibida no console:
   ```
   Satya Code - Primeiro Projeto
   ```
2. A interface do usuário exibirá a mensagem:
   ```
   Nosso primeiro projeto
   ```