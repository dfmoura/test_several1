# Imagem base
FROM node:18-alpine

# Diretório de trabalho no contêiner
WORKDIR /app

# Copia os arquivos do projeto
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia todo o restante
COPY . .

# Porta exposta
EXPOSE 3000

# Comando padrão
CMD ["npm", "start"]
