# ADR-004: DANFE gerado localmente

## Status
Aceito

## Contexto
A SEFAZ não fornece DANFE. O documento auxiliar deve ser gerado pelo emissor a partir do XML autorizado (`procNFe`).

## Decisão
Serviço `nfe-danfe` gera PDF internamente (layout simplificado profissional, QR Code da consulta pública). Preview HTML disponível na API para conferência rápida. Cache no MinIO por chave de acesso.

## Consequências
- Independência da SEFAZ para impressão
- Qualquer mudança de layout (NT) é local e versionável
