# React + Vite

Claro! Aqui está um `README.md` com os passos atualizados e funcionais, considerando o que deu certo no seu caso:

---

````markdown
# 🚀 Projeto React + Vite com Docker (Linux)

Este projeto é um exemplo simples de como criar uma aplicação **React** moderna usando **Vite** e rodá-la com **Docker** no Linux.

---

## 📦 Requisitos

- Docker instalado (`docker --version`)
- Docker Compose instalado (`docker compose version`)
- Git Bash ou terminal compatível com Linux

---

## ⚙️ Passo a passo

### 1. Clone ou crie uma pasta para seu projeto

```bash
mkdir meu-react-app
cd meu-react-app
````

---

### 2. Crie o `Dockerfile`

```Dockerfile
# Dockerfile
FROM node:18

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
```

---

### 3. Crie o `docker-compose.yml`

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
```

---

### 4. Gere o projeto React com Vite usando Docker

Abra um terminal interativo dentro de um container:

```bash
docker run -it --rm -v "$PWD":/app -w /app node:18 bash
```

Dentro do container, execute:

```bash
npx create-vite@latest . --template react
```

Quando for perguntado o que fazer com a pasta não vazia, selecione:

```
● Ignore files and continue
```

Depois:

```bash
npm install
exit
```

---

### 5. Ajuste o Vite para funcionar com Docker

Edite o arquivo `vite.config.js`:

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})
```

---

### 6. Rode a aplicação

No terminal, execute:

```bash
docker compose up
```

Acesse no navegador:

```
http://localhost:5173
```

---

## ✅ Resultado

Você terá um projeto React moderno rodando no Docker, pronto para desenvolvimento!

---

## 🧹 .dockerignore (opcional)

```gitignore
node_modules
dist
.dockerignore
Dockerfile
docker-compose.yml
```

```

---

Se quiser, posso gerar esse `README.md` e os arquivos do projeto todos prontos em um `.zip`. Deseja isso?
```




This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
