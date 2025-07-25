# Documentação: `crud_conteudohtml5.jsp`

## Objetivo

Este arquivo demonstra como criar um CRUD (Create, Read, Update, Delete) básico utilizando HTML5, JavaScript e integração com o SankhyaJX para manipulação de dados de uma tabela (`AD_CONTEUDOHTML5`) no banco de dados Sankhya. O exemplo é voltado para uso no construtor de componentes BI do Sankhya.

---

## Estrutura Geral

- **Tecnologias Utilizadas:**
  - HTML5
  - CSS (TailwindCSS para estilização rápida)
  - JavaScript (com SankhyaJX para integração com o banco)
  - Font Awesome (ícones)
  - JSP (para integração com o ambiente Sankhya)

---

## Seções do Código

### 1. Cabeçalho JSP e HTML

```jsp
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
  ...
  <snk:load/>
</head>
```
- Define a página como JSP, com codificação UTF-8.
- Carrega TailwindCSS, Font Awesome e SankhyaJX.
- `<snk:load/>` é um tag Sankhya para carregar recursos necessários do ambiente.

---

### 2. Corpo da Página

#### 2.1. Título e Botão de Novo Registro

```html
<h1>CRUD Conteúdo HTML5</h1>
<button id="btnAdd">Novo Registro</button>
```
- Exibe o título da página.
- Botão para abrir o modal de cadastro de novo registro.

#### 2.2. Tabela de Dados

```html
<table>
  <thead>...</thead>
  <tbody id="tbodyDados">
    <!-- Dados dinâmicos -->
  </tbody>
</table>
```
- Estrutura da tabela para exibir os registros da tabela `AD_CONTEUDOHTML5`.
- O corpo da tabela (`tbodyDados`) é preenchido dinamicamente via JavaScript.

#### 2.3. Mensagens

```html
<div id="msg"></div>
```
- Área para exibir mensagens de sucesso ou erro ao usuário.

---

### 3. Modais

#### 3.1. Modal de Cadastro/Edição

```html
<div id="modalForm" class="modal">
  <form id="formCrud">
    <input type="hidden" id="inputId">
    <input type="text" id="inputNome">
    <input type="number" id="inputValor">
    <input type="date" id="inputData">
    <button type="button" id="btnCancel">Cancelar</button>
    <button type="submit">Salvar</button>
  </form>
</div>
```
- Modal para cadastrar ou editar registros.
- Campos: Nome, Valor, Data.
- Botões para cancelar ou salvar.

#### 3.2. Modal de Confirmação de Exclusão

```html
<div id="modalDelete" class="modal">
  <button type="button" id="btnCancelDelete">Cancelar</button>
  <button type="button" id="btnConfirmDelete">Excluir</button>
</div>
```
- Modal para confirmar a exclusão de um registro.

---

### 4. JavaScript: Lógica do CRUD

#### 4.1. Variáveis de Controle

```js
let editId = null;
let deleteId = null;
```
- Controlam o registro em edição ou exclusão.

#### 4.2. Funções de Utilidade

- **showMsg:** Exibe mensagens temporárias ao usuário.
- **openModal/closeModal:** Abrem/fecham o modal de cadastro/edição.
- **openDeleteModal/closeDeleteModal:** Abrem/fecham o modal de exclusão.
- **formatDataColuna:** Formata a data para exibição na tabela.
- **formatDateToBR:** Converte data do formato `YYYY-MM-DD` para `DD/MM/YYYY`.

#### 4.3. Listar Dados

```js
function listarDados() {
  JX.consultar('SELECT * FROM AD_CONTEUDOHTML5 ORDER BY ID').then(res => {
    // Preenche a tabela com os dados retornados
  });
}
```
- Consulta todos os registros da tabela e preenche a tabela HTML.

#### 4.4. Buscar Próximo ID

```js
function getNextId() {
  return JX.consultar('SELECT NVL(MAX(ID),0)+1 AS NEXT_ID FROM AD_CONTEUDOHTML5').then(res => res[0].NEXT_ID);
}
```
- Busca o próximo ID disponível (não é usado diretamente no cadastro, pois o banco pode gerar o ID).

#### 4.5. Salvar (Criar ou Editar)

```js
document.getElementById('formCrud').onsubmit = async function(e) {
  // Valida campos
  // Se editando, atualiza registro existente
  // Se novo, insere registro novo
  // Usa JX.salvar para persistir no banco
};
```
- Valida os campos do formulário.
- Se for edição, atualiza o registro pelo ID.
- Se for novo, insere sem o ID (deixa o banco gerar).
- Após salvar, fecha o modal e atualiza a lista.

#### 4.6. Excluir Registro

```js
document.getElementById('btnConfirmDelete').onclick = function() {
  JX.deletar('AD_CONTEUDOHTML5', [{ ID: deleteId }]).then(() => {
    // Atualiza a lista após exclusão
  });
};
```
- Exclui o registro selecionado pelo ID.
- Atualiza a lista após exclusão.

#### 4.7. Eventos de Botões

- **btnAdd:** Abre modal para novo registro.
- **btnCancel:** Fecha modal de cadastro/edição.
- **btnCancelDelete:** Fecha modal de exclusão.

#### 4.8. Fechar Modal ao Clicar Fora

```js
window.onclick = function(event) {
  if (event.target === document.getElementById('modalForm')) closeModal();
  if (event.target === document.getElementById('modalDelete')) closeDeleteModal();
};
```
- Permite fechar os modais ao clicar fora do conteúdo.

#### 4.9. Inicialização

```js
listarDados();
```
- Ao carregar a página, lista todos os registros existentes.

---

## Fluxo de Funcionamento

1. **Usuário acessa a página:** A lista de registros é carregada automaticamente.
2. **Adicionar novo registro:** Clica em "Novo Registro", preenche o formulário e salva.
3. **Editar registro:** Clica no ícone de editar, altera os dados e salva.
4. **Excluir registro:** Clica no ícone de lixeira, confirma a exclusão.
5. **Mensagens:** O usuário recebe feedback visual para cada ação.

---

## Observações

- O código utiliza o SankhyaJX (`JX.consultar`, `JX.salvar`, `JX.deletar`) para comunicação com o banco de dados Sankhya.
- O ID do registro é gerado automaticamente pelo banco ao inserir um novo registro.
- O exemplo é facilmente adaptável para outras tabelas, bastando ajustar os campos e nomes.

---

## Conclusão

Este arquivo serve como um guia prático para criar um CRUD HTML5 integrado ao Sankhya, utilizando boas práticas de UX (modais, feedback visual, validação) e integração direta com o banco de dados via SankhyaJX. É um ponto de partida para criar componentes BI personalizados no ambiente Sankhya.