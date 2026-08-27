# ADR-001: Arquitetura Hexagonal

## Status
Aceito

## Contexto
A SEFAZ-MG evolui schemas, notas técnicas e endpoints. Assinatura XML-DSig, SOAP 1.2 e mTLS não podem vazar para regras fiscais.

## Decisão
Ports & Adapters com pacotes separados:

- `@nfe/domain` — entidades e regras puras
- `@nfe/application` — casos de uso e persistência
- `@nfe/sefaz-client` — SOAP SEFAZ-MG (e mock)
- `@nfe/xml` — construção, assinatura e lote XML

## Consequências
- Testes unitários sem rede
- Troca mock ↔ homologação sem reescrever o domínio
- Curva de aprendizado inicial maior (aceitável)
