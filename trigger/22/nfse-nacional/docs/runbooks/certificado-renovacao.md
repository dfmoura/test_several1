# Renovação de Certificado A1

## Pré-requisitos
- Novo certificado e-CNPJ ICP-Brasil (EKU Client Auth)
- Janela de manutenção acordada

## Passos

1. Fazer backup do PFX atual no cofre de secrets
2. Copiar novo `.pfx` para `secrets/certificado.pfx` (montado em `/run/secrets/` no Docker)
3. Atualizar senha em `secrets/certificado.senha` ou `NFSE_CERT_PASSWORD`
4. Confirmar `NFSE_CNPJ` igual ao CNPJ do novo certificado (validação automática na subida)
5. Reiniciar serviços: `docker compose restart nfse-api nfse-sync nfse-danfse`
6. Verificar `GET /health/ready` — campos `certificado.cnpj` e `certificado.diasParaExpirar`

## Alertas
- 30 dias: aviso
- 15 dias: alerta
- 7 dias: crítico
