# ADR-001: Arquitetura Hexagonal

## Status
Aceito

## Contexto
O sistema integra com APIs governamentais (SEFIN, ADN) que evoluem frequentemente, além de exigir mTLS e XMLDSig. Precisamos isolar regras fiscais de detalhes de transporte HTTP.

## Decisão
Adotar **Ports & Adapters (Hexagonal)** com pacotes separados:
- `@nfse/domain` — entidades e regras puras
- `@nfse/application` — casos de uso e persistência
- `@nfse/gov-client` — adapters SEFIN/ADN
- `@nfse/xml` — construção, assinatura e compactação XML

## Consequências
- Testes unitários sem dependência de rede
- Troca de endpoints municipais via adapter
- Curva de aprendizado inicial maior
