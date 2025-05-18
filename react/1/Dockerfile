# Dockerfile

# Usa imagem oficial do Node
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos do projeto
COPY package.json package-lock.json* ./

# Instala dependências
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta do Vite (por padrão)
EXPOSE 5173

# Comando para rodar o dev server
CMD ["npm", "run", "dev"]
