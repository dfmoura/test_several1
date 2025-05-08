# Usar a imagem oficial do Rust
FROM rust:latest

# Definir o diretório de trabalho no contêiner
WORKDIR /usr/src/app

# Copiar os arquivos do projeto para o contêiner
COPY . .

# Compilar o projeto
RUN cargo build --release

# Definir o comando para rodar o programa
CMD ["./target/release/rust_docker_example"]
