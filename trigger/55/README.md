# Diagnóstico HTTP (`http_diagnostic.sh`)

Ferramenta Bash + curl para avaliar **disponibilidade** e **tempo de resposta** de um endpoint HTTP de forma **sequencial e limitada**.

## O que mede

| Campo | Significado |
|--------|-------------|
| Código HTTP | Status retornado (2xx, 3xx, 4xx, 5xx) |
| Tempo total | Latência ponta a ponta da requisição (`time_total`) |
| Tempo de conexão | Até estabelecer TCP/TLS (`time_connect`) |
| Tempo DNS | Resolução do nome (`time_namelookup`) |
| IP remoto | Endereço do peer, quando o curl o informa |
| Erros | Timeouts, falha de DNS, recusa de conexão, etc. |

## Limites fixos (política de uso responsável)

- 1 requisição por vez (sem threads/paralelismo)
- Intervalo mínimo de **2 segundos** entre requisições
- Timeout de conexão: **5 s** | Timeout total: **15 s**
- No máximo **5** redirecionamentos (`--max-redirs`)
- Teto de **100** verificações por execução
- Sem proxies rotativos, spoofing ou evasão
- **Não** é teste de carga; não use para degradar ou contornar proteções

Antes de qualquer requisição, o script exibe destino e limites e aguarda 3 segundos (cancelável com Ctrl+C).

## Pré-requisitos

### Linux (Debian/Ubuntu)

```bash
sudo apt update && sudo apt install -y curl
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install -y curl
```

### macOS

```bash
# curl já vem no sistema; se precisar atualizar via Homebrew:
brew install curl
```

Torne o script executável:

```bash
chmod +x http_diagnostic.sh
```

## Uso

```bash
./http_diagnostic.sh [opções] [URL] [QUANTIDADE]
```

| Argumento / opção | Padrão | Descrição |
|-------------------|--------|-----------|
| `URL` | `https://www.exercitodolula.org/` | Deve começar com `http://` ou `https://` |
| `QUANTIDADE` | `5` | Inteiro de 1 a 100 |
| `-y` / `--yes` | — | Pula o prompt `SIM` (ainda mostra o aviso) |

O script pede confirmação digitando **SIM** e depois espera 3 segundos.

### Exemplos

```bash
# Torne o script executável (Linux / macOS)
chmod +x http_diagnostic.sh

# Destino alvo — 10 checagens sequenciais (digite SIM quando pedido)
./http_diagnostic.sh https://www.exercitodolula.org/ 10

# Padrões (URL alvo + 5 checagens)
./http_diagnostic.sh

# Um único check sem prompt interativo (ainda exibe o aviso pré-teste)
./http_diagnostic.sh -y https://example.com/ 1

# Ajuda
./http_diagnostic.sh --help
```

Com `10` checagens e intervalo de 2 s, só as pausas entre requests somam cerca de **≥ 18 s** (9 intervalos), além do tempo de cada resposta e da contagem regressiva inicial de 3 s.

## Saídas

1. **Terminal** — tabela por requisição + estatísticas finais  
2. **CSV** — `results/http_diagnostic_YYYYMMDD_HHMMSS.csv`

Colunas do CSV:

`datetime,request_number,http_code,time_total_s,time_connect_s,time_dns_s,remote_ip,curl_exit,error`

## Como interpretar os resultados

- **HTTP 2xx** — sucesso; use `time_total_s` como latência observada.
- **HTTP 3xx** — redirecionamento; o script segue no máximo 5 hops. Códigos 3xx persistentes podem indicar limite de redirects ou destino intermediário.
- **HTTP 4xx** — problema no pedido/cliente (auth, not found, etc.), não necessariamente “site fora”.
- **HTTP 5xx** — falha no servidor ou gateway.
- **`curl_exit` ≠ 0** / erros de conexão — timeout, DNS, TLS ou rede. Contam em “Erros de conexão”.
- **Tempo DNS alto** — possível lentidão de resolução local/recursiva.
- **Tempo de conexão alto, DNS baixo** — possível latência de rede ou handshake TCP/TLS.
- **Média / min / max** — só incluem tentativas em que o curl terminou com sucesso (`curl_exit=0`).

Ctrl+C interrompe com segurança e imprime estatísticas **parciais**.

## Autorização

Use apenas em sistemas que você opera ou para os quais tem permissão explícita de teste. Não aumente a quantidade nem reduza o intervalo para simular carga.
