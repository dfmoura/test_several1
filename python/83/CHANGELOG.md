# Changelog

## Correções Implementadas

### Problema Identificado
O Docker não conseguia encontrar o arquivo `main.py` ao executar o container.

**Erro:**
```
python: can't open file '/app/main.py': [Errno 2] No such file or directory
```

### Causa Raiz
O volume mapeado no `docker-compose.yml` estava sobrescrevendo todo o diretório `/app` do container:
```yaml
volumes:
  - ./resultados:/app  # ❌ Isso sobrescreve todo o /app
```

### Solução Aplicada

1. **Corrigido docker-compose.yml**
   - Removida a linha `version: '3.8'` (obsoleta)
   - Ajustado o mapeamento de volume para não sobrescrever o diretório de trabalho:
   ```yaml
   volumes:
     - .:/app/output  # ✅ Mapeia apenas para output
   ```

2. **Atualizado main.py**
   - Adicionado suporte para salvar arquivos no diretório correto (Docker ou local)
   - Corrigido problema de comparação de datas com timezone
   - Import de `os` movido para o topo do arquivo

3. **Atualizado Dockerfile**
   - Mudado de `COPY main.py .` para `COPY *.py .`
   - Agora copia todos os arquivos Python (main, exemplo, teste)

4. **Documentação atualizada**
   - README.md com instruções corretas
   - Scripts auxiliares corrigidos
   - .gitignore atualizado

### Validação

Teste executado com sucesso:
```
✅ Teste 1: Buscando lista de ações da B3...
   ✅ Sucesso! 634 ações encontradas
   
✅ Teste 2: Buscando dividendos da PETR4 (2024)...
   ✅ Sucesso!
   Stock: PETR4
   Nome: Petróleo Brasileiro S.A. - Petrobras
   Total dividendos: R$ 7.76
   Quantidade pagamentos: 15
```

### Como Usar Agora

**Forma mais simples:**
```bash
docker-compose run --rm dividendos-b3
```

**Teste rápido:**
```bash
docker-compose run --rm dividendos-b3 python teste_rapido.py
```

**Exemplo com 20 ações:**
```bash
docker-compose run --rm dividendos-b3 python exemplo.py
```

## Data da Correção
10 de outubro de 2025

