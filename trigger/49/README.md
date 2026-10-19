# Observatório Social Brasil — PNCP

Sistema local em Docker. Não há outro modo de subir, testar, migrar, fazer backup ou publicar.

## Subir

```bash
docker compose up --build -d
```

Acesso: http://localhost:8097/

Saúde (API e banco): http://localhost:8097/api/health

A primeira conta master nasce só se `BOOTSTRAP_USUARIO` e `BOOTSTRAP_SENHA` estiverem no ambiente na subida, e somente enquanto não existir usuário. Não grave a senha no repositório. As faixas C e D nascem desligadas (`FAIXA_C_HABILITADA=0`, `FAIXA_D_HABILITADA=0`): nenhum cliente de CNPJ ou CEP é chamado.

## Ver e parar

```bash
docker compose ps
docker compose logs -f
docker compose down
```

`docker compose down` não apaga o volume do Postgres. Para apagar o volume local junto: `docker compose down -v`.

Serviços deste modo: `api`, `worker` e `db`. A única porta publicada no host é **8097**. O worker e o banco não publicam porta.

## Teste

O pytest usa um Postgres efêmero (`db_test`, profile `test`), sem o volume de desenvolvimento e sem porta no host.

```bash
docker compose --profile test run --rm api pytest
docker compose --profile test rm -sf db_test
```

## Horário das faixas

Relógio de negócio: `America/Sao_Paulo`.

- 02:10 — a faixa A entra na fila (janela diária de 7 dias mais contratações ainda abertas, não o ano inteiro). A carga inicial, a partir de 2026, tem prioridade: enquanto estiver aberta, o diário daquela filial espera. As outras filiais seguem no rodízio.
- A faixa B (contratos e atas) só começa na mesma noite se as etapas A2, A3 e A4 terminarem ok. Falha obrigatória da A deixa a noite visível na fila do master e não dispara a B.
- Um job `executando` é retomado no restart do worker, a partir do cursor, sem esperar a madrugada seguinte.
- 05:10 — backup. Se a coleta estiver em execução, adia 30 minutos uma vez e registra. Retenção de 7 dias.
- Faixas C (CNPJ) e D (CEP) não rodam com a flag desligada, nem se a B da noite falhou.

## Backup e restore

O `pg_dump` roda dentro do container do Postgres, como usuário `postgres`.

```bash
docker compose exec -T db /backup/backup.sh
docker compose exec -T db ls -1 /var/backups/osb
docker compose exec -T db /backup/restore.sh /var/backups/osb/osb-AAAAMMDD-HHMMSS.dump
```

O restore recusa se houver coleta em execução. Troque o nome do arquivo pelo que o `ls` mostrar.

## Profile https

O Caddy está no profile `https` e não sobe com o comando local. Nesta máquina, 80 e 443 ficam de fora. O profile só entra na publicação, com o domínio que a direção informar na hora.

## Publicar na AWS

Documentação do roteiro. Não executar enquanto a versão local não for aceita. Não abre instância, DNS nem certificado.

Destino: uma instância Lightsail nova, 4 GB de RAM, 2 vCPU e disco de pelo menos 80 GB. Não é RDS. Não é o servidor do sistema 23. Outro diretório, outro volume, outra instância e, quando houver, outro domínio. Não reutilizar `licitacoes.osbrasiluberlandia.org`.

Nesta VM nova, 80 e 443 estão livres. É o único lugar em que o profile `https` pode publicá-las. Não abrir 8096. Não publicar o Postgres. Antes do DNS, a contingência HTTP usa 8097 nessa instância.

Mediante pedido explícito de publicar, nesta ordem:

1. Instância com Docker e Docker Compose.
2. Firewall: na contingência, a porta do app; no endereço de trabalho, TCP 80 e 443.
3. `git clone` ou `git pull` deste projeto.
4. `docker compose up --build -d` e conferir `/api/health` no IP.
5. Com o DNS A do domínio apontando para o IP da instância: `docker compose --profile https up -d --build`. O domínio é o que a direção informar. O Caddy obtém o certificado, redireciona HTTP para HTTPS e faz proxy para a API.
6. Backup na VM às 05:10 `America/Sao_Paulo`, retenção de 7 dias, com o mesmo adiamento de 30 minutos se a coleta estiver em execução.
7. Snapshot semanal da instância, além do dump. Um não substitui o outro.

Atualização depois do go-live: backup, `git pull` e recreate de `api` e `worker`. O Alembic roda no start da API, antes de aceitar tráfego.
