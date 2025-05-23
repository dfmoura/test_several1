## 📦 Instalação do Rust

A maneira recomendada de instalar o Rust é através do instalador oficial [`rustup`](https://rustup.rs), que também instala o gerenciador de pacotes `cargo`.

### 1. Instale o Rust

Abra o terminal e execute o comando abaixo:

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Configure o ambiente

Após a instalação, reinicie o terminal **ou** execute o seguinte comando para adicionar o `cargo` e o `rustc` ao seu PATH:

```sh
source $HOME/.cargo/env
```

---

## 🚀 Criando o Projeto

Navegue até o diretório onde deseja criar o projeto e execute:

```sh
cargo new rust_docker_example
```

---

## 🐳 Usando Docker

### 1. Construa a imagem Docker

No diretório do projeto, execute:

```sh
docker build -t rust_docker_example .
```

### 2. Execute o container

Após a construção da imagem, execute:

```sh
docker run --rm rust_docker_example
```