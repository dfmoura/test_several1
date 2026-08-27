# ADR-002: Multi-tenant por emitente (CNPJ + IE + A1)

## Status
Aceito

## Contexto
O estudo de viabilidade é explícito: a softhouse **não** emite NF-e de produto em nome próprio. Cada cliente vendedor precisa de IE MG ativa e certificado A1 cujo CNPJ coincida com o `<emit>` do XML. O NFS-e de referência era single-CNPJ; este produto não pode repetir essa restrição.

## Decisão
- Agregado `Emitente` é o tenant
- Certificado A1 por emitente, criptografado em repouso (AES-256-GCM + KEK)
- Numeração (série/número) isolada por emitente + ambiente
- Header `X-Emitente-Id` na API; console seleciona o emitente ativo
- Sem “login SIARE”: credenciamento continua manual no portal; o sistema só consome WS após o A1 estar no vault

## Consequências
- Homologação real exige um cliente piloto com A1
- Operação da softhouse escala para N vendedores sem fork de instância
- Superfície LGPD maior (PFX de terceiros) — mitigada com vault + auditoria + nunca logar senha
