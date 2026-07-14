# ADR-003: DANFSe Local

## Status
Aceito

## Contexto
Conforme **Nota Técnica 008/2026**, a API gov.br de DANFSe será descontinuada em 01/07/2026.

## Decisão
Serviço `nfse-danfse` gera PDF localmente (padrão v2.0), com fallback opcional ao ADN enquanto disponível.

## Consequências
- Controle total do layout e campos RTC (IBS/CBS)
- Responsabilidade de manter conformidade com NT
