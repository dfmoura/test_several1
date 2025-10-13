# 🚀 Instruções Rápidas

## Início Rápido

### Opção 1: Usando o script auxiliar (mais fácil)

```bash
./run.sh
```

E escolha uma das opções do menu.

### Opção 2: Comandos diretos

**Executar o programa principal:**
```bash
docker-compose run --rm dividendos-b3
```

**Executar exemplo rápido (20 ações):**
```bash
docker-compose run --rm dividendos-b3 python exemplo.py
```

**Sem Docker:**
```bash
pip install -r requirements.txt
python main.py
```

## 📝 Formato das Datas

Sempre use o formato: `YYYY-MM-DD`

Exemplos:
- `2024-01-01` (1º de janeiro de 2024)
- `2024-12-31` (31 de dezembro de 2024)
- `2023-06-15` (15 de junho de 2023)

## 💡 Dicas

1. **Primeiro teste**: Use a opção de 10 ou 50 ações para testar rapidamente
2. **Todas as ações**: O processamento completo pode levar 15-30 minutos
3. **Resultados**: Os arquivos JSON são salvos no diretório atual
4. **Limite da API**: Há um delay de 0.5s entre requisições para não sobrecarregar a API

## 📊 Estrutura do Projeto

```
.
├── main.py              # Programa principal
├── exemplo.py           # Exemplos de uso
├── requirements.txt     # Dependências Python
├── Dockerfile          # Configuração Docker
├── docker-compose.yml  # Orquestração Docker
├── run.sh             # Script auxiliar
└── README.md          # Documentação completa
```

## 🔍 Exemplos de Período

**Último trimestre de 2024:**
- Início: `2024-10-01`
- Fim: `2024-12-31`

**Ano completo de 2024:**
- Início: `2024-01-01`
- Fim: `2024-12-31`

**Primeiro semestre de 2024:**
- Início: `2024-01-01`
- Fim: `2024-06-30`

## 📞 Precisa de Ajuda?

- Veja a documentação completa em `README.md`
- Execute `python exemplo.py` para ver exemplos práticos
- Verifique se o Docker está instalado: `docker --version`

