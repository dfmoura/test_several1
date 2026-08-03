# Guia rápido — Homologação com o cliente

## Acesso

| Item | Valor |
|---|---|
| URL | http://localhost:3849 |
| Usuário | `admin@reta.local` |
| Senha | `Admin@123` |
| Vendedor | `vendedor@reta.local` / `Vendedor@123` |

## Empresas cadastradas

1. **EMP-00001** — RLP ETIQUETAS AUTO ADESIVOS LTDA · CNPJ **01.423.183/0001-10** · marca **Reta Etiquetas** · operação principal  
2. **EMP-00002** — CNPJ **58.820.046/0001-37** · entra no ERP · **venda desabilitada**

## Roteiro de demonstração (8 passos)

1. **Compras** → necessidades / pedidos / entradas XML  
2. **Estoque** → saldos e movimentos  
3. **Orçamentos** → Novo orçamento (wizard + PDF) → enviar → aprovar  
4. **Pedidos** → confirmar → OS → produção  
5. **Faturar** → NF-e + NFS-e (simulado em HML)  
6. **Boleto** → Bolepix Inter (simulado)  
7. **Entrega** → registrar expedição  
8. **Financeiro** → títulos a receber / baixa  

Ambiente: badge **Homologação · simulado** — sem emissão fiscal real.

## Desenvolvido por

Trigger Data Intelligence — https://www.triggerti.com

## Comandos úteis

```bash
cd /home/dfmoura/Documents/test_several1/trigger/33
docker compose ps
docker compose logs -f web
docker compose restart
docker compose down          # parar
docker compose up -d         # subir de novo
```
