# ADR-003: Integração direta SEFAZ-MG (sem SVRS)

## Status
Aceito

## Contexto
MG é autorizadora própria. Autorização de IE mineira **não** passa por SVRS.

## Decisão
Adapter único `SefazMgAdapter` com endpoints oficiais:

| Ambiente | Prefixo |
|----------|---------|
| Homologação | `https://hnfe.fazenda.mg.gov.br/nfe2/services/` |
| Produção | `https://nfe.fazenda.mg.gov.br/nfe2/services/` |

Serviços: StatusServico4, Autorizacao4, RetAutorizacao4, ConsultaProtocolo4, Inutilizacao4, RecepcaoEvento4, CadConsultaCadastro4.

Emissão de uma nota tenta **indSinc=1** (síncrono). Se a SEFAZ devolver recibo (103/105), o worker faz polling em `NFeRetAutorizacao4` com o **mesmo certificado** da transmissão.

## Consequências
- Sem dependência de contingência SVRS no caminho feliz de MG
- Contingência (FS-DA / EPEC / SVC) fica como evolução (Fase 2 do estudo)
