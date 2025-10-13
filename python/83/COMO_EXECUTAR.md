# 🚀 Como Executar Após o Build

## ✅ Após fazer o build, use um destes comandos:

### 1️⃣ Forma Recomendada (Interativo)
```bash
docker-compose run --rm dividendos-b3
```

**Por quê?**
- ✅ Permite digitar as datas
- ✅ Interação completa com o programa
- ✅ Remove o container após usar (`--rm`)

### 2️⃣ Usando o Script Auxiliar
```bash
./run.sh
```

**Escolha a opção desejada do menu!**

### 3️⃣ Teste Rápido (Sem Digitar Nada)
```bash
docker-compose run --rm dividendos-b3 python teste_rapido.py
```

**Validação automática!**

### 4️⃣ Exemplo com 20 Ações (Sem Digitar Nada)
```bash
docker-compose run --rm dividendos-b3 python exemplo.py
```

**Processa automaticamente o ano de 2024!**

---

## ❌ NÃO use `docker-compose up`

```bash
docker-compose up --build  # ❌ NÃO recomendado para programa interativo
```

**Problema:** Não funciona bem com input interativo (digitar datas).

---

## 📋 Passo a Passo Completo

### Se o container está rodando agora:

1. **Pare o container:**
   - Pressione `Ctrl+C`

2. **Execute o comando correto:**
   ```bash
   docker-compose run --rm dividendos-b3
   ```

3. **Digite as informações solicitadas:**
   ```
   📅 Digite a data inicial (YYYY-MM-DD): 2024-01-01
   📅 Digite a data final (YYYY-MM-DD): 2024-12-31
   ```

4. **Escolha uma opção:**
   ```
   1. Processar todas as ações (pode demorar)
   2. Processar apenas as primeiras 10 (teste rápido)
   3. Processar apenas as primeiras 50
   ```

5. **Aguarde o processamento!**
   - O arquivo JSON será salvo no diretório atual

---

## 🎯 Resumo dos Comandos

| Comando | O que faz | Quando usar |
|---------|-----------|-------------|
| `docker-compose build` | Apenas constrói a imagem | Quando mudar o código |
| `docker-compose run --rm dividendos-b3` | Executa interativamente | **USE ESTE! ⭐** |
| `./run.sh` | Menu com opções | Jeito mais fácil |
| `docker-compose up` | Inicia serviço | ❌ Não use aqui |

---

## 🔄 Workflow Completo

```bash
# 1. Fazer alterações no código (se necessário)
# ...

# 2. Reconstruir a imagem (só se mudou o código)
docker-compose build

# 3. Executar o programa
docker-compose run --rm dividendos-b3

# OU simplesmente:
./run.sh
```

---

## 💡 Dica Rápida

**Quer testar rapidinho sem digitar nada?**

```bash
docker-compose run --rm dividendos-b3 python teste_rapido.py
```

Valida tudo em segundos! ⚡

---

## 🆘 Se Travou

Se o programa travou esperando input:

1. Pressione `Ctrl+C`
2. Execute: `docker-compose down`
3. Execute novamente: `docker-compose run --rm dividendos-b3`

