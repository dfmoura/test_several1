# 🔑 Configuração do Token BRAPI

O token da API BRAPI permite fazer mais requisições e ter melhor performance na consulta de dividendos.

## ✅ Token Configurado

Seu token já está configurado no arquivo `.env`:
```
BRAPI_TOKEN=6nBuvj6mNCptLKX2VyC8Eh
```

## 📋 Formas de Usar o Token

### 1. Via Arquivo .env (Recomendado - Já configurado!)

O arquivo `.env` já foi criado com seu token. Quando você executar:
```bash
docker-compose run --rm dividendos-b3
```

O token será carregado automaticamente! 🎉

### 2. Via Variável de Ambiente

```bash
# Linux/Mac
export BRAPI_TOKEN=6nBuvj6mNCptLKX2VyC8Eh
python main.py

# Windows (CMD)
set BRAPI_TOKEN=6nBuvj6mNCptLKX2VyC8Eh
python main.py

# Windows (PowerShell)
$env:BRAPI_TOKEN="6nBuvj6mNCptLKX2VyC8Eh"
python main.py
```

### 3. Direto no Docker Compose

```bash
BRAPI_TOKEN=6nBuvj6mNCptLKX2VyC8Eh docker-compose run --rm dividendos-b3
```

### 4. Direto no Código Python

```python
from main import DividendosBrapi

app = DividendosBrapi(token="6nBuvj6mNCptLKX2VyC8Eh")
app.processar_todas_stocks("2024-01-01", "2024-12-31", limite=10)
```

## 🎯 Testar se o Token Está Funcionando

Execute o teste rápido:
```bash
docker-compose run --rm dividendos-b3 python teste_rapido.py
```

Você verá a mensagem:
```
🔑 Token configurado: 6nBu...C8Eh
```

Se aparecer essa mensagem, o token está funcionando! ✅

## 📊 Benefícios do Token

- ✅ **Mais requisições por minuto** - Sem limites restritivos
- ✅ **Melhor performance** - Respostas mais rápidas
- ✅ **Dados completos** - Acesso a todos os dados da API
- ✅ **Prioridade no processamento** - Suas requisições têm prioridade

## 🔒 Segurança

O arquivo `.env` está no `.gitignore`, então seu token não será commitado no Git.
**Nunca compartilhe seu token publicamente!**

## 📝 Alterar o Token

Para alterar o token, edite o arquivo `.env`:
```bash
nano .env
# ou
vim .env
# ou use seu editor preferido
```

## ❓ Obter um Token

Se você não tem um token ainda, acesse:
- 🌐 https://brapi.dev
- Crie uma conta gratuita
- Copie seu token da dashboard
- Cole no arquivo `.env`

## 🧪 Testar Agora

Pronto para testar? Execute:
```bash
./run.sh
```

E escolha a opção 1 ou 2!

