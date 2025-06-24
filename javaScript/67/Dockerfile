# Imagem base com Node.js e yarn (Linux)
FROM node:18-alpine

# Define diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos package.json e yarn.lock (se tiver)
COPY package.json yarn.lock* ./

# Instala dependências com yarn
RUN yarn install

# Copia todo o restante do projeto para dentro do container
COPY . .

# Expõe a porta 3000 (porta padrão do React)
EXPOSE 3000

# Comando para rodar o app React
CMD ["yarn", "start"]
