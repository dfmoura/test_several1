# Automação de Consultas HTTP (Docker)

Projeto demonstrativo e educacional para executar consultas HTTP sequenciais
a partir de uma interface web local. Toda a aplicação Python roda
**exclusivamente dentro de containers Docker**.

Consulta padrão:

> Qual o patrimônio real de Flavio Bolsonaro?

## Aviso importante

- Uma resposta HTTP `200` **não prova** que o mecanismo de busca contabilizou
  a pesquisa como válida.
- Este projeto **não** contorna CAPTCHA, limites, bloqueios ou mecanismos
  antiautomação.
- Não utiliza proxies rotativos, falsificação de identidade nem técnicas de evasão.
- O Bing (padrão) pode recusar, limitar ou servir páginas intermediárias para
  tráfego automatizado. Nesse caso, considere uma **API oficial autorizada**
  do provedor de busca (por exemplo, APIs comerciais com chave e termos de uso).

## Pré-requisitos (host Linux)

- Docker
- Docker Compose (plugin `docker compose`)
- Utilitário `ss` (pacote `iproute2`) para verificação de porta

**Python não precisa estar instalado no host.**

Verifique:

```bash
docker --version
docker compose version
ss -ltn | head
```

## Estrutura de arquivos

```text
pesquisas-docker/
├── app.py
├── requirements.txt
├── Dockerfile
├── compose.yaml
├── check-port.sh
├── .dockerignore
├── .gitignore
├── .env.example
├── README.md
└── templates/
    └── index.html
```

## Configuração inicial

```bash
cd pesquisas-docker
cp .env.example .env
```

Variáveis principais (`.env`):

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `18765` | Porta no host (somente sugestão) |
| `CONTAINER_PORT` | `8080` | Porta interna do container |
| `TOTAL_CONSULTAS` | `20` | Quantidade de requisições por execução |
| `INTERVALO_SEGUNDOS` | `3` | Espera entre requisições |
| `TIMEOUT_HTTP` | `15` | Timeout por requisição |
| `CONSULTA` | frase padrão | Texto pesquisado |
| `SEARCH_ENGINE` | `bing` | Mecanismo permitido |
| `SEARCH_BASE_URL` | `https://www.bing.com/search` | URL base (allowlist) |

A interface web é publicada **somente** em loopback:

```text
127.0.0.1:${PORT}:8080
```

## Como configurar e verificar a porta

A porta `18765` é apenas uma sugestão. Antes de iniciar:

```bash
# Listar portas em escuta
ss -ltn

# Verificar a porta escolhida (script do projeto)
chmod +x check-port.sh
./check-port.sh 18765
```

Se a porta estiver ocupada:

1. O script informa que a porta está em uso.
2. Nenhum serviço existente é interrompido.
3. Uma porta alternativa disponível é sugerida.
4. Use a alternativa via variável de ambiente:

```bash
PORT=18766 docker compose up -d --build
```

Ou edite `PORT` no arquivo `.env`.

## Construir a imagem

```bash
docker compose build
```

## Iniciar o container

```bash
./check-port.sh "${PORT:-18765}"
docker compose up -d
```

URL local da interface:

```text
http://127.0.0.1:18765/
```

(Substitua pela porta configurada em `PORT`.)

## Verificar o estado do container

```bash
docker compose ps
```

## Visualizar os logs

```bash
docker compose logs -f
```

## Parar a aplicação

```bash
docker compose down
```

## Remover o container

```bash
docker compose down
# ou, se o container ainda existir:
docker rm -f pesquisas-http
```

## Remover a imagem do projeto

```bash
docker rmi pesquisas-docker:local
```

## Alterar a quantidade de consultas

No `.env`:

```env
TOTAL_CONSULTAS=10
```

Em seguida:

```bash
docker compose up -d
```

## Alterar o intervalo

```env
INTERVALO_SEGUNDOS=5
```

```bash
docker compose up -d
```

## Endpoints da API

| Método | Caminho | Descrição |
|--------|---------|-----------|
| `GET` | `/` | Interface web |
| `GET` | `/api/status` | Estado atual |
| `POST` | `/api/start` | Inicia execução em segundo plano |
| `POST` | `/api/cancel` | Solicita cancelamento seguro |
| `GET` | `/api/history` | Histórico |
| `POST` | `/api/history/clear` | Limpa histórico da aplicação |

## Como interpretar os códigos HTTP

| Código | Interpretação neste projeto |
|--------|-----------------------------|
| `2xx` | Resposta HTTP recebida com sucesso técnico |
| `3xx` | Redirecionamento (seguido pelo cliente HTTP) |
| `4xx` | Recusa/cliente (ex.: bloqueio, não encontrado) |
| `5xx` | Erro no servidor remoto |
| timeout / rede | Falha local de conectividade ou tempo esgotado |

**Importante:** sucesso técnico ≠ pesquisa contabilizada pelo buscador.

O projeto diferencia:

- **Tentadas:** requisições iniciadas
- **Concluídas tecnicamente:** resposta HTTP obtida sem falha de transporte
- **Erros:** timeout, falha de rede ou status considerado erro
- **Critério técnico OK:** `2xx` + conteúdo HTML não vazio (verificável na aplicação)

## Limitações da automação de mecanismos de pesquisa

- Páginas de busca públicas frequentemente aplicam proteções antiautomação.
- CAPTCHA, desafios JavaScript e limites de taxa podem impedir resultados úteis.
- Este projeto **não** tenta contornar essas proteções.
- Para uso legítimo em produção, prefira APIs oficiais com autenticação e
  cotas documentadas pelo provedor.
- A interface escuta apenas em `127.0.0.1` no host; não exponha à rede local
  ou à Internet sem revisão de segurança adicional.

## Segurança (resumo)

- Sem execução de comandos de shell via interface web
- URL de busca restrita a hosts permitidos (anti-SSRF)
- Sem acesso ao Docker socket
- Sem volumes privilegiados
- Processo no container como usuário não-root
- Histórico limitado em memória
- Uma única execução ativa por vez (lock + proteção no botão Iniciar)

## Comandos principais

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f
docker compose down
```
