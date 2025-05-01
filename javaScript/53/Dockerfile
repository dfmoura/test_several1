# Usar imagem oficial do Node.js
FROM node:18

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm install node-fetch@2

# Copiar todo o código
COPY . .

# Expor porta usada pelo app
EXPOSE 3000

# Rodar o app
CMD ["npm", "start"]
