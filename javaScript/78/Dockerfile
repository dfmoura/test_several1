# Imagem base com Node.js 14.19.1, conforme pré-requisito do Sankhya Generator
FROM node:14.19.1

# Define o diretório de trabalho padrão dentro do container
WORKDIR /usr/src/app

# Instala uma versão do Yo compatível com Node 14 e o generator-sankhya
RUN npm install -g yo@3.1.1 \
  && npm install -g generator-sankhya

# Copia todo o conteúdo do repositório (se houver arquivos de projeto, serão incluídos aqui)
COPY . .

# Instala dependências do projeto apenas quando os arquivos de configuração existirem
RUN if [ -f package.json ]; then npm install; fi

# Informa ao usuário como iniciar o assistente do Sankhya Generator
CMD ["bash", "-lc", "echo 'Para criar uma nova tela, execute: yo sankhya' && exec bash"]

