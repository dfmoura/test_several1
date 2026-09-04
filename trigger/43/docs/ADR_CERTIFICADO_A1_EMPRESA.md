# ADR — Cofre de certificado A1 por EMP (Empresas)

**Status:** Aceito  
**Data:** 2026-08-20  
**Relacionada:** `ADR_EMISSAO_NFE_NFSE.md` (emenda BL-065) · `LIGHTSAIL_E_FUTURO.md`

## Contexto

O emitente precisa cadastrar o **A1 (PKCS#12)** da EMP de forma segura na ficha de Empresas. A emissão oficial de NF-e/NFS-e permanece no **hub Focus** (A1 também pode viver lá). O ERP não inventa numeração SEFAZ.

## Decisão

```
Empresas → guia Certificado A1
  → upload .pfx/.p12 + senha (multipart, HTTPS)
  → valida PKCS#12 (OpenSSL) · rejeita vencido / senha errada
  → cifra PFX + senha (Laravel Crypt / APP_KEY)
  → API devolve só metadados (CN, validade, fingerprint, status)
  → sem download do PFX (anti-exfiltração)
```

| Escolha | Motivo |
|---------|--------|
| Cofre por `empresa_id` (1 linha) | Isolamento multi-EMP; um A1 ativo por EMP |
| Cifrado em DB, não path em disco | Evita o padrão frágil de `cert_path` do banco Inter; alinhado a tokens Focus |
| Sem GET do binário | Quem precisa do arquivo usa a mídia original; o cofre não é baixável |
| Permissão `empresas.gerir` + `hasEmpresaAccess` | Mesmo rigor do restante do cadastro EMP |
| Aviso se CNPJ do cert ≠ CNPJ da EMP | Local/homolog/teste: não bloqueia o **upload** (alerta). Produção (`A1_EXIGE_CNPJ_IDENTICO` / stage production): recusa o arquivo |
| Apto operacional = vigente + CNPJ idêntico | Checado **na hora do envio**, não só no upload. Sem CNPJ extraído = não apto |
| Emissão NF continua Focus | Não altera BL-006/BL-065; cofre ≠ emissor de saída |

## Emenda — identidade da EMP no self-service (BL-072)

No FLEXORC, o A1 da EMP é **prova de identidade** (não autorização SEFAZ de emissão). Enviar proposta na EMP self-service exige:

1. Mensalidade da conta autenticada (já existia).
2. A1 **apto** daquela `empresa_id` (vigente + CNPJ do certificado = CNPJ cadastrado).

Rascunho de ORC, catálogo e cadastros continuam livres. Legado (sem `empresa_ativacoes`) não entra neste portão. Cockpit: passo `certificado_a1` → `/empresas?tab=a1`.

## Emenda — vigência automática e alerta (A_VENCER)

A validade (`valido_de` / `valido_ate`) vem do PKCS#12 no upload. Em toda leitura o status é recalculado:

| Status | Significado |
|--------|-------------|
| `VIGENTE` | Dentro da validade e fora da janela de alerta |
| `A_VENCER` | Ainda válido, ≤ `A1_ALERTA_DIAS` (default 30) até `valido_ate` |
| `VENCIDO` / `AINDA_NAO_VALIDO` | Fora da vigência → não apto |

- Gate duro: `certificado_a1_pendente` (ausente / vencido / CNPJ divergente) — bloqueia envio.
- Soft alert (padrão cortesia): `certificado_a1_alerta` + `dias_para_vencer` no `GET /ativacao`; banner no AppShell; lista `pendencias` na guia A1 (mesmo padrão da IE / bloqueios de emissão).
- Ops: `plataforma:avisar-certificado-a1` diário (08:05) — espelha `avisar-cortesia-billing`.

## Emenda — PKCS#12 ICP-Brasil no OpenSSL 3

A1 reais (3DES/RC2) exigem o **provider legacy** do OpenSSL 3. Sem ele, `openssl_pkcs12_read` falha e a UI parece “senha incorreta”.

- Imagem PHP: `OPENSSL_CONF` → `docker/php/openssl.cnf` (default + legacy; TLS outbound inalterado).
- Superfície: a mesma (`Empresas` → guia Certificado A1). Sem endpoint paralelo, sem PFX em disco, sem CLI de upload.
- CNPJ: extraído de CN, `serialNumber`, OU/O e DN completo (padrão ICP-Brasil).

## Emenda — assinatura DF-e de entrada (caixa destinadas)

Além da identidade, o mesmo cofre autentica o **NFeDistribuicaoDFe** (Ambiente Nacional) na caixa de NF-e destinadas — **sem Focus**, **sem** emissão de saída. Norma: `ADR_CAIXA_DFE_NFE_DESTINADAS.md`. PFX continua só em memória no job; sem GET do binário; só homolog/prod + A1 apto.

## Proibido

1. Devolver PFX, senha ou cipher na API/UI/logs.  
2. Gravar A1 em plaintext ou em volume compartilhado legível.  
3. Confiar só em `X-Empresa-Id` sem vínculo `empresa_user`.  
4. Tratar o cofre como autorização de **emissão** SEFAZ de saída — emissão oficial só com hub Focus apto.  
5. Usar o A1 do cofre para inventar numeração / XML de venda fora do Focus.

## API

- `GET /api/v1/empresas/{id}/certificado-a1`  
- `POST /api/v1/empresas/{id}/certificado-a1` (`arquivo`, `senha`)  
- `DELETE /api/v1/empresas/{id}/certificado-a1`
