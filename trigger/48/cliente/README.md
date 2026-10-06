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

## Produção

Uma VM Lightsail de 2 GB. `make aws` usa o overlay que publica só 80 e 443, com `PIX_DRIVER=inter` e `APP_DEBUG=false`. Certificado e segredo do Inter ficam na VM, fora do git.
