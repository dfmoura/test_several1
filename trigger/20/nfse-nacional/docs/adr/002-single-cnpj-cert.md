# ADR-002: Single CNPJ / Certificado

## Status
Aceito

## Contexto
O escopo do projeto é emissão para **um único CNPJ** com **um certificado A1 e-CNPJ**.

## Decisão
- Configuração fixa via `NFSE_CNPJ` e secret de certificado
- Sem `tenant_id` nas tabelas
- Interface `ICertificadoProvider` preparada para extensão multi-tenant futura

## Consequências
- Simplicidade operacional
- Multi-CNPJ exigirá refatoração de config e schema
