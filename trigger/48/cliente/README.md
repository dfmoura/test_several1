# Área do cliente

Aplicativo novo da Trigger. O site estático continua em `trigger/12` e não faz parte deste deploy.

Especificação: `../AREA_DO_CLIENTE_TRIGGER.txt`.

A especificação citava Laravel 11 e PHP 8.3, a linha do FLEXOERP. O Composer bloqueia essa linha do framework por avisos de segurança. Este repositório usa Laravel 12 e PHP 8.4-FPM, com a mesma arquitetura: Caddy, Blade, Alpine, PostgreSQL 16, sessão de servidor, fila no banco e PIX atrás de uma porta só.

## Local

```bash
make up
```

Abre em http://127.0.0.1:8048

A operação entra em http://127.0.0.1:8048/operacao/entrar
O e-mail e a senha locais estão em `apps/api/.env` (`OPERADOR_EMAIL` e `OPERADOR_PASSWORD`). Troque a senha antes de qualquer máquina compartilhada.

O PIX local tem o botão "Simular pagamento". Ele chama a mesma baixa que o webhook do Banco Inter.

```bash
make test
```

Assistência (opcional): sobe o serviço em `../51` (`make up`) e no `.env` da API:

```env
ASSISTENCIA_HABILITADA=true
ASSISTENCIA_URL=http://host.docker.internal:8051
ASSISTENCIA_API_KEY=assistencia-local-dev
```

Reinicie o `app` do Compose. Em Nova demanda aparece «Formular com assistência». Na operação, em demanda em análise, «Desdobrar com assistência» preenche escopo e plano de etapas (sem inventar preço nem prazo). Sem o `51`, os formulários manuais seguem iguais.

Provedor e token da IA: operação em http://127.0.0.1:8048/operacao/assistencia (não ficam no Postgres do cliente).

## Produção

Uma VM Lightsail de 2 GB. `make aws` usa o overlay que publica só 80 e 443, com `PIX_DRIVER=inter` e `APP_DEBUG=false`. Certificado e segredo do Inter ficam na VM, fora do git.


Para a empresa, entre em http://127.0.0.1:8048/entrar com diogo.moura@triggerti.com e senha-local-123.

Para a operação, entre em http://127.0.0.1:8048/operacao/entrar com operacao@triggerti.com e troque-esta-senha-local.