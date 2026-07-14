# Exemplos — DANFSe Padrão Nacional

Referência para layout profissional do documento auxiliar (DANFSe v2.0).

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `31702062253369941000163000000000000626050264633732(1).xml` | NFS-e real (produção) — Trigger TI × Neuon |
| `NOTA_NACIONAL_V2.jrxml` | Modelo JasperReports Sankhya — layout oficial de referência |
| `analitico_cob.jrxml` / `sintetico_cob.jrxml` | Sub-relatórios IBS/CBS (cobrança analítica/sintética) |

## Gerar PDF de pré-visualização

A partir da raiz do monorepo:

```bash
pnpm --filter @nfse/danfse preview
```

Ou via Node:

```bash
cd services/nfse-danfse
node --import tsx src/render-preview.ts
```

O PDF é salvo como `danfse-preview.pdf` no diretório atual.

## API de preview (desenvolvimento)

Com o serviço `nfse-danfse` em execução:

```bash
curl -X POST http://localhost:18101/preview \
  -H "Content-Type: application/json" \
  -d "{\"xml\": $(jq -Rs . docs/example/31702062253369941000163000000000000626050264633732\\(1\\).xml)}" \
  -o danfse-preview.pdf
```

## Alinhamento com o modelo Jasper

O renderer `@nfse/danfse` (`danfse-v2-renderer.ts`) segue a estrutura do `NOTA_NACIONAL_V2.jrxml`:

- Cabeçalho com **logo oficial NFS-e** (horizontal) + **DANFSe v{versão}** + QR Code de consulta pública
- Blocos: Identificação, Emitente, Tomador, Serviço, Tributação Municipal/Federal, Valor Total, Informações Complementares
- Fonte monoespaçada (Courier), grade com bordas e rótulos oficiais
- Marca d'água para NFS-e cancelada ou substituída
