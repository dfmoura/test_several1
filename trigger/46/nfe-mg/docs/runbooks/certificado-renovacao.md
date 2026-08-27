# Renovação de certificado A1 do emitente

O XML da NF-e é assinado com o A1 **do emitente**. Certificado expirado = emissão parada para aquele tenant (os demais continuam).

## Alertas

O dashboard e `GET /health/ready` listam emitentes com validade:

- 30 dias — aviso
- 15 dias — atenção
- 7 dias — crítico
- expirado — emissão bloqueada

## Procedimento

1. Emitente gera novo A1 (e-CNPJ ICP-Brasil) na AC.
2. No console: **Emitentes → Certificado → Substituir A1**.
3. Wizard valida: senha, CNPJ do cert = CNPJ do emitente, validade, EKU Client Auth.
4. **Testar StatusServico** (mesmo certificado na transmissão e na consulta).
5. Emitir uma nota de homologação (se ambiente = homolog).

## Cuidados

- Nunca envie a senha do PFX por e-mail ou chat.
- O PFX antigo permanece no MinIO criptografado até retenção; não é apagado no ato da troca (auditoria).
- Após expirar, notas em `PROCESSANDO` (recibo pendente) só podem ser consultadas com o **mesmo** certificado da transmissão — trate isso **antes** de expirar.
