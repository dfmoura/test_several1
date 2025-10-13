# 🚀 Guia Rápido - Dividendos B3

## ✅ Tudo Pronto!

Seu projeto está 100% configurado e pronto para usar!

### 🔑 Token Configurado
```
Token: 6nBu...C8Eh ✅
Status: Funcionando perfeitamente!
Ações disponíveis: 675
```

## 📝 Como Usar

### Opção 1: Programa Completo Interativo
```bash
docker-compose run --rm dividendos-b3
```

Ou simplesmente:
```bash
./run.sh
```

E escolha a opção desejada!

### Opção 2: Teste Rápido (Validação)
```bash
docker-compose run --rm dividendos-b3 python teste_rapido.py
```

### Opção 3: Exemplo com 20 Ações
```bash
docker-compose run --rm dividendos-b3 python exemplo.py
```

### Opção 4: Sem Docker
```bash
# Configurar variável de ambiente
export BRAPI_TOKEN=6nBuvj6mNCptLKX2VyC8Eh

# Instalar dependências
pip install -r requirements.txt

# Executar
python main.py
```

## 📊 Exemplo de Uso

```bash
$ docker-compose run --rm dividendos-b3

================================================================================
                    CONSULTA DE DIVIDENDOS B3
================================================================================
🔑 Token configurado: 6nBu...C8Eh

📅 Digite a data inicial (YYYY-MM-DD): 2024-01-01
📅 Digite a data final (YYYY-MM-DD): 2024-12-31

⚙️  Opções:
1. Processar todas as ações (pode demorar)
2. Processar apenas as primeiras 10 (teste rápido)
3. Processar apenas as primeiras 50

Escolha uma opção (1-3): 2
```

## 📁 Resultados

Os resultados são salvos automaticamente em:
```
dividendos_2024-01-01_a_2024-12-31.json
```

No diretório atual do projeto.

## 🎯 Benefícios do Token

Com o token configurado você tem:
- ✅ **Mais ações disponíveis** (675 vs 634 sem token)
- ✅ **Sem limites de requisições**
- ✅ **Respostas mais rápidas**
- ✅ **Dados completos**
- ✅ **Prioridade no processamento**

## 📖 Documentação Completa

- `README.md` - Documentação completa
- `CONFIGURACAO_TOKEN.md` - Detalhes sobre o token
- `CHANGELOG.md` - Histórico de alterações
- `INSTRUCOES.md` - Instruções rápidas

## 🆘 Problemas?

Se algo não funcionar:

1. **Verificar Docker:**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Reconstruir imagem:**
   ```bash
   docker-compose build --no-cache
   ```

3. **Verificar token:**
   ```bash
   cat .env
   ```

4. **Teste rápido:**
   ```bash
   docker-compose run --rm dividendos-b3 python teste_rapido.py
   ```

## 🎉 Pronto para Começar!

Execute agora:
```bash
./run.sh
```

Divirta-se analisando dividendos! 📈💰

