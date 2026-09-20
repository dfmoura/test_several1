# Piloto — NF-e saída direta (SEFAZ + A1) — pronto para testar

**Norma:** `ADR_EMISSAO_NFE_SEFAZ_DIRETO.md`  
**Alvo:** homologação na nuvem (A1 já no cofre)

## 1. No `.env.aws` da instância (obrigatório)

Confirme (ou copie de `.env.aws.homolog.example`):

```env
ERP_STAGE=homolog
NFE_DRIVER=sefaz
FISCAL_EMISSOR=stub
NFE_HTTP_TIMEOUT_SEC=60
```

`FISCAL_EMISSOR=focus` legado **não** emite NF-e. Stub está morto em homolog — só A1+SEFAZ.

Suba/migre:

```bash
# na pasta da instalação na AWS
docker compose -f docker-compose.yml -f docker-compose.aws.yml --env-file .env.aws up -d --build
docker compose -f docker-compose.yml -f docker-compose.aws.yml --env-file .env.aws exec app php artisan migrate --force
docker compose -f docker-compose.yml -f docker-compose.aws.yml --env-file .env.aws exec app php artisan config:clear
```

## 2. Diagnóstico (passe antes do 1º emit)

```bash
docker compose -f docker-compose.yml -f docker-compose.aws.yml --env-file .env.aws \
  exec app php artisan nfe:serie status EMP-00001
```

Tem que sair **pronto para emitir = SIM**. Se A1 = NÃO → Empresas → guia Certificado A1.

### Seed da numeração (se o CNPJ já emitiu fora do ERP)

Evita rejeição por número duplicado. Informe o **último** nNF já autorizado na série 1:

```bash
docker compose -f docker-compose.yml -f docker-compose.aws.yml --env-file .env.aws \
  exec app php artisan nfe:serie seed EMP-00001 --ultimo=1234 --serie=1
```

Se nunca emitiu neste CNPJ/série: não precisa seed (1º emit = 1).

## 3. Checklist EMP (UI)

| Item | Onde |
|------|------|
| CNPJ = CNPJ do A1 | Empresas |
| IE OK, endereço, IBGE, UF, CRT | Empresas |
| A1 vigente + apto | Empresas → Certificado A1 |
| Destinatário apto NF-e | Parceiro (endereço/IE/indIE) |
| PED `PRODUZIDO` com PA/REV | Pedidos |

UF da EMP deve estar mapeada (MG/SP/PR/RS ou SVRS). RLP/MG → autorizador MG homolog.

## 4. Fluxo de teste na UI

1. Pedido `PRODUZIDO` → **Faturar** (TIT/COB nascem mesmo se SEFAZ falhar)
2. FAT → se A1 apto, emissão dispara após o commit; senão use **Emitir / reenviar NF-e**
3. Confira `AUTORIZADO` · origem `SEFAZ` · chave/protocolo
4. PA/REV com SKU → movimento `SAIDA_VENDA`
5. **Carta de correção** (texto ≥15 caracteres)
6. **Cancelar NF-e** (justificativa ≥15, prazo 24h) → DFS `CANCELADO` · estoque estornado · estorno comercial do FAT liberado

## 5. Falhas comuns

| Sintoma | Ação |
|---------|------|
| “Certificado A1 … não apto” | Reupload A1; CNPJ do cert = CNPJ da EMP |
| “URLs SEFAZ não configuradas” | UF vazia ou fora do mapa — preencha UF |
| Rejeição numeração / duplicidade | `nfe:serie seed --ultimo=…` |
| Continua “Focus” no .env | Troque para `NFE_DRIVER=sefaz` e `config:clear` |
| NFS-e fica planejada | Esperado nesta fatia |

## 6. O que não esperar

- Hub Focus / `/fiscal-hubs` no caminho de saída  
- NFS-e emitida  
- Local falando com SEFAZ (local = stub/prévia)

## Regressão (lab)

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml run --rm --no-deps app \
  php vendor/bin/phpunit --filter 'EmissaoFiscalSaidaTest|SaidaVendaNfAutorizadaTest|NfeNumeracaoServiceTest'
```
