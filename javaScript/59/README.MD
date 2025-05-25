```markdown
# Enquete - Linguagens de Programação (React + Docker)

Este projeto é uma aplicação simples em React que apresenta uma enquete para o usuário escolher sua linguagem de programação favorita. Ao clicar em uma opção, um alerta exibe a linguagem escolhida.

---

## Funcionalidades

- Lista de linguagens de programação apresentadas como botões.
- Ao clicar em uma opção, é exibido um alerta com a linguagem selecionada.
- Interface simples, responsiva e estilizada com CSS.

---

## Tecnologias Utilizadas

- React (criado com Create React App)
- CSS para estilização simples
- Docker e Docker Compose para containerização e facilidade de execução

---

## Estrutura do Projeto

```

/javaScript/59/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── public/
├── src/
└── README.md

````

- `Dockerfile` — Configuração para criar a imagem Docker da aplicação React.
- `docker-compose.yml` — Configuração para orquestrar o container com o build da aplicação.
- `package.json` — Dependências e scripts do React.
- `public/` e `src/` — Código fonte da aplicação React.

---

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) instalado e funcionando
- [Docker Compose](https://docs.docker.com/compose/install/) instalado (normalmente já vem junto com o Docker)

---

## Como rodar o projeto

1. Clone este repositório e navegue até a pasta do projeto:

```bash
git clone https://github.com/dfmoura/test_several1.git
cd test_several1/javaScript/59
````

2. Certifique-se de que o `package.json` e os arquivos React estão na pasta.

3. Construa a imagem Docker e inicie o container com Docker Compose:

```bash
docker-compose up --build
```

4. A aplicação estará disponível em: [http://localhost:3000](http://localhost:3000)

---

## Comandos úteis

* Para parar o container:

```bash
docker-compose down
```

* Para rodar o container em background (detached mode):

```bash
docker-compose up --build -d
```

---

## Observações

* Caso precise modificar algo no código React, após salvar as alterações, o container precisará ser reconstruído para refletir as mudanças.

---

## Contato

Diogo Moura
[GitHub](https://github.com/dfmoura)

---

Obrigado por usar este projeto!
Qualquer dúvida, abra uma issue ou entre em contato.

```

```
