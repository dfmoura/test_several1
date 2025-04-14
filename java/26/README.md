```markdown
# 📦 Importador de Itens por Lista – Rotina Sankhya

Este projeto é uma rotina personalizada (botão de ação) para o sistema **Sankhya**, que permite a **importação automatizada de itens para uma requisição interna** a partir de um arquivo `.CSV` anexado.

---

## 📌 Objetivo

O código tem como finalidade **ler um anexo nomeado como `lista`** (arquivo CSV) dentro de uma requisição e **inserir os itens no grid (TGFITE)** de forma automatizada, utilizando como referência o **NUNOTA (número único da requisição)**.

---

## 🧩 Funcionamento

1. **Identificação da Requisição**
   - A rotina é disparada a partir da tela da requisição.
   - O cabeçalho (`TGFCAB`) da requisição contém o campo `NUNOTA`, que é utilizado como chave de vínculo para anexos e inserção de itens.

2. **Leitura do Anexo**
   - A rotina busca o anexo na tabela `TSIATA` com descrição `lista`.
   - O conteúdo deve estar em **formato CSV**, codificado em UTF-8.

3. **Processamento do Arquivo**
   - O arquivo deve conter as colunas: `perfil`, `material`, `quantidade`.
   - Para cada linha:
     - Busca-se o produto (`CODPROD`) na `TGFPRO` com base em `AD_PERFIL` e `AD_MATERIAL`.
     - Se encontrado, o item é inserido na `TGFITE`.
     - Se não encontrado, é acumulado para exibição de erro ao final.

4. **Validações e Mensagens**
   - Se nenhum anexo for encontrado, a rotina exibe uma mensagem.
   - Se houver produtos não vinculados, é lançada uma exceção listando os produtos problemáticos.
   - Caso tudo ocorra corretamente, a mensagem `Lista inserida com sucesso!` é exibida.

---

## 📁 Estrutura Esperada do CSV

```csv
perfil,material,quantidade
ABC123,MAT456,10
XYZ789,MAT111,5
```

- **Importante**: a primeira linha (cabeçalho) será ignorada automaticamente.
- O separador padrão é `,`.

---

## 🛠️ Tecnologias e APIs Utilizadas

- **Java 8+**
- **API de Extensões Sankhya (AcaoRotinaJava)**
- **JDBC Interno Sankhya (`JdbcWrapper`, `NativeSql`)**
- Manipulação de BLOBs para leitura de arquivos
- Operações com `BigDecimal` para garantir precisão financeira

---

## 🧪 Boas Práticas Adotadas

- Uso de `try-finally` para garantir liberação de recursos (`ResultSet`, `JdbcWrapper`, etc).
- Separação de responsabilidades em métodos auxiliares (`getBlobFromTSIATA`, `buscarCodProd`, `processarCSV`).
- Padronização de nome de anexo como `lista` (case insensitive).
- Validações robustas com mensagens amigáveis para o usuário.

---

## 🧱 Requisitos

- Campo personalizado `AD_PERFIL` e `AD_MATERIAL` devem existir em `TGFPRO`.
- O anexo precisa estar com **descrição exata** "lista" (sem acento e em minúsculo).
- A requisição deve estar devidamente cadastrada com o campo `NUNOTA`.

---
