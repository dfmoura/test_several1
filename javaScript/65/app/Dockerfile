# Usar imagem Node com Yarn
FROM node:18

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência
COPY package.json yarn.lock ./

# Instala dependências
RUN yarn install

# Copia todo o restante
COPY . .

# Expõe a porta
EXPOSE 3000

# Comando padrão
CMD ["yarn", "start"]
